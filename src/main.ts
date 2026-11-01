import { basicRocket } from "./fireworks/basicRocket";
import type { FireworkType } from "./fireworks/types";
import { clickAt, createShow, isShowOver, updateShow } from "./game/show";
import { render } from "./render";
import {
  createScoring,
  drawScoring,
  handleShowEvents,
  startScoringShow,
  updateScoring,
} from "./scoring/scoring";

const STARTING_STOCK = 10;
/** Longest step per frame, so a hidden tab does not skip the whole show. */
const MAX_STEP = 0.1;

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const ctx = canvas.getContext("2d")!;

function newStock(): FireworkType[] {
  return Array.from({ length: STARTING_STOCK }, () => basicRocket);
}

const game = { show: createShow(newStock()), scoring: createScoring() };

function fitCanvas(): void {
  const scale = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * scale;
  canvas.height = canvas.clientHeight * scale;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

canvas.addEventListener("pointerdown", (event) => {
  if (isShowOver(game.show)) {
    game.show = createShow(newStock());
    startScoringShow(game.scoring);
    return;
  }
  const popped = clickAt(
    game.show,
    { x: event.offsetX, y: event.offsetY },
    canvas.clientWidth,
    canvas.clientHeight,
  );
  handleShowEvents(game.scoring, [popped], canvas.clientWidth, canvas.clientHeight);
});

let lastTime = performance.now();

function frame(time: number): void {
  const dt = Math.min((time - lastTime) / 1000, MAX_STEP);
  lastTime = time;
  const events = updateShow(game.show, dt);
  handleShowEvents(game.scoring, events, canvas.clientWidth, canvas.clientHeight);
  updateScoring(game.scoring, dt);
  render(ctx, game.show, canvas.clientWidth, canvas.clientHeight);
  drawScoring(ctx, game.scoring, canvas.clientWidth);
  requestAnimationFrame(frame);
}

window.addEventListener("resize", fitCanvas);
fitCanvas();
requestAnimationFrame(frame);
