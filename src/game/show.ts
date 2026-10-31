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

export function fireworkPosition(
  firework: Firework,
  width: number,
  height: number,
): Point {
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

  for (const firework of show.active) firework.age += dt;
  show.active = show.active.filter((firework) => {
    if (flightProgress(firework) < 1) return true;
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
  show.popped++;
  return { kind: "popped", firework: target, at: targetAt };
}

/** The show ends when every firework was launched and none is still in the air. */
export function isShowOver(show: Show): boolean {
  return show.queue.length === 0 && show.active.length === 0;
}
