import { fireworkTypes } from "./fireworks/registry";
import { type NewBests, bestShow, recordShow } from "./game/records";
import { loadGame, saveGame } from "./game/save";
import { createShow } from "./game/show";
import { currentVenue, fireworksForShow } from "./game/state";
import { venues } from "./game/venues";
import { settleScoredEvents, startScoringAtVenue } from "./game/wallet";
import {
  drawPause,
  drawPauseButton,
  drawSpeakerButton,
  isInside,
  pauseButtonBox,
  pauseClick,
  speakerButtonBox,
} from "./polish/pauseScreen";
import {
  createSound,
  loadVolume,
  nextVolume,
  popCheer,
  saveVolume,
  type VolumeLevel,
} from "./polish/sound";
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
const sound = createSound(undefined, undefined, loadVolume());
/** Matches when the main pointer is a finger, so the title screen says "Tap". */
const touchScreen = window.matchMedia("(pointer: coarse)");

type Phase = "title" | "shop" | "show" | "paused" | "summary";

const game = {
  state: loadGame(),
  phase: "title" as Phase,
  show: createShow([]),
  scoring: createScoring(),
  stats: createStats(),
  /** Which of the venue's records the last show beat, for its summary. */
  bests: { stars: false, money: false, combo: false } as NewBests,
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
  game.show = createShow(fireworksForShow(game.state, fireworkTypes), Math.random);
  game.stats = createStats();
  startScoringAtVenue(game.scoring, game.state);
  setPhase("show");
  saveGame(game.state);
}

/**
 * Pauses a show or resumes a paused one. phaseTime is left alone, and the
 * frame loop takes no step while paused, so resuming carries on with no jump.
 */
function togglePause(): void {
  if (game.phase === "show") game.phase = "paused";
  else if (game.phase === "paused") game.phase = "show";
}

function setVolume(level: VolumeLevel): void {
  sound.setVolume(level);
  saveVolume(level);
}

/** Mutes, or goes back to the volume heard before muting. */
function toggleMute(): void {
  sound.setMuted(!sound.isMuted());
  saveVolume(sound.volume());
}

/**
 * Leaves a paused show for the shop. Fireworks still in the air or waiting
 * are not settled: they were never taken out of the stock, so, as with a
 * reload, they come back for the next show and the money already made stays.
 */
function quitShow(): void {
  goToShop();
}

/**
 * Ends the show: keeps its stars and bests in the venue's records, once,
 * saves, and opens the summary.
 */
function openSummary(): void {
  const summary = summarize(game.stats, game.scoring.score);
  game.bests = recordShow(game.state.records, game.state.venueId, summary);
  saveGame(game.state);
  setPhase("summary");
  sound.cheer(summary.hitRate);
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
    if (isInside(speakerButtonBox(canvas.clientWidth), click)) {
      toggleMute();
    } else {
      goToShop();
    }
    return;
  }
  if (game.phase === "shop") {
    const result = shopClick(
      game.state,
      fireworkTypes,
      click,
      canvas.clientWidth,
      canvas.clientHeight,
      () => window.confirm("Start a new game? Your money, venue and stars will be lost."),
    );
    if (result === "start") startNextShow();
    else if (result === "changed") saveGame(game.state);
    return;
  }
  if (game.phase === "summary") {
    if (canContinue(game.phaseTime)) afterSummary();
    return;
  }
  if (game.phase === "paused") {
    const action = pauseClick(click, canvas.clientWidth, canvas.clientHeight);
    if (action === "resume") togglePause();
    else if (action === "sound") setVolume(nextVolume(sound.volume()));
    else if (action === "quit") quitShow();
    return;
  }
  if (isInside(pauseButtonBox(), click)) {
    togglePause();
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
  if (event.key === "m" || event.key === "M") toggleMute();
  else if (
    !event.repeat &&
    (event.key === "Escape" || event.key === "p" || event.key === "P")
  ) {
    togglePause();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && game.phase === "show") togglePause();
});

let lastTime = performance.now();

function frame(time: number): void {
  const dt = Math.min((time - lastTime) / 1000, MAX_STEP);
  lastTime = time;
  if (game.phase !== "paused") game.phaseTime += dt;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  if (game.phase === "title") {
    drawTitleScreen(ctx, width, height, time / 1000, sound.isMuted(), {
      touch: touchScreen.matches,
      best: bestShow(game.state.records, venues),
    });
    drawSpeakerButton(ctx, width, sound.isMuted());
  } else if (game.phase === "shop") {
    drawShop(ctx, game.state, fireworkTypes, width, height);
  } else {
    if (game.phase === "show") {
      const step = stepShow(game.show, game.stats, dt);
      const scored = handleShowEvents(game.scoring, step.events, width, height);
      for (let i = 0; i < step.launched; i++) sound.launch();
      for (const event of scored) playEvent(event);
      if (isSummaryDue(game.stats)) openSummary();
    }
    if (game.phase !== "paused") updateScoring(game.scoring, dt);
    render(ctx, game.show, width, height);
    drawScoring(ctx, game.scoring, width, game.state.money, currentVenue(game.state).name);
    if (game.phase === "show") drawPauseButton(ctx);
    if (game.phase === "paused") drawPause(ctx, width, height, sound.volume());
    if (game.phase === "summary") {
      drawSummaryScreen(
        ctx,
        summarize(game.stats, game.scoring.score),
        width,
        height,
        game.phaseTime,
        game.bests,
        touchScreen.matches,
      );
    }
  }
  requestAnimationFrame(frame);
}

window.addEventListener("resize", fitCanvas);
fitCanvas();
requestAnimationFrame(frame);
