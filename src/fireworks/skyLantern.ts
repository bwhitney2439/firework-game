import type { FireworkType } from "./types";

/** Share of the climb a lantern makes per second. 0.08 is about 12 seconds to the top. */
export const LANTERN_RISE_SPEED = 0.08;
/** Slowest sideways drift, as a share of the screen width per second. */
export const LANTERN_MIN_DRIFT = 0.02;
/** Fastest sideways drift, as a share of the screen width per second. */
export const LANTERN_MAX_DRIFT = 0.04;
/** Widest sideways bob in pixels, on top of the drift. */
const BOB = 10;
/** Half the width of the paper at the top, in pixels. */
const TOP_HALF = 14;
/** Half the width of the paper at the bottom, in pixels. */
const BOTTOM_HALF = 10;
/** Height of the paper, in pixels. */
const PAPER_HEIGHT = 32;
/** Embers that fall from a popped lantern. */
const EMBERS = 10;

/**
 * A paper sky lantern: slow, glowing and not to be popped. It is not in the
 * registry, so it is never sold or put in the stock; the show lets one go
 * now and then (see src/game/show.ts). Popping it pays nothing, costs
 * crowd and ends the combo (see src/scoring/score.ts).
 */
export const skyLantern: FireworkType = {
  id: "sky-lantern",
  name: "Sky lantern",
  price: 0,
  baseValue: 0,
  riseSpeed: LANTERN_RISE_SPEED,
  hitRadius: 24,
  avoid: true,

  // A lazy bob from side to side as it floats.
  pathOffset: (age) => Math.sin(age * 0.9) * BOB,

  drawRising(ctx, at, age) {
    const flicker = 1 + Math.sin(age * 9) * 0.06 + Math.sin(age * 23) * 0.04;
    const top = at.y - PAPER_HEIGHT / 2;
    const bottom = at.y + PAPER_HEIGHT / 2;
    ctx.save();

    // Soft orange glow around the lantern.
    const glow = ctx.createRadialGradient(at.x, at.y, 2, at.x, at.y, 40 * flicker);
    glow.addColorStop(0, "rgba(255, 170, 70, 0.45)");
    glow.addColorStop(1, "rgba(255, 140, 40, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(at.x, at.y, 40 * flicker, 0, Math.PI * 2);
    ctx.fill();

    // The paper, lit from inside: brightest near the flame at the bottom.
    const paper = ctx.createLinearGradient(0, top, 0, bottom);
    paper.addColorStop(0, "#c9562a");
    paper.addColorStop(1, "#ffcf7a");
    ctx.fillStyle = paper;
    ctx.beginPath();
    ctx.moveTo(at.x - TOP_HALF, top + 3);
    ctx.quadraticCurveTo(at.x, top - 4, at.x + TOP_HALF, top + 3);
    ctx.lineTo(at.x + BOTTOM_HALF, bottom);
    ctx.lineTo(at.x - BOTTOM_HALF, bottom);
    ctx.closePath();
    ctx.fill();

    // Thin ribs down the paper.
    ctx.strokeStyle = "rgba(120, 40, 15, 0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(at.x, top);
    ctx.lineTo(at.x, bottom);
    ctx.moveTo(at.x - TOP_HALF * 0.5, top + 1);
    ctx.lineTo(at.x - BOTTOM_HALF * 0.5, bottom);
    ctx.moveTo(at.x + TOP_HALF * 0.5, top + 1);
    ctx.lineTo(at.x + BOTTOM_HALF * 0.5, bottom);
    ctx.stroke();

    // The little flame under the open bottom.
    ctx.fillStyle = "#fff2b0";
    ctx.beginPath();
    ctx.ellipse(at.x, bottom + 2, 2.5 * flicker, 4 * flicker, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  },

  // The paper catches fire: a quick orange flare, then embers drifting down.
  drawBurst(ctx, at, progress) {
    ctx.save();
    ctx.globalAlpha = 1 - progress;
    ctx.fillStyle = "#ff8a3d";
    ctx.beginPath();
    ctx.arc(at.x, at.y, 22 * (1 - progress) + 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffb347";
    for (let i = 0; i < EMBERS; i++) {
      const spread = (i / (EMBERS - 1) - 0.5) * 50;
      ctx.beginPath();
      ctx.arc(
        at.x + spread * progress,
        at.y + 60 * progress * progress + Math.sin(i * 7.1) * 6,
        2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.restore();
  },
};
