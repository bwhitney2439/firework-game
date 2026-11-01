import { fireworkTypes } from "./fireworks/registry";
import { loadGame, saveGame } from "./game/save";
import { clickAt, createShow, isShowOver, updateShow } from "./game/show";
import { startShow } from "./game/state";
import { payPopsIntoWallet, startShowScoring } from "./game/wallet";
import { render } from "./render";
import {
  createScoring,
  drawScoring,
  handleShowEvents,
  updateScoring,
} from "./scoring/scoring";
import { drawShop, shopClick } from "./shopScreen";

/** Longest step per frame, so a hidden tab does not skip the whole show. */
const MAX_STEP = 0.1;

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const ctx = canvas.getContext("2d")!;

const game = {
  state: loadGame(),
  phase: "shop" as "shop" | "show",
  show: createShow([]),
  scoring: createScoring(),
};
payPopsIntoWallet(game.scoring, game.state, saveGame);

function goToShop(): void {
  game.phase = "shop";
  saveGame(game.state);
}

function startNextShow(): void {
  game.show = createShow(startShow(game.state, fireworkTypes));
  startShowScoring(game.scoring, game.state);
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
  handleShowEvents(game.scoring, [popped], canvas.clientWidth, canvas.clientHeight);
});

let lastTime = performance.now();

function frame(time: number): void {
  const dt = Math.min((time - lastTime) / 1000, MAX_STEP);
  lastTime = time;
  if (game.phase === "shop") {
    drawShop(ctx, game.state, fireworkTypes, canvas.clientWidth, canvas.clientHeight);
  } else {
    const events = updateShow(game.show, dt);
    handleShowEvents(game.scoring, events, canvas.clientWidth, canvas.clientHeight);
    updateScoring(game.scoring, dt);
    render(ctx, game.show, canvas.clientWidth, canvas.clientHeight);
    drawScoring(ctx, game.scoring, canvas.clientWidth, game.state.money);
  }
  requestAnimationFrame(frame);
}

window.addEventListener("resize", fitCanvas);
fitCanvas();
requestAnimationFrame(frame);
