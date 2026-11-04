import { basicRocket } from "../fireworks/basicRocket";
import type { FireworkType } from "../fireworks/types";
import {
  type Request,
  type RequestProgress,
  STARTER_REQUEST,
  createRequestProgress,
  pickRequest,
} from "./requests";
import type { Records } from "./records";
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
  /**
   * Bought fireworks not used yet: count per firework type id. During a
   * show these are the ones still to pop or fizzle, so a reload gives back
   * whatever the player did not get to use.
   */
  stock: Record<string, number>;
  /**
   * How many of `stock` already went into a show: count per type id. They
   * still play in the next show but cannot be sold back, so a reload cannot
   * turn a firework that was about to fizzle back into money.
   */
  lockedStock: Record<string, number>;
  /** The booker's request for the next show, shown in the shop. */
  request: Request;
  /** The request for the show being played, or null before the first show. */
  activeRequest: Request | null;
  /** How far the active request has got, and whether it has paid. */
  requestProgress: RequestProgress;
  /** Best stars, show money and combo per venue id. */
  records: Records;
}

export function createGameState(): GameState {
  return {
    money: 0,
    venueId: venues[0].id,
    stock: {},
    lockedStock: {},
    request: { ...STARTER_REQUEST },
    activeRequest: null,
    requestProgress: createRequestProgress(),
    records: {},
  };
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

/** How many of this type's bought fireworks can still be sold back. */
export function refundableCount(state: GameState, type: FireworkType): number {
  const count = state.stock[type.id] ?? 0;
  return Math.max(0, count - (state.lockedStock[type.id] ?? 0));
}

/** Keeps each locked count within the stock it locks. */
function trimLocked(state: GameState): void {
  const locked: Record<string, number> = {};
  for (const [id, count] of Object.entries(state.lockedStock)) {
    const kept = Math.min(count, state.stock[id] ?? 0);
    if (kept > 0) locked[id] = kept;
  }
  state.lockedStock = locked;
}

/**
 * Makes the stock fit the venue, for old or hand-edited saves. Ids that are
 * not for sale in `types` are dropped, since there is no price to refund.
 * Fireworks over the cap are sold back at their shop price, keeping them in
 * `types` order until the venue is full. Returns the money refunded.
 */
export function fitStock(state: GameState, types: FireworkType[]): number {
  let space = currentVenue(state).fireworkCap - FREE_BATCH;
  let refund = 0;
  const stock: Record<string, number> = {};
  for (const type of types) {
    const count = state.stock[type.id] ?? 0;
    if (type.price <= 0 || count <= 0) continue;
    const kept = Math.min(count, space);
    if (kept > 0) stock[type.id] = kept;
    space -= kept;
    refund += (count - kept) * type.price;
  }
  state.stock = stock;
  trimLocked(state);
  state.money += refund;
  return refund;
}

/**
 * The fireworks for the next show: the free batch with the bought stock
 * mixed in. The stock is not used up here; useFirework takes each one out
 * as it pops or fizzles. All of it is locked, so none can be sold back.
 * The shop's request becomes the show's active request, and the next one
 * is picked for the shop after the show.
 */
export function fireworksForShow(
  state: GameState,
  types: FireworkType[],
  random: () => number = Math.random,
): FireworkType[] {
  fitStock(state, types);
  state.lockedStock = { ...state.stock };
  const fireworks: FireworkType[] = Array.from(
    { length: FREE_BATCH },
    () => basicRocket,
  );
  for (const type of types) {
    for (let i = 0; i < (state.stock[type.id] ?? 0); i++) fireworks.push(type);
  }

  for (let i = fireworks.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [fireworks[i], fireworks[j]] = [fireworks[j], fireworks[i]];
  }

  state.activeRequest = state.request;
  state.requestProgress = createRequestProgress();
  state.request = pickRequest(state, types, random, state.activeRequest.kind);
  return fireworks;
}

/** Takes one bought firework of this type out of the stock, if there is one. */
export function useFirework(state: GameState, type: FireworkType): void {
  const count = state.stock[type.id] ?? 0;
  if (count <= 0) return;
  if (count === 1) delete state.stock[type.id];
  else state.stock[type.id] = count - 1;
  trimLocked(state);
}
