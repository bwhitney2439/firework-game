import { formatMoney } from "../money";
import type { Summary } from "./stats";
import { canvasMeasure, isNarrow, wrapText } from "./wrapText";

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

/** Where the summary panel and its text go. */
export interface SummaryLayout {
  left: number;
  top: number;
  width: number;
  height: number;
  /** Space between the panel's sides and the label and value columns. */
  pad: number;
  titleSize: number;
  lineSize: number;
  rowSize: number;
  rowHeight: number;
  /** Baseline of the first count row. */
  rowsTop: number;
  /**
   * Shrinks the panel about the middle of the screen when the screen is too
   * short for it. 1 means drawn as laid out.
   */
  scale: number;
}

/** Line spacing when the rating line wraps. */
const LINE_HEIGHT = 22;

/**
 * Lays out the summary for `rows` count rows and a rating line that takes
 * `lines` lines. Phones get smaller text; short screens shrink the panel.
 */
export function summaryLayout(
  width: number,
  height: number,
  rows: number,
  lines = 1,
): SummaryLayout {
  const narrow = isNarrow(width);
  const rowHeight = 30;
  const extra = (lines - 1) * LINE_HEIGHT;
  const panelWidth = Math.min(420, width - 32);
  const panelHeight = 170 + extra + rows * rowHeight + 60;
  const scale = Math.min(1, (height - 32) / panelHeight);
  const top = scale < 1 ? (height - panelHeight) / 2 : Math.max(16, (height - panelHeight) / 2);
  return {
    left: (width - panelWidth) / 2,
    top,
    width: panelWidth,
    height: panelHeight,
    pad: narrow ? 24 : 40,
    titleSize: narrow ? 30 : 34,
    lineSize: narrow ? 15 : 17,
    rowSize: narrow ? 17 : 19,
    rowHeight,
    rowsTop: top + 166 + extra,
    scale,
  };
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
  const lineFont = (size: number) => `italic ${size}px system-ui, sans-serif`;
  const firstTry = summaryLayout(width, height, rows.length);
  const lines = wrapText(
    summary.rating.line,
    firstTry.width - firstTry.pad,
    lineFont(firstTry.lineSize),
    canvasMeasure(ctx),
  );
  const layout = summaryLayout(width, height, rows.length, lines.length);
  const { left, top, pad } = layout;
  const panelWidth = layout.width;
  const panelHeight = layout.height;

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(layout.scale, layout.scale);
  ctx.translate(-width / 2, -height / 2);

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
  ctx.font = `bold ${layout.titleSize}px system-ui, sans-serif`;
  ctx.fillText(summary.rating.title, centre, top + 86);

  ctx.fillStyle = "#f5f5f5";
  ctx.font = lineFont(layout.lineSize);
  lines.forEach((line, i) => ctx.fillText(line, centre, top + 116 + i * LINE_HEIGHT));

  ctx.font = `${layout.rowSize}px system-ui, sans-serif`;
  rows.forEach(([label, value], i) => {
    const y = layout.rowsTop + i * layout.rowHeight;
    ctx.textAlign = "left";
    ctx.fillStyle = "#c9cde6";
    ctx.fillText(label, left + pad, y);
    ctx.textAlign = "right";
    ctx.fillStyle = "#f5f5f5";
    ctx.fillText(value, left + panelWidth - pad, y);
  });

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd166";
  ctx.font = "bold 20px system-ui, sans-serif";
  ctx.fillText("Click to continue", centre, top + panelHeight - 28);
  ctx.restore();
  ctx.globalAlpha = 1;
}
