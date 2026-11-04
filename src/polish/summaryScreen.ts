import { MAX_STARS, type NewBests, starsFor } from "../game/records";
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

/** No records beaten, for a summary drawn without them. */
const NO_BESTS: NewBests = { stars: false, money: false, combo: false };

/** The labels of the rows that beat a record, to mark "New best!". */
export function newBestLabels(bests: NewBests): string[] {
  const labels: string[] = [];
  if (bests.combo) labels.push("Best combo");
  if (bests.money) labels.push("Money earned");
  return labels;
}

/** Seconds between one star popping in and the next. */
const STAR_STAGGER = 0.18;
/** Seconds each star takes to pop in. */
const STAR_POP = 0.25;

/**
 * How big star `index` is drawn `time` seconds after the summary opened:
 * 0 before it pops in, overshooting a little, then 1. The stars pop in one
 * after another once the panel has faded in.
 */
export function starScale(index: number, time: number): number {
  const t = (time - FADE_IN - index * STAR_STAGGER) / STAR_POP;
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t < 0.6 ? (t / 0.6) * 1.25 : 1.25 - ((t - 0.6) / 0.4) * 0.25;
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
  /** Middle of the row of stars. */
  starsY: number;
  /** Outer radius of each star. */
  starRadius: number;
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
/** Height the row of stars adds to the panel. */
const STARS_HEIGHT = 44;

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
  const panelHeight = 170 + extra + STARS_HEIGHT + rows * rowHeight + 60;
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
    starsY: top + 154 + extra,
    starRadius: narrow ? 16 : 18,
    rowsTop: top + 166 + extra + STARS_HEIGHT,
    scale,
  };
}

/** Draws a five-pointed star with its middle at (x, y). */
function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  filled: boolean,
): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? radius : radius * 0.45;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
  }
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = "#ffd166";
    ctx.fill();
  } else {
    ctx.strokeStyle = "#5a6088";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

/**
 * The show's stars, popping in one by one, with "New best!" beside them
 * when they beat the venue's record.
 */
function drawStars(
  ctx: CanvasRenderingContext2D,
  stars: number,
  newBest: boolean,
  layout: SummaryLayout,
  centre: number,
  time: number,
): void {
  const spacing = layout.starRadius * 2.5;
  for (let i = 0; i < MAX_STARS; i++) {
    const scale = starScale(i, time);
    if (scale <= 0) continue;
    const x = centre + (i - (MAX_STARS - 1) / 2) * spacing;
    drawStar(ctx, x, layout.starsY, layout.starRadius * scale, i < stars);
  }
  if (newBest && starScale(MAX_STARS - 1, time) >= 1) {
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText("New best!", centre + spacing * 1.5 + 6, layout.starsY);
    ctx.textBaseline = "alphabetic";
  }
}

/** The summary screen's last line: touch screens say "Tap" instead of "Click". */
export function continueText(touch: boolean): string {
  return `${touch ? "Tap" : "Click"} to continue`;
}

/**
 * Draws the end-of-show summary over the last frame of the show.
 * `time` is seconds since the summary opened and drives the fade-in.
 * `bests` says which of the venue's records the show beat. `touch` is for
 * touch screen wording (see continueText).
 */
export function drawSummaryScreen(
  ctx: CanvasRenderingContext2D,
  summary: Summary,
  width: number,
  height: number,
  time: number,
  bests: NewBests = NO_BESTS,
  touch = false,
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

  drawStars(ctx, starsFor(summary), bests.stars, layout, centre, time);

  const rowFont = `${layout.rowSize}px system-ui, sans-serif`;
  const bestLabels = newBestLabels(bests);
  rows.forEach(([label, value], i) => {
    const y = layout.rowsTop + i * layout.rowHeight;
    ctx.font = rowFont;
    ctx.textAlign = "left";
    ctx.fillStyle = "#c9cde6";
    ctx.fillText(label, left + pad, y);
    ctx.textAlign = "right";
    const best = bestLabels.includes(label);
    ctx.fillStyle = best ? "#ffd166" : "#f5f5f5";
    const valueX = left + panelWidth - pad;
    ctx.fillText(value, valueX, y);
    if (best) {
      const valueWidth = ctx.measureText(value).width;
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.fillText("New best!", valueX - valueWidth - 10, y - 1);
    }
  });

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd166";
  ctx.font = "bold 20px system-ui, sans-serif";
  ctx.fillText(continueText(touch), centre, top + panelHeight - 28);
  ctx.restore();
  ctx.globalAlpha = 1;
}
