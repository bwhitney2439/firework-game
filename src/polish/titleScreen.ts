import { basicRocket } from "../fireworks/basicRocket";
import type { Point } from "../fireworks/types";
import { drawBonfire, hash } from "./scenery";
import { type Measure, canvasMeasure, isNarrow, wrapText } from "./wrapText";

/** Seconds each decorative burst on the title screen takes. */
const BURST_CYCLE = 2.4;
/** Decorative bursts on screen at once, each on its own offset cycle. */
const BURST_SLOTS = 3;

/**
 * Where decorative burst `slot` is at `time`, and how far through it is.
 * Each cycle picks a new position in the upper part of the sky.
 */
export function titleBurst(
  slot: number,
  time: number,
  width: number,
  height: number,
): { at: Point; progress: number } {
  const shifted = time / BURST_CYCLE + slot / BURST_SLOTS;
  const cycle = Math.floor(shifted);
  const seed = cycle * BURST_SLOTS + slot;
  return {
    at: {
      x: width * (0.12 + hash(seed) * 0.76),
      y: height * (0.1 + hash(seed + 0.5) * 0.35),
    },
    progress: shifted - cycle,
  };
}

const FONT = "system-ui, sans-serif";
const LINE_COLOURS: Record<TitleLine["kind"], string> = {
  title: "#ffd166",
  subtitle: "#f5f5f5",
  lantern: "#ffb347",
  start: "#f5f5f5",
  sound: "#9aa3c7",
};

/** One line of text on the title screen. */
export interface TitleLine {
  text: string;
  /** CSS font the line is drawn and measured in. */
  font: string;
  y: number;
  kind: "title" | "subtitle" | "lantern" | "start" | "sound";
}

/**
 * The title screen's text, wrapped to fit `width` and laid out from
 * 42% of the way down. Phones get a smaller subtitle.
 */
export function titleLayout(
  width: number,
  height: number,
  muted: boolean,
  measure: Measure,
): TitleLine[] {
  const maxWidth = width - 32;
  const size = Math.max(28, Math.min(64, width / 12));
  const subtitleSize = isNarrow(width) ? 17 : 20;
  const lines: TitleLine[] = [];
  const add = (text: string, font: string, y: number, kind: TitleLine["kind"]) => {
    const wrapped = wrapText(text, maxWidth, font, measure);
    const spacing = kind === "title" ? size * 1.1 : subtitleSize * 1.3;
    wrapped.forEach((line, i) => lines.push({ text: line, font, y: y + i * spacing, kind }));
    return y + (wrapped.length - 1) * spacing;
  };

  let y = add("Bonfire Night Popper", `bold ${size}px ${FONT}`, height * 0.42, "title");
  y = add(
    "Click the fireworks to pop them before they fizzle out",
    `${subtitleSize}px ${FONT}`,
    y + size * 0.9,
    "subtitle",
  );
  y = add("Don't pop the sky lanterns!", `bold ${subtitleSize}px ${FONT}`, y + subtitleSize * 1.6, "lantern");
  y = add("Click to start", `bold 24px ${FONT}`, y + 56, "start");
  add(`Press M to turn sound ${muted ? "on" : "off"}`, `15px ${FONT}`, y + 34, "sound");
  return lines;
}

/** Draws the title screen. `time` is in seconds and drives the animation. */
export function drawTitleScreen(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  muted: boolean,
): void {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#050816");
  sky.addColorStop(1, "#1d1840");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  for (let slot = 0; slot < BURST_SLOTS; slot++) {
    const { at, progress } = titleBurst(slot, time, width, height);
    basicRocket.drawBurst(ctx, at, progress);
  }

  const ground = height - 40;
  ctx.fillStyle = "#0a0a12";
  ctx.fillRect(0, ground, width, height - ground);
  drawBonfire(ctx, width / 2, ground, time);

  ctx.textAlign = "center";
  for (const line of titleLayout(width, height, muted, canvasMeasure(ctx))) {
    ctx.globalAlpha = line.kind === "start" ? 0.6 + Math.sin(time * 4) * 0.4 : 1;
    ctx.fillStyle = LINE_COLOURS[line.kind];
    ctx.font = line.font;
    ctx.fillText(line.text, width / 2, line.y);
  }
  ctx.globalAlpha = 1;
}
