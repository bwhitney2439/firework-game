import type { FireworkType, Point } from "../fireworks/types";

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
  popped: number;
  fizzled: number;
}

/** What happened to a firework. Scoring and crowd code can use these. */
export type ShowEvent =
  | { kind: "popped"; firework: Firework; at: Point }
  | { kind: "fizzled"; firework: Firework };

export function createShow(stock: FireworkType[]): Show {
  return {
    queue: [...stock],
    active: [],
    bursts: [],
    timeToNextLaunch: 0,
    popped: 0,
    fizzled: 0,
  };
}

/** Flight progress: 0 at launch and 1 at the top of the flight. */
export function flightProgress(firework: Firework): number {
  return firework.age * firework.type.riseSpeed;
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
    x: firework.launchX * width + firework.type.pathOffset(firework.age),
    y: height - flightProgress(firework) * climb,
  };
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
    });
    show.timeToNextLaunch += LAUNCH_INTERVAL;
  }

  show.active = show.active.filter((firework) => {
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
  if (!isStar(target)) show.popped++;
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

/** The show ends when every firework was launched and none is still in the air. */
export function isShowOver(show: Show): boolean {
  return show.queue.length === 0 && show.active.length === 0;
}
