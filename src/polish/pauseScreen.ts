import type { Point } from "../fireworks/types";
import { COUNTS_LINE_BOTTOM } from "../scoring/tuning";
import { VOLUME_NAMES, type VolumeLevel } from "./sound";

export type PauseAction = "resume" | "sound" | "quit";

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PauseButton extends Box {
  action: PauseAction;
}

const FONT = "system-ui, sans-serif";
const MENU_BUTTON_WIDTH = 240;
/** Tall enough to hit with a thumb. */
const MENU_BUTTON_HEIGHT = 52;
const MENU_BUTTON_GAP = 14;
/** Size of the corner pause button and the title screen's speaker button. */
const CORNER_BUTTON_SIZE = 44;
const CORNER_MARGIN = 12;
/** Space between the counts line and the pause button under it. */
const PAUSE_BUTTON_GAP = 6;

export function isInside(box: Box, point: Point): boolean {
  return (
    point.x >= box.x &&
    point.x <= box.x + box.width &&
    point.y >= box.y &&
    point.y <= box.y + box.height
  );
}

/** Resume, Sound and Quit to shop, stacked in the middle of the screen. */
export function pauseButtons(width: number, height: number): PauseButton[] {
  const actions: PauseAction[] = ["resume", "sound", "quit"];
  const total =
    actions.length * MENU_BUTTON_HEIGHT + (actions.length - 1) * MENU_BUTTON_GAP;
  const top = height / 2 - total / 2 + 30;
  const buttonWidth = Math.min(MENU_BUTTON_WIDTH, width - 32);
  return actions.map((action, i) => ({
    action,
    x: width / 2 - buttonWidth / 2,
    y: top + i * (MENU_BUTTON_HEIGHT + MENU_BUTTON_GAP),
    width: buttonWidth,
    height: MENU_BUTTON_HEIGHT,
  }));
}

/** Which menu button is at `point`, or null for none. */
export function pauseClick(
  point: Point,
  width: number,
  height: number,
): PauseAction | null {
  return pauseButtons(width, height).find((b) => isInside(b, point))?.action ?? null;
}

function buttonLabel(action: PauseAction, volume: VolumeLevel): string {
  if (action === "resume") return "Resume";
  if (action === "sound") return `Sound: ${VOLUME_NAMES[volume]}`;
  return "Quit to shop";
}

/** Dims the frame under it and draws the menu. */
export function drawPause(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  volume: VolumeLevel,
): void {
  const buttons = pauseButtons(width, height);
  ctx.save();
  ctx.fillStyle = "rgba(5, 8, 22, 0.65)";
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffd166";
  ctx.font = `bold 40px ${FONT}`;
  ctx.fillText("Paused", width / 2, buttons[0].y - 34);

  ctx.textBaseline = "middle";
  for (const button of buttons) {
    ctx.fillStyle =
      button.action === "resume" ? "#2e9e5b" : button.action === "sound" ? "#3a3f5c" : "#e23d3d";
    ctx.beginPath();
    ctx.roundRect(button.x, button.y, button.width, button.height, 8);
    ctx.fill();
    ctx.fillStyle = "#f5f5f5";
    ctx.font = `20px ${FONT}`;
    ctx.fillText(
      buttonLabel(button.action, volume),
      button.x + button.width / 2,
      button.y + button.height / 2,
    );
  }

  ctx.fillStyle = "#9aa3c7";
  ctx.font = `15px ${FONT}`;
  const last = buttons[buttons.length - 1];
  ctx.fillText(
    "Quitting keeps your money and gives back unused fireworks",
    width / 2,
    last.y + last.height + 28,
  );
  ctx.restore();
}

/** The pause button in the top left corner, under the counts line. */
export function pauseButtonBox(): Box {
  return {
    x: CORNER_MARGIN,
    y: COUNTS_LINE_BOTTOM + PAUSE_BUTTON_GAP,
    width: CORNER_BUTTON_SIZE,
    height: CORNER_BUTTON_SIZE,
  };
}

/** Draws the corner pause button: two bars on a round-cornered square. */
export function drawPauseButton(ctx: CanvasRenderingContext2D): void {
  const box = pauseButtonBox();
  ctx.save();
  ctx.fillStyle = "rgba(35, 40, 70, 0.7)";
  ctx.beginPath();
  ctx.roundRect(box.x, box.y, box.width, box.height, 8);
  ctx.fill();
  ctx.fillStyle = "#f5f5f5";
  const barWidth = box.width * 0.14;
  const barHeight = box.height * 0.45;
  const top = box.y + (box.height - barHeight) / 2;
  const middle = box.x + box.width / 2;
  ctx.fillRect(middle - barWidth * 1.5, top, barWidth, barHeight);
  ctx.fillRect(middle + barWidth * 0.5, top, barWidth, barHeight);
  ctx.restore();
}

/** The title screen's speaker button, in the top right corner. */
export function speakerButtonBox(width: number): Box {
  return {
    x: width - CORNER_MARGIN - CORNER_BUTTON_SIZE,
    y: CORNER_MARGIN,
    width: CORNER_BUTTON_SIZE,
    height: CORNER_BUTTON_SIZE,
  };
}

/** Draws a speaker, with sound waves when on or a cross when muted. */
export function drawSpeakerButton(
  ctx: CanvasRenderingContext2D,
  width: number,
  muted: boolean,
): void {
  const box = speakerButtonBox(width);
  const unit = box.width / 10;
  const x = box.x + unit * 2;
  const middle = box.y + box.height / 2;
  ctx.save();
  ctx.fillStyle = "rgba(35, 40, 70, 0.7)";
  ctx.beginPath();
  ctx.roundRect(box.x, box.y, box.width, box.height, 8);
  ctx.fill();

  ctx.fillStyle = "#f5f5f5";
  ctx.beginPath();
  ctx.moveTo(x, middle - unit);
  ctx.lineTo(x + unit * 1.5, middle - unit);
  ctx.lineTo(x + unit * 3.5, middle - unit * 3);
  ctx.lineTo(x + unit * 3.5, middle + unit * 3);
  ctx.lineTo(x + unit * 1.5, middle + unit);
  ctx.lineTo(x, middle + unit);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = muted ? "#ff8c42" : "#f5f5f5";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  const right = x + unit * 4.8;
  if (muted) {
    ctx.moveTo(right, middle - unit * 1.4);
    ctx.lineTo(right + unit * 2.6, middle + unit * 1.4);
    ctx.moveTo(right + unit * 2.6, middle - unit * 1.4);
    ctx.lineTo(right, middle + unit * 1.4);
  } else {
    ctx.arc(x + unit * 3.5, middle, unit * 2, -Math.PI / 4, Math.PI / 4);
    ctx.moveTo(
      x + unit * 3.5 + Math.cos(-Math.PI / 4) * unit * 3.6,
      middle + Math.sin(-Math.PI / 4) * unit * 3.6,
    );
    ctx.arc(x + unit * 3.5, middle, unit * 3.6, -Math.PI / 4, Math.PI / 4);
  }
  ctx.stroke();
  ctx.restore();
}
