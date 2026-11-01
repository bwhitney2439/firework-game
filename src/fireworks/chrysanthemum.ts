import type { FireworkType, Point } from "./types";

/** Stars in the outer ring of the burst. */
export const OUTER_STARS = 48;
/** Stars in the inner ring, which opens a little smaller. */
export const INNER_STARS = 24;
/** Radius of the outer ring at the end of the burst, in pixels. */
export const BURST_RADIUS = 160;
const INNER_SCALE = 0.6;
/** How far the stars droop by the end of the burst, in pixels. */
const DROOP = 45;
/** How far back along its path each star's trail reaches, as burst progress. */
const TRAIL = 0.15;

/** One star of the burst: where it is now and where its trail starts. */
export interface Star {
  head: Point;
  tail: Point;
  /** True for stars in the outer ring. */
  outer: boolean;
}

function starAt(
  at: Point,
  angle: number,
  reach: number,
  progress: number,
): Point {
  // Stars fly out fast, slow down, then droop under gravity.
  const radius = reach * (1 - (1 - progress) ** 3);
  return {
    x: at.x + Math.cos(angle) * radius,
    y: at.y + Math.sin(angle) * radius + progress * progress * DROOP,
  };
}

/** Where every star of the burst is. Progress runs from 0 to 1. */
export function chrysanthemumStars(at: Point, progress: number): Star[] {
  const stars: Star[] = [];
  const tailProgress = Math.max(0, progress - TRAIL);
  const rings = [
    { count: OUTER_STARS, reach: BURST_RADIUS, offset: 0, outer: true },
    {
      count: INNER_STARS,
      reach: BURST_RADIUS * INNER_SCALE,
      offset: Math.PI / INNER_STARS,
      outer: false,
    },
  ];
  for (const ring of rings) {
    for (let i = 0; i < ring.count; i++) {
      const angle = ring.offset + (i / ring.count) * Math.PI * 2;
      stars.push({
        head: starAt(at, angle, ring.reach, progress),
        tail: starAt(at, angle, ring.reach, tailProgress),
        outer: ring.outer,
      });
    }
  }
  return stars;
}

export const chrysanthemum: FireworkType = {
  id: "chrysanthemum",
  name: "Chrysanthemum shell",
  price: 60,
  baseValue: 5,
  // A heavy shell climbs slowly: a 5 second flight.
  riseSpeed: 0.2,
  hitRadius: 32,

  // A gentle sway, so the shell is not a straight shot.
  pathOffset: (age) => Math.sin(age * 1.5) * 12,

  drawRising(ctx, at, age) {
    const flicker = 5 + Math.sin(age * 35) * 2;
    ctx.fillStyle = "#ffcf70";
    ctx.beginPath();
    ctx.arc(at.x, at.y + 12 + flicker, 2, 0, Math.PI * 2);
    ctx.arc(at.x, at.y + 20 + flicker * 1.5, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#7a4bc2";
    ctx.beginPath();
    ctx.arc(at.x, at.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f2d16b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(at.x, at.y, 9, 0, Math.PI * 2);
    ctx.stroke();
  },

  drawBurst(ctx, at, progress) {
    const fade = 1 - progress;
    ctx.save();
    ctx.lineCap = "round";
    for (const star of chrysanthemumStars(at, progress)) {
      ctx.globalAlpha = 0.6 * fade;
      ctx.strokeStyle = star.outer ? "#ffb347" : "#ff6b9a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(star.tail.x, star.tail.y);
      ctx.lineTo(star.head.x, star.head.y);
      ctx.stroke();

      ctx.globalAlpha = fade;
      ctx.fillStyle = star.outer ? "#fff3c4" : "#ffd1e0";
      ctx.beginPath();
      ctx.arc(star.head.x, star.head.y, star.outer ? 3 : 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },
};
