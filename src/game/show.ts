import { LANTERN_MAX_DRIFT, LANTERN_MIN_DRIFT, skyLantern } from "../fireworks/skyLantern";
import type { FireworkType, Point } from "../fireworks/types";
import { LANTERN_FIRST_DELAY, LANTERN_INTERVAL } from "../scoring/tuning";
import {
  type Weather,
  pickWeather,
  pickWindStrength,
  riseFactor,
  windDrift,
} from "./weather";

/** Seconds between launches. */
export const LAUNCH_INTERVAL = 1;
/** Seconds a burst stays on screen. */
export const BURST_DURATION = 0.8;
/** The share of the screen height below the top that a firework reaches. */
const TOP_MARGIN = 0.1;
/** Launch positions stay this share of the width away from each side. */
const SIDE_MARGIN = 0.1;

export interface Firework {
  type: FireworkType;
  /** Launch position as a share of the screen width, from 0 to 1. */
  launchX: number;
  /** Seconds since launch. */
  age: number;
  /**
   * Where a star split off another firework starts, in canvas pixels.
   * Fireworks from the stock have none and rise from the ground.
   */
  origin?: Point;
  /** Direction a star flies out in, in radians. Only used with `origin`. */
  heading?: number;
  /** Wind at launch, as a share of the screen width per second. None is still air. */
  wind?: number;
  /** How fast it climbs compared with a clear night. None is 1. */
  rise?: number;
}

export interface Burst {
  type: FireworkType;
  at: Point;
  age: number;
}

export interface Show {
  /** Fireworks that are not launched yet. The next one is first. */
  queue: FireworkType[];
  active: Firework[];
  bursts: Burst[];
  timeToNextLaunch: number;
  /** Seconds until the next sky lantern goes up. */
  timeToNextLantern: number;
  /** Fireworks from the stock that were popped. Stars and lanterns don't count. */
  popped: number;
  fizzled: number;
  weather: Weather;
  /** Share of the screen width the wind pushes a firework per second. Positive is right. */
  windStrength: number;
}

/** What happened to a firework. Scoring and crowd code can use these. */
export type ShowEvent =
  | { kind: "popped"; firework: Firework; at: Point }
  | { kind: "fizzled"; firework: Firework };

/**
 * Sets up a show. With a `random` it picks the night's weather; without
 * one the night is clear.
 */
export function createShow(stock: FireworkType[], random?: () => number): Show {
  const weather = random ? pickWeather(random) : "clear";
  return {
    queue: [...stock],
    active: [],
    bursts: [],
    timeToNextLaunch: 0,
    timeToNextLantern: LANTERN_FIRST_DELAY,
    popped: 0,
    fizzled: 0,
    weather,
    windStrength: random ? pickWindStrength(weather, random) : 0,
  };
}

/** Flight progress: 0 at launch and 1 at the top of the flight. */
export function flightProgress(firework: Firework): number {
  return firework.age * firework.type.riseSpeed * (firework.rise ?? 1);
}

/** True for something the player must not pop, such as a sky lantern. */
export function isAvoid(firework: Firework): boolean {
  return firework.type.avoid === true;
}

/** True for a star split off another firework, which isn't from the stock. */
export function isStar(firework: Firework): boolean {
  return firework.origin !== undefined;
}

export function fireworkPosition(
  firework: Firework,
  width: number,
  height: number,
): Point {
  if (firework.origin) {
    const distance = firework.type.pathOffset(firework.age);
    const heading = firework.heading ?? 0;
    return {
      x: firework.origin.x + Math.cos(heading) * distance,
      y: firework.origin.y + Math.sin(heading) * distance,
    };
  }
  const climb = height * (1 - TOP_MARGIN);
  return {
    x: driftedX(firework) * width + firework.type.pathOffset(firework.age),
    y: height - flightProgress(firework) * climb,
  };
}

/**
 * Where the wind has blown a firework, as a share of the screen width.
 * It stays inside the side margins, so the wind can't push it off screen.
 */
function driftedX(firework: Firework): number {
  if (!firework.wind) return firework.launchX;
  const x = firework.launchX + windDrift(firework.age, firework.wind);
  // A lantern may float off the side; updateShow lets it go there.
  if (isAvoid(firework)) return x;
  return Math.min(Math.max(x, SIDE_MARGIN), 1 - SIDE_MARGIN);
}

/** Moves the show forward by dt seconds. */
export function updateShow(
  show: Show,
  dt: number,
  random: () => number = Math.random,
): ShowEvent[] {
  const events: ShowEvent[] = [];

  // Age the fireworks already in the air first. A firework launched below
  // starts at the time past its launch, which already counts this frame.
  for (const firework of show.active) firework.age += dt;

  show.timeToNextLaunch -= dt;
  while (show.timeToNextLaunch <= 0 && show.queue.length > 0) {
    const type = show.queue.shift()!;
    show.active.push({
      type,
      launchX: SIDE_MARGIN + random() * (1 - 2 * SIDE_MARGIN),
      age: -show.timeToNextLaunch,
      ...weatherAtLaunch(show),
    });
    show.timeToNextLaunch += LAUNCH_INTERVAL;
  }

  // Lanterns only go up while there are fireworks left to launch.
  show.timeToNextLantern -= dt;
  while (show.timeToNextLantern <= 0 && show.queue.length > 0) {
    show.active.push(lanternAt(show, -show.timeToNextLantern, random));
    show.timeToNextLantern += LANTERN_INTERVAL;
  }

  show.active = show.active.filter((firework) => {
    // A lantern that floats off the top or a side just leaves: no event.
    if (isAvoid(firework)) return flightProgress(firework) < 1 && isOnScreen(firework);
    if (flightProgress(firework) < 1) return true;
    // A star that runs out just fades: no fizzle and no crowd loss.
    if (isStar(firework)) return false;
    show.fizzled++;
    events.push({ kind: "fizzled", firework });
    return false;
  });

  for (const burst of show.bursts) burst.age += dt;
  show.bursts = show.bursts.filter((burst) => burst.age < BURST_DURATION);

  return events;
}

/**
 * A sky lantern let go `age` seconds ago. It starts on one half of the sky
 * and drifts across towards the other, with the night's wind added.
 */
function lanternAt(show: Show, age: number, random: () => number): Firework {
  const direction = random() < 0.5 ? -1 : 1;
  const half = SIDE_MARGIN + random() * (0.5 - SIDE_MARGIN);
  const drift = LANTERN_MIN_DRIFT + random() * (LANTERN_MAX_DRIFT - LANTERN_MIN_DRIFT);
  return {
    type: skyLantern,
    launchX: direction > 0 ? half : 1 - half,
    age,
    wind: direction * drift + show.windStrength,
  };
}

/** False once a lantern has drifted past either side of the screen. */
function isOnScreen(firework: Firework): boolean {
  const x = driftedX(firework);
  return x > -SIDE_MARGIN && x < 1 + SIDE_MARGIN;
}

/** What the weather does to a firework launched now. A clear night adds nothing. */
function weatherAtLaunch(show: Show): Pick<Firework, "wind" | "rise"> {
  const changes: Pick<Firework, "wind" | "rise"> = {};
  if (show.windStrength !== 0) changes.wind = show.windStrength;
  const rise = riseFactor(show.weather);
  if (rise !== 1) changes.rise = rise;
  return changes;
}

/** Pops the closest firework in range of the click, if there is one. */
export function clickAt(
  show: Show,
  click: Point,
  width: number,
  height: number,
): ShowEvent | null {
  let target: Firework | null = null;
  let targetAt: Point | null = null;
  let closest = Infinity;

  for (const firework of show.active) {
    const at = fireworkPosition(firework, width, height);
    const distance = Math.hypot(at.x - click.x, at.y - click.y);
    if (distance <= firework.type.hitRadius && distance < closest) {
      target = firework;
      targetAt = at;
      closest = distance;
    }
  }
  if (!target || !targetAt) return null;

  show.active = show.active.filter((firework) => firework !== target);
  show.bursts.push({ type: target.type, at: targetAt, age: 0 });
  if (!isStar(target) && !isAvoid(target)) show.popped++;
  if (target.type.split) splitAt(show, target.type.split, targetAt);
  return { kind: "popped", firework: target, at: targetAt };
}

/**
 * Adds a split's stars at the pop point, spread out evenly. With four
 * stars they fly up, right, down and left, in a cross.
 */
function splitAt(
  show: Show,
  split: { type: FireworkType; count: number },
  at: Point,
): void {
  for (let i = 0; i < split.count; i++) {
    show.active.push({
      type: split.type,
      launchX: 0,
      age: 0,
      origin: { ...at },
      heading: -Math.PI / 2 + (i / split.count) * Math.PI * 2,
    });
  }
}

/**
 * The show ends when every firework was launched and none is still in the
 * air. Lanterns don't hold it up: they float on, but can't be popped.
 */
export function isShowOver(show: Show): boolean {
  return show.queue.length === 0 && show.active.every(isAvoid);
}
