import { formatMoney } from "../money";
import type { Summary } from "./stats";

/** Seconds the summary takes to fade in. */
const FADE_IN = 0.4;
/** Seconds before a click can close the summary, so a late click does not skip it. */
const CLICK_LOCK = 0.6;

export function canContinue(time: number): boolean {
  return time >= CLICK_LOCK;
}

/** The label and value rows shown on the summary, in order. */
export function summaryRows(summary: Summary): [string, string][] {
  return [
    ["Launched", `${summary.launched}`],
    ["Popped", `${summary.popped}`],
    ["Fizzled", `${summary.fizzled}`],
    ["Hit rate", `${Math.round(summary.hitRate * 100)}%`],
    ["Best combo", `${summary.bestCombo}`],
    ["Missed clicks", `${summary.missedClicks}`],
    ["Money earned", formatMoney(summary.money)],
  ];
}

/**
 * Draws the end-of-show summary over the last frame of the show.
 * `time` is seconds since the summary opened and drives the fade-in.
 */
export function drawSummaryScreen(
  ctx: CanvasRenderingContext2D,
  summary: Summary,
  width: number,
  height: number,
  time: number,
): void {
  const fade = Math.min(time / FADE_IN, 1);

  ctx.globalAlpha = fade * 0.7;
  ctx.fillStyle = "#050816";
  ctx.fillRect(0, 0, width, height);

  const rows = summaryRows(summary);
  const rowHeight = 30;
  const panelWidth = Math.min(420, width - 32);
  const panelHeight = 170 + rows.length * rowHeight + 60;
  const left = (width - panelWidth) / 2;
  const top = Math.max(16, (height - panelHeight) / 2);

  ctx.globalAlpha = fade;
  ctx.fillStyle = "#151a3a";
  ctx.strokeStyle = "#ffd166";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(left, top, panelWidth, panelHeight, 16);
  ctx.fill();
  ctx.stroke();

  const centre = width / 2;
  ctx.textAlign = "center";
  ctx.fillStyle = "#9aa3c7";
  ctx.font = "18px system-ui, sans-serif";
  ctx.fillText("Show over", centre, top + 40);

  ctx.fillStyle = "#ffd166";
  ctx.font = "bold 34px system-ui, sans-serif";
  ctx.fillText(summary.rating.title, centre, top + 86);

  ctx.fillStyle = "#f5f5f5";
  ctx.font = "italic 17px system-ui, sans-serif";
  ctx.fillText(summary.rating.line, centre, top + 116);

  ctx.font = "19px system-ui, sans-serif";
  rows.forEach(([label, value], i) => {
    const y = top + 166 + i * rowHeight;
    ctx.textAlign = "left";
    ctx.fillStyle = "#c9cde6";
    ctx.fillText(label, left + 40, y);
    ctx.textAlign = "right";
    ctx.fillStyle = "#f5f5f5";
    ctx.fillText(value, left + panelWidth - 40, y);
  });

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd166";
  ctx.font = "bold 20px system-ui, sans-serif";
  ctx.fillText("Click to continue", centre, top + panelHeight - 28);
  ctx.globalAlpha = 1;
}
