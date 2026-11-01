import type { FireworkType } from "../fireworks/types";
import { type GameState, currentVenue, refundableCount, spaceLeft } from "./state";
import { nextVenue } from "./venues";

export type ShopResult = "ok" | "too-expensive" | "no-space" | "free" | "top-venue";

/** The types the shop sells. Free types come in the free batch instead. */
export function shopItems(types: FireworkType[]): FireworkType[] {
  return types.filter((type) => type.price > 0);
}

export function canBuyFirework(state: GameState, type: FireworkType): ShopResult {
  if (type.price <= 0) return "free";
  if (spaceLeft(state) <= 0) return "no-space";
  if (state.money < type.price) return "too-expensive";
  return "ok";
}

export function buyFirework(state: GameState, type: FireworkType): ShopResult {
  const result = canBuyFirework(state, type);
  if (result !== "ok") return result;
  state.money -= type.price;
  state.stock[type.id] = (state.stock[type.id] ?? 0) + 1;
  return "ok";
}

/**
 * Takes one bought firework back for a full refund. Fireworks that already
 * went into a show cannot be sold back (see GameState.lockedStock).
 */
export function refundFirework(state: GameState, type: FireworkType): boolean {
  if (refundableCount(state, type) <= 0) return false;
  const count = state.stock[type.id];
  state.money += type.price;
  if (count === 1) delete state.stock[type.id];
  else state.stock[type.id] = count - 1;
  return true;
}

export function canUpgradeVenue(state: GameState): ShopResult {
  const next = nextVenue(currentVenue(state));
  if (!next) return "top-venue";
  if (state.money < next.price) return "too-expensive";
  return "ok";
}

export function upgradeVenue(state: GameState): ShopResult {
  const result = canUpgradeVenue(state);
  if (result !== "ok") return result;
  const next = nextVenue(currentVenue(state))!;
  state.money -= next.price;
  state.venueId = next.id;
  return "ok";
}
