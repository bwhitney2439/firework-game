import { basicRocket } from "../fireworks/basicRocket";
import type { Point } from "../fireworks/types";

/** Seconds each decorative burst on the title screen takes. */
const BURST_CYCLE = 2.4;
/** Decorative bursts on screen at once, each on its own offset cycle. */
const BURST_SLOTS = 3;

/** A repeatable pseudo-random number from 0 to 1 for a seed. */
function hash(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

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

function drawBonfire(
  ctx: CanvasRenderingContext2D,
  x: number,
  ground: number,
  time: number,
): void {
  // Logs.
  ctx.strokeStyle = "#5a3a22";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 50, ground);
  ctx.lineTo(x + 30, ground - 30);
  ctx.moveTo(x + 50, ground);
  ctx.lineTo(x - 30, ground - 30);
  ctx.stroke();

  // Flames: three layers that flicker at different speeds.
  const layers = [
    { colour: "#e2572b", size: 46, speed: 7 },
    { colour: "#ff9f1c", size: 32, speed: 11 },
    { colour: "#ffe066", size: 18, speed: 17 },
  ];
  for (const { colour, size, speed } of layers) {
    const flicker = 1 + Math.sin(time * speed) * 0.12;
    const tall = size * 2.1 * flicker;
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(x - size, ground - 12);
    const shoulder = ground - tall * 0.6;
    ctx.quadraticCurveTo(x - size * 0.6, shoulder, x, ground - tall);
    ctx.quadraticCurveTo(x + size * 0.6, shoulder, x + size, ground - 12);
    ctx.closePath();
    ctx.fill();
  }
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

  const size = Math.max(28, Math.min(64, width / 12));
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd166";
  ctx.font = `bold ${size}px system-ui, sans-serif`;
  ctx.fillText("Bonfire Night Popper", width / 2, height * 0.42);

  ctx.fillStyle = "#f5f5f5";
  ctx.font = "20px system-ui, sans-serif";
  ctx.fillText(
    "Click the fireworks to pop them before they fizzle out",
    width / 2,
    height * 0.42 + size * 0.9,
  );

  ctx.globalAlpha = 0.6 + Math.sin(time * 4) * 0.4;
  ctx.font = "bold 24px system-ui, sans-serif";
  ctx.fillText("Click to start", width / 2, height * 0.42 + size * 0.9 + 56);
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#9aa3c7";
  ctx.font = "15px system-ui, sans-serif";
  ctx.fillText(
    `Press M to turn sound ${muted ? "on" : "off"}`,
    width / 2,
    height * 0.42 + size * 0.9 + 90,
  );
}
