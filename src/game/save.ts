import { fireworkTypes } from "../fireworks/registry";
import type { FireworkType } from "../fireworks/types";
import { type GameState, createGameState, fitStock } from "./state";
import { venueById } from "./venues";

export const SAVE_KEY = "bonfire-night-popper/save";

/** The part of localStorage the save code uses, so tests can pass a fake. */
export type SaveStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function defaultStorage(): SaveStorage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/** Reads a count per id. Bad counts are left out. */
function parseCounts(data: unknown): Record<string, number> {
  const counts: Record<string, number> = {};
  if (typeof data !== "object" || data === null) return counts;
  for (const [id, count] of Object.entries(data)) {
    if (isCount(count) && count >= 1) counts[id] = Math.floor(count);
  }
  return counts;
}

/**
 * Turns parsed JSON into a valid state. Bad or missing fields get defaults,
 * and the stock is made to fit the venue (see fitStock).
 */
export function parseSave(
  data: unknown,
  types: FireworkType[] = fireworkTypes,
): GameState {
  const state = createGameState();
  if (typeof data !== "object" || data === null) return state;
  const saved = data as Record<string, unknown>;

  if (isCount(saved.money)) state.money = saved.money;
  if (typeof saved.venueId === "string" && venueById(saved.venueId)) {
    state.venueId = saved.venueId;
  }
  state.stock = parseCounts(saved.stock);
  state.lockedStock = parseCounts(saved.lockedStock);
  fitStock(state, types);
  return state;
}

/** Writes the state. Returns false if storage is missing or full. */
export function saveGame(
  state: GameState,
  storage: SaveStorage | null = defaultStorage(),
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** Reads the saved state, or a new one if there is no usable save. */
export function loadGame(
  storage: SaveStorage | null = defaultStorage(),
): GameState {
  if (!storage) return createGameState();
  try {
    const text = storage.getItem(SAVE_KEY);
    return text === null ? createGameState() : parseSave(JSON.parse(text));
  } catch {
    return createGameState();
  }
}

export function clearSave(storage: SaveStorage | null = defaultStorage()): void {
  try {
    storage?.removeItem(SAVE_KEY);
  } catch {
    // Nothing to clear if storage is blocked.
  }
}
