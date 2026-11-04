import type { Point } from "../fireworks/types";
import { HUD_BOTTOM, HUD_WIDTH } from "./hud";
import {
  COUNTS_LINE_BOTTOM,
  POPUP_DURATION,
  POPUP_GAP,
  POPUP_HALF_WIDTH,
  POPUP_RISE,
  POPUP_TEXT_HEIGHT,
} from "./tuning";

/**
 * "bigMoney" is the money pop-up for a big pop. "banner" is the big combo
 * banner across the middle (see src/polish/juice.ts); it is never a floating
 * pop-up.
 */
export type PopupStyle = "cheer" | "money" | "bigMoney" | "groan" | "gold" | "banner";

/** Floating text over a burst, such as "Aah!" or "+£12". */
export interface Popup {
  text: string;
  style: PopupStyle;
  at: Point;
  age: number;
}

/**
 * Where a pop-up for something at `at` starts. It is moved down if needed so
 * that, after drifting up, it stays below the counts line in the top left and
 * below the HUD in the top right.
 */
export function popupAnchor(at: Point, width: number): Point {
  const underHud = at.x > width - HUD_WIDTH - POPUP_HALF_WIDTH;
  const clearOf = underHud ? HUD_BOTTOM : COUNTS_LINE_BOTTOM;
  const lowest = clearOf + POPUP_GAP + POPUP_TEXT_HEIGHT + POPUP_RISE;
  return { x: at.x, y: Math.max(at.y, lowest) };
}

export function addPopup(
  popups: Popup[],
  text: string,
  style: PopupStyle,
  at: Point,
): void {
  popups.push({ text, style, at: { ...at }, age: 0 });
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

export function drawPopups(ctx: CanvasRenderingContext2D, popups: Popup[]): void {
  ctx.save();
  ctx.textAlign = "center";
  for (const popup of popups) {
    ctx.globalAlpha = Math.max(0, 1 - popup.age / POPUP_DURATION);
    drawPopupText(ctx, popup.text, popup.style, popupPosition(popup));
  }
  ctx.restore();
}
