import { BURST_DURATION } from "../game/show";

/** Height of the ground strip at the bottom of the screen, in pixels. */
export const GROUND_HEIGHT = 40;
/** The crowd stands in this many pixels above the bottom edge, jumps included. */
export const CROWD_BAND = 90;
/** Pixels between crowd figures. */
const CROWD_SPACING = 34;
/** Crowd figures this close to the bonfire are left out so it stays in view. */
const BONFIRE_GAP = 80;
/** Pixels between the bottom edge and a standing figure's feet. */
const FEET_ABOVE_BOTTOM = 16;
/** Highest a cheering figure jumps, in pixels. */
const JUMP_HEIGHT = 14;
/** How much one fresh burst excites the crowd. Two fresh bursts fill it. */
const EXCITEMENT_PER_BURST = 0.6;
/** Stars in the sky. */
const STAR_COUNT = 140;
/** Seed for the star field, so the sky is the same every show. */
const STAR_SEED = 7;

/** A repeatable pseudo-random number from 0 to 1 for a seed. */
export function hash(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export interface Star {
  x: number;
  y: number;
  /** Radius in pixels. */
  size: number;
  /** Phase of the twinkle, in radians. */
  phase: number;
}

/**
 * Fixed star positions for a seed. Stars sit in the sky above the
 * treeline, inside the canvas.
 */
export function starField(
  seed: number,
  count: number,
  width: number,
  height: number,
): Star[] {
  const skyBottom = Math.max(0, height - GROUND_HEIGHT - CROWD_BAND - 40);
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const base = seed * 1000 + i * 4;
    stars.push({
      x: hash(base) * width,
      y: hash(base + 1) ** 1.4 * skyBottom,
      size: 0.5 + hash(base + 2) * 1.1,
      phase: hash(base + 3) * Math.PI * 2,
    });
  }
  return stars;
}

/**
 * How excited the crowd is, from 0 to 1. Each burst on screen adds to it,
 * most when it is new, fading to nothing as it ends.
 */
export function crowdExcitement(bursts: ReadonlyArray<{ age: number }>): number {
  let excitement = 0;
  for (const burst of bursts) {
    const left = 1 - burst.age / BURST_DURATION;
    excitement += EXCITEMENT_PER_BURST * Math.max(0, Math.min(1, left));
  }
  return Math.min(1, excitement);
}

/** How many crowd figures fit across the width. */
export function crowdCount(width: number): number {
  return Math.max(0, Math.floor(width / CROWD_SPACING));
}

export interface CrowdFigure {
  /** Centre of the figure, in pixels from the left. */
  x: number;
  /** Height of the figure standing still, in pixels. */
  size: number;
  /** How far the figure is off the ground, in pixels. */
  lift: number;
  armsUp: boolean;
  /** Pixels above the bottom edge of the canvas the figure's head reaches. */
  reach: number;
}

/**
 * Crowd figure `index`. The more excited the crowd, the more figures
 * cheer: each one has its own threshold, then jumps with its arms up.
 */
export function crowdFigure(
  index: number,
  width: number,
  excitement: number,
  time: number,
): CrowdFigure {
  const spacing = width / Math.max(1, crowdCount(width));
  const jitter = (hash(index + 0.3) - 0.5) * spacing * 0.5;
  const x = Math.max(0, Math.min(width, (index + 0.5) * spacing + jitter));
  const size = 34 + hash(index + 0.7) * 16;
  const threshold = 0.05 + hash(index + 0.9) * 0.5;
  const armsUp = excitement > threshold;
  const bounce = Math.abs(Math.sin(time * (7 + hash(index + 0.1) * 4) + index));
  const lift = armsUp ? bounce * JUMP_HEIGHT * Math.min(1, excitement * 1.5) : 0;
  return { x, size, lift, armsUp, reach: FEET_ABOVE_BOTTOM + lift + size };
}

/** Whether a crowd figure at x would hide the bonfire in the middle. */
function nearBonfire(x: number, width: number): boolean {
  return Math.abs(x - width / 2) < BONFIRE_GAP;
}

/** The bonfire: crossed logs and three flickering layers of flame. */
export function drawBonfire(
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

let cachedStars: { width: number; height: number; stars: Star[] } | null = null;

function starsFor(width: number, height: number): Star[] {
  if (!cachedStars || cachedStars.width !== width || cachedStars.height !== height) {
    cachedStars = { width, height, stars: starField(STAR_SEED, STAR_COUNT, width, height) };
  }
  return cachedStars.stars;
}

function drawTreeline(ctx: CanvasRenderingContext2D, width: number, ground: number): void {
  ctx.fillStyle = "#0f1431";
  ctx.beginPath();
  ctx.moveTo(0, ground);
  const step = 18;
  for (let x = 0; x <= width + step; x += step) {
    const i = Math.round(x / step);
    const tall = 34 + hash(i + 0.2) * 34 + Math.sin(i * 0.4) * 10;
    ctx.lineTo(x - step / 2, ground - tall * 0.8);
    ctx.lineTo(x, ground - tall);
  }
  ctx.lineTo(width, ground);
  ctx.closePath();
  ctx.fill();
}

/** Smoke rising from the bonfire, lit orange from below. */
function drawSmoke(
  ctx: CanvasRenderingContext2D,
  x: number,
  ground: number,
  time: number,
  excitement: number,
): void {
  const puffs = 6;
  for (let i = 0; i < puffs; i++) {
    const t = (time * 0.25 + i / puffs) % 1;
    const px = x + Math.sin(time * 0.8 + i * 1.7) * 12 + t * 30;
    const py = ground - 70 - t * 160;
    const radius = 14 + t * 34;
    const glow = 1 - t;
    ctx.globalAlpha = 0.18 * (1 - t) + 0.05;
    ctx.fillStyle = `rgb(${Math.round(70 + 120 * glow + 40 * excitement)}, ${Math.round(
      50 + 50 * glow + 20 * excitement,
    )}, ${Math.round(60 + 10 * glow)})`;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFigure(ctx: CanvasRenderingContext2D, figure: CrowdFigure, height: number): void {
  const { x, size, lift, armsUp } = figure;
  // Feet stand in the ground strip, so the crowd is in front of it.
  const feet = height - FEET_ABOVE_BOTTOM - lift;
  const head = size * 0.16;
  const shoulders = feet - size + head * 2;
  ctx.beginPath();
  ctx.arc(x, feet - size + head, head, 0, Math.PI * 2);
  ctx.fill();
  // Body: a rounded coat shape down to the ground.
  ctx.beginPath();
  ctx.moveTo(x - size * 0.2, feet);
  ctx.lineTo(x - size * 0.18, shoulders + 3);
  ctx.quadraticCurveTo(x, shoulders - 3, x + size * 0.18, shoulders + 3);
  ctx.lineTo(x + size * 0.2, feet);
  ctx.closePath();
  ctx.fill();
  if (armsUp) {
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - size * 0.15, shoulders + 4);
    ctx.lineTo(x - size * 0.3, shoulders - size * 0.3);
    ctx.moveTo(x + size * 0.15, shoulders + 4);
    ctx.lineTo(x + size * 0.3, shoulders - size * 0.3);
    ctx.stroke();
  }
}

/**
 * The night scene behind the show: sky, stars, treeline, bonfire, smoke and
 * a crowd that cheers. `time` is in seconds; `excitement` is from 0 to 1.
 */
export function drawScenery(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  excitement: number,
): void {
  const ground = height - GROUND_HEIGHT;

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#050816");
  sky.addColorStop(0.7, "#11122e");
  sky.addColorStop(1, "#2a1a3a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#f5f5f5";
  for (const star of starsFor(width, height)) {
    ctx.globalAlpha = 0.45 + 0.4 * Math.sin(time * 1.6 + star.phase);
    ctx.fillRect(star.x, star.y, star.size * 2, star.size * 2);
  }
  ctx.globalAlpha = 1;

  drawTreeline(ctx, width, ground);

  // Warm glow around the bonfire, a little brighter when the crowd cheers.
  const fireX = width / 2;
  const glowRadius = 220 + Math.sin(time * 5) * 8;
  const glow = ctx.createRadialGradient(fireX, ground, 10, fireX, ground, glowRadius);
  glow.addColorStop(0, `rgba(255, 140, 50, ${0.35 + excitement * 0.1})`);
  glow.addColorStop(1, "rgba(255, 140, 50, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(fireX - glowRadius, ground - glowRadius, glowRadius * 2, glowRadius * 2);

  drawSmoke(ctx, fireX, ground, time, excitement);

  ctx.fillStyle = "#0a0b16";
  ctx.fillRect(0, ground, width, GROUND_HEIGHT);
  drawBonfire(ctx, fireX, ground, time);

  ctx.fillStyle = "#010103";
  ctx.strokeStyle = "#010103";
  const count = crowdCount(width);
  for (let i = 0; i < count; i++) {
    const figure = crowdFigure(i, width, excitement, time);
    if (!nearBonfire(figure.x, width)) drawFigure(ctx, figure, height);
  }
}
