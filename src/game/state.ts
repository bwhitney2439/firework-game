import { basicRocket } from "../fireworks/basicRocket";
import type { FireworkType } from "../fireworks/types";
import { type Venue, venueById, venues } from "./venues";

/** Basic rockets given free at the start of every show. */
export const FREE_BATCH = 10;

/**
 * Everything that lasts between shows. It is a plain object with no
 * functions or class instances, so it can go straight into JSON.
 */
export interface GameState {
  money: number;
  venueId: string;
  /** Fireworks bought for the next show: count per firework type id. */
  stock: Record<string, number>;
  showsPlayed: number;
}

export function createGameState(): GameState {
  return { money: 0, venueId: venues[0].id, stock: {}, showsPlayed: 0 };
}

export function currentVenue(state: GameState): Venue {
  return venueById(state.venueId) ?? venues[0];
}

/** How many bought fireworks wait for the next show. */
export function boughtCount(state: GameState): number {
  return Object.values(state.stock).reduce((sum, count) => sum + count, 0);
}

/** How many more fireworks fit in the next show. */
export function spaceLeft(state: GameState): number {
  return Math.max(
    0,
    currentVenue(state).fireworkCap - FREE_BATCH - boughtCount(state),
  );
}

/**
 * Money for one pop at the current venue. Task 2's scoring works out its own
 * per-pop money with the venue multiplier in it; use that instead once merged.
 */
export function popMoney(state: GameState, type: FireworkType): number {
  return type.baseValue * currentVenue(state).moneyMultiplier;
}

/** Adds the money for one pop and returns the amount. */
export function earnPop(state: GameState, type: FireworkType): number {
  const amount = popMoney(state, type);
  state.money += amount;
  return amount;
}

/**
 * Uses up the bought stock and returns the fireworks for the next show:
 * the free batch with the purchases mixed in, never more than the venue cap.
 * Ids that are not in `types` are dropped.
 */
export function startShow(
  state: GameState,
  types: FireworkType[],
  random: () => number = Math.random,
): FireworkType[] {
  const fireworks: FireworkType[] = Array.from(
    { length: FREE_BATCH },
    () => basicRocket,
  );
  for (const [id, count] of Object.entries(state.stock)) {
    const type = types.find((candidate) => candidate.id === id);
    if (!type) continue;
    for (let i = 0; i < count; i++) fireworks.push(type);
  }
  state.stock = {};
  state.showsPlayed++;

  for (let i = fireworks.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [fireworks[i], fireworks[j]] = [fireworks[j], fireworks[i]];
  }
  return fireworks.slice(0, currentVenue(state).fireworkCap);
}
