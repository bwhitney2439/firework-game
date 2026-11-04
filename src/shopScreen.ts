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
  refundableCount,
} from "./game/state";
import { nextVenue } from "./game/venues";
import { formatMoney } from "./money";
import { canvasMeasure, isNarrow, wrapText } from "./polish/wrapText";

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
const BUTTON_HEIGHT = 36;
const FONT = "system-ui, sans-serif";

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Where everything on the shop screen goes. Drawing and clicking both use
 * it, so they always agree. Under `NARROW_WIDTH` the shop stacks for phones.
 */
export interface ShopLayout {
  narrow: boolean;
  left: number;
  right: number;
  /** Baseline and size of the "Firework shop" heading. */
  titleY: number;
  titleSize: number;
  /** Baseline, size and alignment of the wallet. */
  money: { x: number; y: number; size: number; align: CanvasTextAlign };
  /** Space for the venue name and details. The move button stays out of it. */
  venueText: Box;
  venueNameY: number;
  /** Baseline of the first line of venue details. */
  detailsY: number;
  detailsSize: number;
  upgrade: Box;
  /** Baseline of the first "Next show" line. */
  nextShowY: number;
  nextShowSize: number;
  /** Top of the first firework row. */
  listTop: number;
  rowHeight: number;
  /** Height of the booker's request card under the firework list. */
  cardHeight: number;
  start: Box;
  newGame: Box;
}

/** Line spacing for wrapped venue details and "Next show" lines. */
const LINE_HEIGHT = 18;
/** Space between the request card and what is above and below it. */
const CARD_GAP = 14;

export function shopLayout(width: number, height: number): ShopLayout {
  const panelWidth = Math.min(PANEL_WIDTH, width - 32);
  const left = Math.max(16, (width - PANEL_WIDTH) / 2);
  const right = left + panelWidth;
  const start = { x: width / 2 - 110, y: height - 80, width: 220, height: 48 };
  if (!isNarrow(width)) {
    return {
      narrow: false,
      left,
      right,
      titleY: 60,
      titleSize: 32,
      money: { x: right, y: 60, size: 32, align: "right" },
      venueText: { x: left, y: 116, width: panelWidth - 220 - 16, height: 66 },
      venueNameY: 136,
      detailsY: 160,
      detailsSize: 15,
      upgrade: { x: right - 220, y: 120, width: 220, height: BUTTON_HEIGHT },
      nextShowY: 210,
      nextShowSize: 17,
      listTop: 250,
      rowHeight: 48,
      cardHeight: 60,
      start,
      newGame: { x: width - 136, y: height - 52, width: 120, height: 32 },
    };
  }
  // Phones: the move button goes under the venue details, each row takes two
  // lines, and "New game" goes up in the top corner, away from "Start show".
  return {
    narrow: true,
    left,
    right,
    titleY: 42,
    titleSize: 26,
    money: { x: left, y: 80, size: 26, align: "left" },
    venueText: { x: left, y: 100, width: panelWidth, height: 66 },
    venueNameY: 118,
    detailsY: 140,
    detailsSize: 14,
    upgrade: { x: left, y: 172, width: panelWidth, height: BUTTON_HEIGHT },
    nextShowY: 234,
    nextShowSize: 16,
    listTop: 270,
    rowHeight: 64,
    cardHeight: 76,
    start,
    newGame: { x: right - 100, y: 18, width: 100, height: 32 },
  };
}

/** Where the parts of firework row `index` go. */
function rowLayout(layout: ShopLayout, index: number) {
  const { right, rowHeight } = layout;
  const top = layout.listTop + index * rowHeight;
  if (!layout.narrow) {
    const middle = top + rowHeight / 2;
    const y = top + (rowHeight - BUTTON_HEIGHT) / 2;
    return {
      top,
      nameY: middle - 8,
      descY: middle + 11,
      count: { x: right - 156, y: middle },
      refund: { x: right - 140, y, width: 36, height: BUTTON_HEIGHT },
      buy: { x: right - 96, y, width: 96, height: BUTTON_HEIGHT },
    };
  }
  // The name gets the whole first line; the buttons share the second.
  const y = top + 22;
  return {
    top,
    nameY: top + 17,
    descY: top + 43,
    count: { x: right - 138, y: y + BUTTON_HEIGHT / 2 },
    refund: { x: right - 128, y, width: 36, height: BUTTON_HEIGHT },
    buy: { x: right - 84, y, width: 84, height: BUTTON_HEIGHT },
  };
}

/**
 * Where the booker's request card goes: between the firework list and the
 * Start button. Null when the screen is too short for it.
 */
export function requestCardBox(
  types: FireworkType[],
  width: number,
  height: number,
): Box | null {
  const layout = shopLayout(width, height);
  const rows = Math.max(1, shopItems(types).length);
  const y = layout.listTop + rows * layout.rowHeight + CARD_GAP;
  if (y + layout.cardHeight + CARD_GAP > layout.start.y) return null;
  return { x: layout.left, y, width: layout.right - layout.left, height: layout.cardHeight };
}

/** Every button on the shop screen, with where it is drawn. */
export function shopButtons(
  state: GameState,
  types: FireworkType[],
  width: number,
  height: number,
): ShopButton[] {
  const layout = shopLayout(width, height);
  const buttons: ShopButton[] = [];

  const next = nextVenue(currentVenue(state));
  buttons.push({
    ...layout.upgrade,
    label: next ? `Move to ${next.name}: ${formatMoney(next.price)}` : "Top venue",
    enabled: canUpgradeVenue(state) === "ok",
    action: { kind: "upgrade" },
  });

  shopItems(types).forEach((type, index) => {
    const row = rowLayout(layout, index);
    buttons.push({
      ...row.refund,
      label: "−",
      enabled: refundableCount(state, type) > 0,
      action: { kind: "refund", type },
    });
    buttons.push({
      ...row.buy,
      label: `Buy ${formatMoney(type.price)}`,
      enabled: canBuyFirework(state, type) === "ok",
      action: { kind: "buy", type },
    });
  });

  buttons.push({
    ...layout.start,
    label: "Start show",
    enabled: true,
    action: { kind: "start" },
  });
  buttons.push({
    ...layout.newGame,
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
  const layout = shopLayout(width, height);
  const { left, right } = layout;
  const venue = currentVenue(state);
  const measure = canvasMeasure(ctx);

  ctx.fillStyle = "#0b1026";
  ctx.fillRect(0, 0, width, height);
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "#ffd166";
  ctx.textAlign = "left";
  ctx.font = `bold ${layout.titleSize}px ${FONT}`;
  ctx.fillText("Firework shop", left, layout.titleY);
  ctx.textAlign = layout.money.align;
  ctx.font = `bold ${layout.money.size}px ${FONT}`;
  ctx.fillText(formatMoney(state.money), layout.money.x, layout.money.y);

  ctx.fillStyle = "#f5f5f5";
  ctx.textAlign = "left";
  ctx.font = `20px ${FONT}`;
  ctx.fillText(venue.name, left, layout.venueNameY);
  ctx.fillStyle = "#b8bdd6";
  const detailsFont = `${layout.detailsSize}px ${FONT}`;
  const details = `Crowd ${venue.crowd.toLocaleString("en-GB")}  ·  ${venue.moneyMultiplier}× pay per pop  ·  up to ${venue.fireworkCap} fireworks`;
  drawLines(
    ctx,
    wrapText(details, layout.venueText.width, detailsFont, measure, "  ·  "),
    left,
    layout.detailsY,
    detailsFont,
  );

  ctx.fillStyle = "#f5f5f5";
  const nextShowFont = `${layout.nextShowSize}px ${FONT}`;
  const nextShow = `Next show: ${FREE_BATCH} free basic rockets + ${boughtCount(state)} bought  (${FREE_BATCH + boughtCount(state)} / ${venue.fireworkCap})`;
  drawLines(
    ctx,
    wrapText(nextShow, right - left, nextShowFont, measure, "  "),
    left,
    layout.nextShowY,
    nextShowFont,
  );

  const items = shopItems(types);
  if (items.length === 0) {
    ctx.fillStyle = "#8a8fa8";
    ctx.fillText("No fireworks for sale yet.", left, layout.listTop + 30);
  }
  items.forEach((type, index) => {
    const row = rowLayout(layout, index);
    if (index % 2 === 0) {
      ctx.fillStyle = "#151b3a";
      ctx.fillRect(left, row.top, right - left, layout.rowHeight);
    }
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#f5f5f5";
    ctx.font = `17px ${FONT}`;
    ctx.fillText(type.name, left + 12, row.nameY);
    ctx.fillStyle = "#b8bdd6";
    ctx.font = `13px ${FONT}`;
    ctx.fillText(`Pays ${type.baseValue}× a basic rocket`, left + 12, row.descY);
    ctx.textAlign = "right";
    ctx.fillStyle = "#f5f5f5";
    ctx.font = `17px ${FONT}`;
    ctx.fillText(`× ${state.stock[type.id] ?? 0}`, row.count.x, row.count.y);
  });

  const card = requestCardBox(types, width, height);
  if (card) drawRequestCard(ctx, state, card, layout.narrow);

  for (const button of shopButtons(state, types, width, height)) {
    drawButton(ctx, button);
  }
  ctx.textBaseline = "alphabetic";
}

/** Draws `lines` one under another, starting at baseline `y`. */
function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  font: string,
): void {
  ctx.font = font;
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * LINE_HEIGHT));
}

/**
 * The booker's request for the next show, with its reward. On phones the
 * reward goes on its own line under the request.
 */
function drawRequestCard(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  card: Box,
  narrow: boolean,
): void {
  ctx.fillStyle = "#2a2410";
  ctx.strokeStyle = "#ffd166";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(card.x, card.y, card.width, card.height, 8);
  ctx.fill();
  ctx.stroke();

  const middle = card.y + card.height / 2;
  const reward = `Reward ${formatMoney(state.request.reward)}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffd166";
  ctx.font = `bold 13px ${FONT}`;
  ctx.fillText(`The ${currentVenue(state).name} booker asks:`, card.x + 14, middle - (narrow ? 20 : 11));
  ctx.fillStyle = "#f5f5f5";
  ctx.font = `${narrow ? 16 : 17}px ${FONT}`;
  ctx.fillText(state.request.text, card.x + 14, middle + (narrow ? 1 : 10));
  ctx.fillStyle = "#ffd166";
  ctx.font = `bold ${narrow ? 15 : 17}px ${FONT}`;
  if (narrow) {
    ctx.fillText(reward, card.x + 14, middle + 21);
  } else {
    ctx.textAlign = "right";
    ctx.fillText(reward, card.x + card.width - 14, middle);
  }
}
