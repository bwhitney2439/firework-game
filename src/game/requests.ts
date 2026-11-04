import { basicRocket } from "../fireworks/basicRocket";
import type { FireworkType } from "../fireworks/types";
import { formatMoney } from "../money";
import type { ScoredEvent } from "../scoring/score";
import type { GameState } from "./state";
import { venueById, venues } from "./venues";

/**
 * What the booker can ask for in one show. Every kind is checked from
 * scored pops as they happen (see advanceRequest).
 */
export type RequestKind = "pop-type" | "combo" | "full-crowd" | "show-money" | "aah";

export const requestKinds: RequestKind[] = [
  "pop-type",
  "combo",
  "full-crowd",
  "show-money",
  "aah",
];

/** One show's goal. Plain data, so it can go into the save. */
export interface Request {
  kind: RequestKind;
  /**
   * Pops for "pop-type" and "aah", the combo for "combo", the crowd meter
   * in percent for "full-crowd" and pounds for "show-money".
   */
  target: number;
  /** The firework type to pop, for "pop-type" only. */
  typeId?: string;
  /** Money paid the moment the request is done. */
  reward: number;
  /** What the shop shows, such as "Pop 5 Basic rockets". */
  text: string;
}

/** How far the active request has got in the current show. */
export interface RequestProgress {
  /** Pops, best combo, best crowd percent or pounds, as `target` counts them. */
  count: number;
  /** Set once the reward is paid, so it can't pay twice. */
  done: boolean;
}

/** Reward at the first venue, about one good pop's worth. Scaled by the venue's pay. */
export const REQUEST_REWARD = 40;
/** Pounds to earn for a "show-money" request at the first venue. Scaled by the venue's pay. */
export const SHOW_MONEY_TARGET = 250;
/** The crowd meter target for "full-crowd", in percent. */
export const FULL_CROWD_TARGET = 100;

/** The fixed easy request for a new game. */
export const STARTER_REQUEST: Request = {
  kind: "pop-type",
  target: 5,
  typeId: basicRocket.id,
  reward: REQUEST_REWARD,
  text: requestText("pop-type", 5, basicRocket.name),
};

export function createRequestProgress(): RequestProgress {
  return { count: 0, done: false };
}

export function requestText(kind: RequestKind, target: number, typeName = ""): string {
  switch (kind) {
    case "pop-type":
      return `Pop ${target} ${typeName}${target === 1 ? "" : "s"}`;
    case "combo":
      return `Reach a combo of ${target}`;
    case "full-crowd":
      return "Fill the crowd meter to the top";
    case "show-money":
      return `Earn ${formatMoney(target)} in one show`;
    case "aah":
      return `Get ${target} "Aah" pops (high in the sky)`;
  }
}

/** Rounds to the nearest multiple of `step`, never below one step. */
function roundTo(value: number, step: number): number {
  return Math.max(step, Math.round(value / step) * step);
}

/**
 * How many of a type the player can pop next show: the ones not yet put
 * into a show plus as many as they can afford now. Basic rockets come free.
 */
function reachableCount(state: GameState, type: FireworkType): number {
  if (type.price <= 0) return Infinity;
  const unlocked = (state.stock[type.id] ?? 0) - (state.lockedStock[type.id] ?? 0);
  return Math.max(0, unlocked) + Math.floor(state.money / type.price);
}

const pick = <T>(items: T[], random: () => number): T =>
  items[Math.min(items.length - 1, Math.floor(random() * items.length))];

/**
 * Picks the next request for the state's venue. Bigger venues ask for more
 * and pay more. A "pop-type" request is only for the free basic rocket or a
 * type the player owns or can afford, so it can always be done. The kind is
 * never the same as `previous`, so each show asks for something new.
 */
export function pickRequest(
  state: GameState,
  types: FireworkType[],
  random: () => number = Math.random,
  previous?: RequestKind,
): Request {
  const venue = venueById(state.venueId) ?? venues[0];
  const tier = venues.indexOf(venue);
  const reward = roundTo(REQUEST_REWARD * venue.moneyMultiplier, 5);
  const kinds = requestKinds.filter((kind) => kind !== previous);
  const kind = pick(kinds, random);

  switch (kind) {
    case "pop-type": {
      const options = types.filter((type) => reachableCount(state, type) > 0);
      const type = pick(options.length > 0 ? options : [basicRocket], random);
      // At most 8 basic rockets, out of the free batch of 10.
      const target = type.price <= 0
        ? 5 + tier
        : Math.min(reachableCount(state, type), 2 + tier);
      return {
        kind,
        target,
        typeId: type.id,
        reward,
        text: requestText(kind, target, type.name),
      };
    }
    case "combo": {
      const target = 4 + 2 * tier;
      return { kind, target, reward, text: requestText(kind, target) };
    }
    case "full-crowd":
      return { kind, target: FULL_CROWD_TARGET, reward, text: requestText(kind, FULL_CROWD_TARGET) };
    case "show-money": {
      const target = roundTo(SHOW_MONEY_TARGET * venue.moneyMultiplier, 10);
      return { kind, target, reward, text: requestText(kind, target) };
    }
    case "aah": {
      const target = 3 + tier;
      return { kind, target, reward, text: requestText(kind, target) };
    }
  }
}

/**
 * Counts one scored pop or fizzle towards the request. Returns true when the
 * target is reached. It does not pay or set `done`: the wallet does that.
 */
export function advanceRequest(
  progress: RequestProgress,
  request: Request,
  scored: ScoredEvent,
): boolean {
  if (scored.kind === "popped") {
    const { score } = scored;
    switch (request.kind) {
      case "pop-type":
        if (scored.event.firework.type.id === request.typeId) progress.count += 1;
        break;
      case "combo":
        progress.count = Math.max(progress.count, score.combo);
        break;
      case "full-crowd":
        progress.count = Math.max(progress.count, Math.round(score.crowd * 100));
        break;
      case "show-money":
        progress.count += score.money;
        break;
      case "aah":
        if (score.cheer === "Aah") progress.count += 1;
        break;
    }
  }
  return progress.count >= request.target;
}
