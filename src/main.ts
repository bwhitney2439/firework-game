import { basicRocket } from "./fireworks/basicRocket";
import type { FireworkType } from "./fireworks/types";
import { type ShowEvent, clickAt, createShow, isShowOver } from "./game/show";
import { createSound } from "./polish/sound";
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

const STARTING_STOCK = 10;
/** Longest step per frame, so a hidden tab does not skip the whole show. */
const MAX_STEP = 0.1;

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const ctx = canvas.getContext("2d")!;
const sound = createSound();

function newStock(): FireworkType[] {
  return Array.from({ length: STARTING_STOCK }, () => basicRocket);
}

type Phase = "title" | "show" | "summary";

const game = {
  phase: "title" as Phase,
  show: createShow(newStock()),
  stats: createStats(),
  /** Seconds since the current phase started. */
  phaseTime: 0,
};

function setPhase(phase: Phase): void {
  game.phase = phase;
  game.phaseTime = 0;
}

function startShow(): void {
  game.show = createShow(newStock());
  game.stats = createStats();
  setPhase("show");
}

/** Where a click on the summary goes next. */
function afterSummary(): void {
  startShow();
}

function playEvent(event: ShowEvent): void {
  if (event.kind === "popped") {
    sound.burst();
    sound.cheer(Math.min(game.stats.streak / 8, 0.6));
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
  if (game.phase === "title") {
    startShow();
    return;
  }
  if (game.phase === "summary") {
    if (canContinue(game.phaseTime)) afterSummary();
    return;
  }
  if (isShowOver(game.show)) return;
  const popped = clickAt(
    game.show,
    { x: event.offsetX, y: event.offsetY },
    canvas.clientWidth,
    canvas.clientHeight,
  );
  if (!popped) {
    recordMiss(game.stats);
    return;
  }
  recordEvent(game.stats, popped);
  playEvent(popped);
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
  } else {
    if (game.phase === "show") {
      const step = stepShow(game.show, game.stats, dt);
      for (let i = 0; i < step.launched; i++) sound.launch();
      for (const event of step.events) playEvent(event);
      if (isSummaryDue(game.stats)) {
        setPhase("summary");
        sound.cheer(summarize(game.stats).hitRate);
      }
    }
    render(ctx, game.show, width, height);
    if (game.phase === "summary") {
      const summary = summarize(game.stats);
      drawSummaryScreen(ctx, summary, width, height, game.phaseTime);
    }
  }
  requestAnimationFrame(frame);
}

window.addEventListener("resize", fitCanvas);
fitCanvas();
requestAnimationFrame(frame);
