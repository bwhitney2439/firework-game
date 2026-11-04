/** The kind of night a show is played on. */
export type Weather = "clear" | "windy" | "drizzle";

/** Chance of a windy night. */
export const WINDY_CHANCE = 0.15;
/** Chance of a drizzly night. The rest of the nights are clear. */
export const DRIZZLE_CHANCE = 0.15;
/** Weakest wind, as a share of the screen width a firework drifts per second. */
export const MIN_WIND = 0.03;
/** Strongest wind, as a share of the screen width a firework drifts per second. */
export const MAX_WIND = 0.06;
/** How fast fireworks climb in the drizzle. 0.8 makes each flight 25% longer. */
export const DRIZZLE_RISE_FACTOR = 0.8;
/** Rain lines on screen in the drizzle. */
export const RAIN_DROPS = 90;
/** Pixels a rain line falls per second. */
const RAIN_SPEED = 520;
/** Pixels a rain line slants sideways per second. */
const RAIN_SLANT = 90;

/** Picks the night: clear 70%, windy 15%, drizzle 15%. */
export function pickWeather(random: () => number): Weather {
  const roll = random();
  if (roll < WINDY_CHANCE) return "windy";
  if (roll < WINDY_CHANCE + DRIZZLE_CHANCE) return "drizzle";
  return "clear";
}

/**
 * Wind for the night, as a share of the screen width per second. Positive
 * blows to the right. Only windy nights have wind.
 */
export function pickWindStrength(weather: Weather, random: () => number): number {
  if (weather !== "windy") return 0;
  const direction = random() < 0.5 ? -1 : 1;
  return direction * (MIN_WIND + random() * (MAX_WIND - MIN_WIND));
}

/** How far the wind has pushed a firework at an age, as a share of the screen width. */
export function windDrift(age: number, strength: number): number {
  return strength * age;
}

/** How fast fireworks climb on this night, compared with a clear one. */
export function riseFactor(weather: Weather): number {
  return weather === "drizzle" ? DRIZZLE_RISE_FACTOR : 1;
}

/** The word for the counts line. A clear night has none. */
export function weatherLabel(weather: Weather, windStrength: number): string {
  if (weather === "windy") return windStrength < 0 ? "← Windy" : "Windy →";
  if (weather === "drizzle") return "Drizzle";
  return "";
}

/** A rain line: its top end and the slant of its bottom end, in pixels. */
export interface RainDrop {
  x: number;
  y: number;
  /** Sideways offset of the bottom end from the top end. */
  dx: number;
  /** Length straight down. */
  dy: number;
}

/**
 * Where the rain lines are at a time. Each line falls from the top and
 * wraps round, so the rain is the same for the same time and screen size.
 */
export function rainDrops(time: number, width: number, height: number): RainDrop[] {
  const drops: RainDrop[] = [];
  for (let i = 0; i < RAIN_DROPS; i++) {
    const startX = spread(i * 2 + 1) * width;
    const startY = spread(i * 2 + 2) * height;
    const length = 8 + spread(i + 500) * 8;
    drops.push({
      x: wrap(startX + time * RAIN_SLANT, width),
      y: wrap(startY + time * RAIN_SPEED, height),
      dx: (length * RAIN_SLANT) / RAIN_SPEED,
      dy: length,
    });
  }
  return drops;
}

/** A repeatable number from 0 to 1 for a seed. */
function spread(seed: number): number {
  const x = Math.sin(seed * 91.345 + 47.853) * 24634.6345;
  return x - Math.floor(x);
}

function wrap(value: number, size: number): number {
  if (size <= 0) return 0;
  return ((value % size) + size) % size;
}
