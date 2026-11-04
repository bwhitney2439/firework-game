import type { Point } from "../fireworks/types";
import { HUD_BOTTOM, HUD_WIDTH } from "./hud";
import {
  COUNTS_LINE_BOTTOM,
  POPUP_DURATION,
  POPUP_GAP,
  POPUP_HALF_WIDTH,
  POPUP_RISE,
  POPUP_TEXT_HEIGHT,
  WEATHER_LINE_BOTTOM,
  WEATHER_LINE_RIGHT,
  WHIFF_HALF_WIDTH,
  WHIFF_TEXT_HEIGHT,
} from "./tuning";

/**
 * "bigMoney" is the money pop-up for a big pop. "whiff" is the small
 * "Whiff" for a missed click, which keeps out of the way of the others (see
 * addWhiff). "banner" is the big combo banner across the middle (see
 * src/polish/juice.ts); it is never a floating pop-up.
 */
export type PopupStyle =
  | "cheer"
  | "money"
  | "bigMoney"
  | "groan"
  | "gold"
  | "whiff"
  | "banner";

/** Floating text over a burst, such as "Aah!" or "+£12". */
export interface Popup {
  text: string;
  style: PopupStyle;
  at: Point;
  age: number;
}

/**
 * Where a pop-up for something at `at` starts. It is moved down if needed so
 * that, after drifting up, it stays below the counts line, below the weather
 * word in the top left corner and below the HUD in the top right.
 */
export function popupAnchor(at: Point, width: number): Point {
  const underHud = at.x > width - HUD_WIDTH - POPUP_HALF_WIDTH;
  const underWeather = at.x < WEATHER_LINE_RIGHT + POPUP_HALF_WIDTH;
  const clearOf = Math.max(
    COUNTS_LINE_BOTTOM,
    underHud ? HUD_BOTTOM : 0,
    underWeather ? WEATHER_LINE_BOTTOM : 0,
  );
  const lowest = clearOf + POPUP_GAP + POPUP_TEXT_HEIGHT + POPUP_RISE;
  return { x: at.x, y: Math.max(at.y, lowest) };
}

/**
 * Adds a pop-up. Any "Whiff" it would cover is dropped, so a missed click
 * never hides the cheer or money for a pop.
 */
export function addPopup(
  popups: Popup[],
  text: string,
  style: PopupStyle,
  at: Point,
): void {
  const popup = { text, style, at: { ...at }, age: 0 };
  if (style !== "whiff") removeWhere(popups, (other) => other.style === "whiff" && overlaps(other, popup));
  popups.push(popup);
}

/**
 * Adds the "Whiff" for a missed click at `at`. Only one shows at a time, so
 * mashing can't stack them up: a new one takes the old one's place. It is
 * moved down below any other pop-up it would cover. Pop-ups all drift up at
 * the same speed, so it stays clear of them as they rise.
 */
export function addWhiff(popups: Popup[], at: Point): void {
  removeWhere(popups, (popup) => popup.style === "whiff");
  const whiff: Popup = { text: "Whiff", style: "whiff", at: { ...at }, age: 0 };
  for (;;) {
    const covered = popups.find((popup) => overlaps(popup, whiff));
    if (!covered) break;
    whiff.at.y = popupPosition(covered).y + POPUP_GAP + WHIFF_TEXT_HEIGHT;
  }
  popups.push(whiff);
}

/** Where a pop-up's text is now, give or take, with its baseline at `bottom`. */
function popupBox(popup: Popup): { left: number; right: number; top: number; bottom: number } {
  const at = popupPosition(popup);
  const halfWidth = popup.style === "whiff" ? WHIFF_HALF_WIDTH : POPUP_HALF_WIDTH;
  const height = popup.style === "whiff" ? WHIFF_TEXT_HEIGHT : POPUP_TEXT_HEIGHT;
  return { left: at.x - halfWidth, right: at.x + halfWidth, top: at.y - height, bottom: at.y };
}

/** Whether two pop-ups' text would touch, or come within POPUP_GAP above or below. */
export function overlaps(a: Popup, b: Popup): boolean {
  const boxA = popupBox(a);
  const boxB = popupBox(b);
  return (
    boxA.left < boxB.right &&
    boxB.left < boxA.right &&
    boxA.top < boxB.bottom + POPUP_GAP &&
    boxB.top < boxA.bottom + POPUP_GAP
  );
}

function removeWhere<T>(items: T[], drop: (item: T) => boolean): void {
  for (let i = items.length - 1; i >= 0; i--) if (drop(items[i])) items.splice(i, 1);
}

/** Ages the pop-ups and drops the ones that have faded. */
export function updatePopups(popups: Popup[], dt: number): Popup[] {
  for (const popup of popups) popup.age += dt;
  return popups.filter((popup) => popup.age < POPUP_DURATION);
}

/** Where a pop-up is drawn: it drifts upwards as it ages. */
export function popupPosition(popup: Popup): Point {
  const progress = Math.min(popup.age / POPUP_DURATION, 1);
  return { x: popup.at.x, y: popup.at.y - POPUP_RISE * progress };
}

const STYLES: Record<PopupStyle, { font: string; color: string }> = {
  cheer: { font: "bold 26px system-ui, sans-serif", color: "#fff3b0" },
  money: { font: "bold 20px system-ui, sans-serif", color: "#7ee081" },
  bigMoney: { font: "bold 26px system-ui, sans-serif", color: "#9bf59e" },
  groan: { font: "italic 20px system-ui, sans-serif", color: "#9aa3c7" },
  whiff: { font: "italic 16px system-ui, sans-serif", color: "#9aa3c7" },
  gold: { font: "bold 24px system-ui, sans-serif", color: "#ffd166" },
  banner: { font: "bold 64px system-ui, sans-serif", color: "#ffc94d" },
};

/** The CSS font for a pop-up style. */
export function popupFont(style: PopupStyle): string {
  return STYLES[style].font;
}

/**
 * Draws text in a pop-up style, outlined so it reads over a bright burst.
 * The caller sets the alignment and opacity.
 */
export function drawPopupText(
  ctx: CanvasRenderingContext2D,
  text: string,
  style: PopupStyle,
  at: Point,
): void {
  const look = STYLES[style];
  ctx.font = look.font;
  ctx.lineWidth = style === "banner" ? 8 : 4;
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#0b1026";
  ctx.strokeText(text, at.x, at.y);
  ctx.fillStyle = look.color;
  ctx.fillText(text, at.x, at.y);
}

/** Draws the pop-ups, with any "Whiff" underneath the rest. */
export function drawPopups(ctx: CanvasRenderingContext2D, popups: Popup[]): void {
  ctx.save();
  ctx.textAlign = "center";
  const whiffsFirst = [
    ...popups.filter((popup) => popup.style === "whiff"),
    ...popups.filter((popup) => popup.style !== "whiff"),
  ];
  for (const popup of whiffsFirst) {
    ctx.globalAlpha = Math.max(0, 1 - popup.age / POPUP_DURATION);
    drawPopupText(ctx, popup.text, popup.style, popupPosition(popup));
  }
  ctx.restore();
}
