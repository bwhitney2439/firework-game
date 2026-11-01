import type { FireworkType } from "./types";

/** Colours the candle's stars cycle through. */
const STAR_COLOURS = ["#ff4d6d", "#4dd2ff", "#7dff6a", "#ffe14d", "#c77dff"];
/** Seconds each colour shows before the star changes to the next one. */
const COLOUR_TIME = 0.15;
/** Largest sideways drift in pixels. */
const WOBBLE = 10;
/** How fast the star drifts from side to side, in radians per second. */
const WOBBLE_SPEED = 5;
const TRAIL_DOTS = 6;
const SPARKS = 10;
const BURST_RADIUS = 45;

/** The star's colour at a given age. */
export function starColour(age: number): string {
  const index = Math.floor(Math.max(age, 0) / COLOUR_TIME) % STAR_COLOURS.length;
  return STAR_COLOURS[index];
}

/**
 * A Roman candle: a quick, small, colour-changing star. It flies faster than
 * the basic rocket and is worth more.
 */
export const romanCandle: FireworkType = {
  id: "roman-candle",
  name: "Roman candle",
  price: 40,
  baseValue: 3,
  riseSpeed: 0.45,
  hitRadius: 24,

  pathOffset: (age) => Math.sin(age * WOBBLE_SPEED) * WOBBLE,

  drawRising(ctx, at, age) {
    const colour = starColour(age);

    ctx.fillStyle = colour;
    for (let i = 1; i <= TRAIL_DOTS; i++) {
      ctx.globalAlpha = 0.6 * (1 - i / (TRAIL_DOTS + 1));
      ctx.beginPath();
      ctx.arc(at.x, at.y + i * 7, 4 - i * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.beginPath();
    ctx.arc(at.x, at.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(at.x, at.y, 3, 0, Math.PI * 2);
    ctx.fill();
  },

  drawBurst(ctx, at, progress) {
    const radius = BURST_RADIUS * Math.sqrt(progress);
    ctx.globalAlpha = 1 - progress;
    for (let i = 0; i < SPARKS; i++) {
      const angle = (i / SPARKS) * Math.PI * 2 + progress;
      ctx.fillStyle = STAR_COLOURS[i % STAR_COLOURS.length];
      ctx.beginPath();
      ctx.arc(
        at.x + Math.cos(angle) * radius,
        at.y + Math.sin(angle) * radius + progress * progress * 15,
        2.5,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
};
