import { fireworkTypes } from "./fireworks/registry";
import { loadGame, saveGame } from "./game/save";
import { createShow } from "./game/show";
import { currentVenue, fireworksForShow } from "./game/state";
import { settleScoredEvents, startScoringAtVenue } from "./game/wallet";
import { createSound, popCheer } from "./polish/sound";
import {
  createStats,
  isSummaryDue,
  recordEvent,
  recordMiss,
  stepShow,
  summarize,
} from "./polish/stats";
import { canContinue, drawSummaryScreen } from "./polish/summaryScreen";
import { drawTitleScreen } from "./polish/titleScreen";
import { render } from "./render";
import {
  createScoring,
  drawScoring,
  handleShowClick,
  handleShowEvents,
  updateScoring,
} from "./scoring/scoring";
import type { ScoredEvent } from "./scoring/score";
import { drawShop, shopClick } from "./shopScreen";

/** Longest step per frame, so a hidden tab does not skip the whole show. */
const MAX_STEP = 0.1;

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const ctx = canvas.getContext("2d")!;
const sound = createSound();

type Phase = "title" | "shop" | "show" | "summary";

const game = {
  state: loadGame(),
  phase: "title" as Phase,
  show: createShow([]),
  scoring: createScoring(),
  stats: createStats(),
  /** Seconds since the current phase started. */
  phaseTime: 0,
};
settleScoredEvents(game.scoring, game.state, saveGame);

function setPhase(phase: Phase): void {
  game.phase = phase;
  game.phaseTime = 0;
}

function goToShop(): void {
  setPhase("shop");
  saveGame(game.state);
}

function startNextShow(): void {
  game.show = createShow(fireworksForShow(game.state, fireworkTypes));
  game.stats = createStats();
  startScoringAtVenue(game.scoring, game.state);
  setPhase("show");
  saveGame(game.state);
}

/** Where a click on the summary goes next. */
function afterSummary(): void {
  goToShop();
}

function playEvent(scored: ScoredEvent): void {
  if (scored.kind === "popped") {
    sound.burst();
    sound.cheer(popCheer(scored.score.combo));
  } else {
    sound.fizzle();
  }
}

function fitCanvas(): void {
  const scale = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * scale;
  canvas.height = canvas.clientHeight * scale;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

canvas.addEventListener("pointerdown", (event) => {
  sound.unlock();
  const click = { x: event.offsetX, y: event.offsetY };
  if (game.phase === "title") {
    goToShop();
    return;
  }
  if (game.phase === "shop") {
    const result = shopClick(
      game.state,
      fireworkTypes,
      click,
      canvas.clientWidth,
      canvas.clientHeight,
      () => window.confirm("Start a new game? Your money and venue will be lost."),
    );
    if (result === "start") startNextShow();
    else if (result === "changed") saveGame(game.state);
    return;
  }
  if (game.phase === "summary") {
    if (canContinue(game.phaseTime)) afterSummary();
    return;
  }
  const result = handleShowClick(
    game.scoring,
    game.show,
    click,
    canvas.clientWidth,
    canvas.clientHeight,
  );
  if (result.kind === "missed") {
    recordMiss(game.stats);
  } else if (result.kind === "popped") {
    recordEvent(game.stats, result.event);
    for (const event of result.scored) playEvent(event);
  }
});

window.addEventListener("keydown", (event) => {
  sound.unlock();
  if (event.key === "m" || event.key === "M") sound.setMuted(!sound.isMuted());
});

let lastTime = performance.now();

function frame(time: number): void {
  const dt = Math.min((time - lastTime) / 1000, MAX_STEP);
  lastTime = time;
  game.phaseTime += dt;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  if (game.phase === "title") {
    drawTitleScreen(ctx, width, height, time / 1000, sound.isMuted());
  } else if (game.phase === "shop") {
    drawShop(ctx, game.state, fireworkTypes, width, height);
  } else {
    if (game.phase === "show") {
      const step = stepShow(game.show, game.stats, dt);
      const scored = handleShowEvents(game.scoring, step.events, width, height);
      for (let i = 0; i < step.launched; i++) sound.launch();
      for (const event of scored) playEvent(event);
      if (isSummaryDue(game.stats)) {
        setPhase("summary");
        sound.cheer(summarize(game.stats, game.scoring.score).hitRate);
      }
    }
    updateScoring(game.scoring, dt);
    render(ctx, game.show, width, height);
    drawScoring(ctx, game.scoring, width, game.state.money, currentVenue(game.state).name);
    if (game.phase === "summary") {
      drawSummaryScreen(
        ctx,
        summarize(game.stats, game.scoring.score),
        width,
        height,
        game.phaseTime,
      );
    }
  }
  requestAnimationFrame(frame);
}

window.addEventListener("resize", fitCanvas);
fitCanvas();
requestAnimationFrame(frame);
