import type { FireworkType, Point } from "./types";

/** Number of falling streaks in the burst. */
const STREAKS = 48;
/** How far the streaks spread before they droop, in pixels. */
const BURST_RADIUS = 150;
/** How far the streaks fall by the end of the burst, in pixels. */
const DROP = 120;
/** Share of the burst a streak's tail lags behind its head. */
const TRAIL = 0.18;
/** Widest sideways sway of the shell while it rises, in pixels. */
const SWAY = 14;

export interface Streak {
  angle: number;
  /** Share of BURST_RADIUS this streak travels, so the burst is not a perfect ring. */
  reach: number;
}

/**
 * Fixed, evenly spread streaks with a little jitter. They are made once, so
 * the burst looks the same on every frame instead of shimmering at random.
 */
export const streaks: Streak[] = Array.from({ length: STREAKS }, (_, i) => {
  const jitter = Math.sin(i * 12.9898) * 0.5;
  return {
    angle: ((i + jitter * 0.6) / STREAKS) * Math.PI * 2,
    reach: 0.7 + (Math.sin(i * 78.233) * 0.5 + 0.5) * 0.3,
  };
});

/** Where a streak's spark is at a point in the burst, from 0 to 1. */
export function streakPoint(at: Point, streak: Streak, progress: number): Point {
  const t = Math.min(Math.max(progress, 0), 1);
  // Fast spread that slows down, then gravity pulls the sparks into a rain.
  const spread = BURST_RADIUS * streak.reach * (1 - (1 - t) ** 3);
  return {
    x: at.x + Math.cos(streak.angle) * spread,
    y: at.y + Math.sin(streak.angle) * spread * 0.8 + DROP * t * t,
  };
}

/** The finale shell: rare and expensive, with a slow, swaying climb and a huge payout. */
export const goldenRain: FireworkType = {
  id: "golden-rain",
  name: "Golden rain finale",
  price: 250,
  baseValue: 25,
  riseSpeed: 0.2,
  hitRadius: 22,

  pathOffset: (age) => Math.sin(age * 1.6) * SWAY,

  drawRising(ctx, at, age) {
    ctx.save();

    // Glittering gold trail.
    ctx.fillStyle = "#ffd700";
    for (let i = 0; i < 6; i++) {
      ctx.globalAlpha = 0.8 - i * 0.12;
      const wobble = Math.sin(age * 30 + i * 2) * 3;
      ctx.beginPath();
      ctx.arc(at.x + wobble, at.y + 16 + i * 7, 2.5 - i * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Pulsing halo, so the rare shell stands out.
    ctx.globalAlpha = 0.3 + Math.sin(age * 6) * 0.1;
    ctx.fillStyle = "#ffc933";
    ctx.beginPath();
    ctx.arc(at.x, at.y, 20, 0, Math.PI * 2);
    ctx.fill();

    // Shell body with gold bands.
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#7a1f1f";
    ctx.fillRect(at.x - 6, at.y - 12, 12, 24);
    ctx.fillStyle = "#ffd700";
    ctx.fillRect(at.x - 6, at.y - 6, 12, 3);
    ctx.fillRect(at.x - 6, at.y + 4, 12, 3);
    ctx.beginPath();
    ctx.moveTo(at.x - 6, at.y - 12);
    ctx.lineTo(at.x + 6, at.y - 12);
    ctx.lineTo(at.x, at.y - 22);
    ctx.fill();

    ctx.restore();
  },

  drawBurst(ctx, at, progress) {
    ctx.save();

    // Bright flash at the start of the burst.
    if (progress < 0.25) {
      ctx.globalAlpha = 1 - progress / 0.25;
      ctx.fillStyle = "#fff6cc";
      ctx.beginPath();
      ctx.arc(at.x, at.y, 40 * (0.5 + progress * 2), 0, Math.PI * 2);
      ctx.fill();
    }

    // Stays bright most of the way, then fades out.
    ctx.globalAlpha = 1 - progress ** 3;
    ctx.lineCap = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#e8a317";
    ctx.fillStyle = "#fff1a8";
    const tailProgress = Math.max(0, progress - TRAIL);
    for (const streak of streaks) {
      const head = streakPoint(at, streak, progress);
      const tail = streakPoint(at, streak, tailProgress);
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      ctx.lineTo(head.x, head.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(head.x, head.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  },
};
