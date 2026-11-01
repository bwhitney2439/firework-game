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

export type PopupStyle = "cheer" | "money" | "groan";

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
  groan: { font: "italic 20px system-ui, sans-serif", color: "#9aa3c7" },
};

export function drawPopups(ctx: CanvasRenderingContext2D, popups: Popup[]): void {
  ctx.save();
  ctx.textAlign = "center";
  for (const popup of popups) {
    const style = STYLES[popup.style];
    const at = popupPosition(popup);
    ctx.globalAlpha = Math.max(0, 1 - popup.age / POPUP_DURATION);
    ctx.font = style.font;
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#0b1026";
    ctx.strokeText(popup.text, at.x, at.y);
    ctx.fillStyle = style.color;
    ctx.fillText(popup.text, at.x, at.y);
  }
  ctx.restore();
}
