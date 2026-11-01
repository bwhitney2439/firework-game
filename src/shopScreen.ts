import type { FireworkType, Point } from "./fireworks/types";
import {
  buyFirework,
  canBuyFirework,
  canUpgradeVenue,
  refundFirework,
  shopItems,
  upgradeVenue,
} from "./game/shop";
import {
  FREE_BATCH,
  type GameState,
  boughtCount,
  createGameState,
  currentVenue,
} from "./game/state";
import { nextVenue } from "./game/venues";
import { formatMoney } from "./money";

export type ShopAction =
  | { kind: "buy"; type: FireworkType }
  | { kind: "refund"; type: FireworkType }
  | { kind: "upgrade" }
  | { kind: "start" }
  | { kind: "new-game" };

export interface ShopButton {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  enabled: boolean;
  action: ShopAction;
}

const PANEL_WIDTH = 640;
const ROW_HEIGHT = 48;
const BUTTON_HEIGHT = 36;
const FONT = "system-ui, sans-serif";

function panelLeft(width: number): number {
  return Math.max(16, (width - PANEL_WIDTH) / 2);
}

function panelWidth(width: number): number {
  return Math.min(PANEL_WIDTH, width - 32);
}

/** Top of the first firework row. */
const LIST_TOP = 250;

/** Every button on the shop screen, with where it is drawn. */
export function shopButtons(
  state: GameState,
  types: FireworkType[],
  width: number,
  height: number,
): ShopButton[] {
  const left = panelLeft(width);
  const right = left + panelWidth(width);
  const buttons: ShopButton[] = [];

  const next = nextVenue(currentVenue(state));
  buttons.push({
    x: right - 220,
    y: 120,
    width: 220,
    height: BUTTON_HEIGHT,
    label: next ? `Move to ${next.name}: ${formatMoney(next.price)}` : "Top venue",
    enabled: canUpgradeVenue(state) === "ok",
    action: { kind: "upgrade" },
  });

  shopItems(types).forEach((type, index) => {
    const y = LIST_TOP + index * ROW_HEIGHT + (ROW_HEIGHT - BUTTON_HEIGHT) / 2;
    buttons.push({
      x: right - 140,
      y,
      width: 36,
      height: BUTTON_HEIGHT,
      label: "−",
      enabled: (state.stock[type.id] ?? 0) > 0,
      action: { kind: "refund", type },
    });
    buttons.push({
      x: right - 96,
      y,
      width: 96,
      height: BUTTON_HEIGHT,
      label: `Buy ${formatMoney(type.price)}`,
      enabled: canBuyFirework(state, type) === "ok",
      action: { kind: "buy", type },
    });
  });

  buttons.push({
    x: width / 2 - 110,
    y: height - 80,
    width: 220,
    height: 48,
    label: "Start show",
    enabled: true,
    action: { kind: "start" },
  });
  buttons.push({
    x: width - 136,
    y: height - 52,
    width: 120,
    height: 32,
    label: "New game",
    enabled: true,
    action: { kind: "new-game" },
  });
  return buttons;
}

export function buttonAt(buttons: ShopButton[], point: Point): ShopButton | null {
  return (
    buttons.find(
      (button) =>
        point.x >= button.x &&
        point.x <= button.x + button.width &&
        point.y >= button.y &&
        point.y <= button.y + button.height,
    ) ?? null
  );
}

/**
 * Handles a click on the shop screen. Changes the state in place and returns
 * what happened, so the caller can save or start the show.
 */
export function shopClick(
  state: GameState,
  types: FireworkType[],
  point: Point,
  width: number,
  height: number,
  confirmReset: () => boolean = () => true,
): "start" | "changed" | null {
  const button = buttonAt(shopButtons(state, types, width, height), point);
  if (!button || !button.enabled) return null;
  const { action } = button;
  switch (action.kind) {
    case "start":
      return "start";
    case "buy":
      return buyFirework(state, action.type) === "ok" ? "changed" : null;
    case "refund":
      return refundFirework(state, action.type) ? "changed" : null;
    case "upgrade":
      return upgradeVenue(state) === "ok" ? "changed" : null;
    case "new-game":
      if (!confirmReset()) return null;
      Object.assign(state, createGameState());
      return "changed";
  }
}

function drawButton(ctx: CanvasRenderingContext2D, button: ShopButton): void {
  ctx.fillStyle = button.enabled ? "#e23d3d" : "#3a3f5c";
  if (button.action.kind === "start") ctx.fillStyle = "#2e9e5b";
  if (button.action.kind === "new-game") ctx.fillStyle = "#232846";
  ctx.beginPath();
  ctx.roundRect(button.x, button.y, button.width, button.height, 6);
  ctx.fill();
  ctx.fillStyle = button.enabled ? "#f5f5f5" : "#8a8fa8";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${button.action.kind === "start" ? 22 : 15}px ${FONT}`;
  ctx.fillText(button.label, button.x + button.width / 2, button.y + button.height / 2);
}

export function drawShop(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  types: FireworkType[],
  width: number,
  height: number,
): void {
  const left = panelLeft(width);
  const right = left + panelWidth(width);
  const venue = currentVenue(state);

  ctx.fillStyle = "#0b1026";
  ctx.fillRect(0, 0, width, height);
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "#ffd166";
  ctx.textAlign = "left";
  ctx.font = `bold 32px ${FONT}`;
  ctx.fillText("Firework shop", left, 60);
  ctx.textAlign = "right";
  ctx.fillText(formatMoney(state.money), right, 60);

  ctx.fillStyle = "#f5f5f5";
  ctx.textAlign = "left";
  ctx.font = `20px ${FONT}`;
  ctx.fillText(venue.name, left, 136);
  ctx.font = `15px ${FONT}`;
  ctx.fillStyle = "#b8bdd6";
  ctx.fillText(
    `Crowd ${venue.crowd.toLocaleString("en-GB")}  ·  ${venue.moneyMultiplier}× pay per pop  ·  up to ${venue.fireworkCap} fireworks`,
    left,
    160,
  );

  ctx.fillStyle = "#f5f5f5";
  ctx.font = `17px ${FONT}`;
  ctx.fillText(
    `Next show: ${FREE_BATCH} free basic rockets + ${boughtCount(state)} bought  (${FREE_BATCH + boughtCount(state)} / ${venue.fireworkCap})`,
    left,
    210,
  );

  const items = shopItems(types);
  if (items.length === 0) {
    ctx.fillStyle = "#8a8fa8";
    ctx.fillText("No fireworks for sale yet.", left, LIST_TOP + 30);
  }
  items.forEach((type, index) => {
    const top = LIST_TOP + index * ROW_HEIGHT;
    if (index % 2 === 0) {
      ctx.fillStyle = "#151b3a";
      ctx.fillRect(left, top, right - left, ROW_HEIGHT);
    }
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#f5f5f5";
    ctx.font = `17px ${FONT}`;
    ctx.fillText(type.name, left + 12, top + ROW_HEIGHT / 2 - 8);
    ctx.fillStyle = "#b8bdd6";
    ctx.font = `13px ${FONT}`;
    ctx.fillText(
      `Pays ${type.baseValue}× a basic rocket`,
      left + 12,
      top + ROW_HEIGHT / 2 + 11,
    );
    ctx.textAlign = "right";
    ctx.fillStyle = "#f5f5f5";
    ctx.font = `17px ${FONT}`;
    ctx.fillText(`× ${state.stock[type.id] ?? 0}`, right - 156, top + ROW_HEIGHT / 2);
  });

  for (const button of shopButtons(state, types, width, height)) {
    drawButton(ctx, button);
  }
  ctx.textBaseline = "alphabetic";
}
