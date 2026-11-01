import { fireworkTypes } from "./fireworks/registry";
import { loadGame, saveGame } from "./game/save";
import { clickAt, createShow, isShowOver, updateShow } from "./game/show";
import { earnPop, startShow } from "./game/state";
import { render } from "./render";
import { drawMoneyHud, drawShop, shopClick } from "./shopScreen";

/** Longest step per frame, so a hidden tab does not skip the whole show. */
const MAX_STEP = 0.1;

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const ctx = canvas.getContext("2d")!;

const game = {
  state: loadGame(),
  phase: "shop" as "shop" | "show",
  show: createShow([]),
};

function goToShop(): void {
  game.phase = "shop";
  saveGame(game.state);
}

function startNextShow(): void {
  game.show = createShow(startShow(game.state, fireworkTypes));
  game.phase = "show";
  saveGame(game.state);
}

function fitCanvas(): void {
  const scale = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * scale;
  canvas.height = canvas.clientHeight * scale;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

canvas.addEventListener("pointerdown", (event) => {
  const click = { x: event.offsetX, y: event.offsetY };
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
  if (isShowOver(game.show)) {
    goToShop();
    return;
  }
  const popped = clickAt(
    game.show,
    click,
    canvas.clientWidth,
    canvas.clientHeight,
  );
  if (popped?.kind === "popped") {
    earnPop(game.state, popped.firework.type);
    saveGame(game.state);
  }
});

let lastTime = performance.now();

function frame(time: number): void {
  const dt = Math.min((time - lastTime) / 1000, MAX_STEP);
  lastTime = time;
  if (game.phase === "shop") {
    drawShop(ctx, game.state, fireworkTypes, canvas.clientWidth, canvas.clientHeight);
  } else {
    updateShow(game.show, dt);
    render(ctx, game.show, canvas.clientWidth, canvas.clientHeight);
    drawMoneyHud(ctx, game.state, canvas.clientWidth);
  }
  requestAnimationFrame(frame);
}

window.addEventListener("resize", fitCanvas);
fitCanvas();
requestAnimationFrame(frame);
