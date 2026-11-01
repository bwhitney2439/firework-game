import { type GameState, createGameState } from "./state";
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

/** Turns parsed JSON into a valid state. Bad or missing fields get defaults. */
export function parseSave(data: unknown): GameState {
  const state = createGameState();
  if (typeof data !== "object" || data === null) return state;
  const saved = data as Record<string, unknown>;

  if (isCount(saved.money)) state.money = saved.money;
  if (typeof saved.venueId === "string" && venueById(saved.venueId)) {
    state.venueId = saved.venueId;
  }
  if (isCount(saved.showsPlayed)) state.showsPlayed = Math.floor(saved.showsPlayed);
  if (typeof saved.stock === "object" && saved.stock !== null) {
    for (const [id, count] of Object.entries(saved.stock)) {
      if (isCount(count) && count >= 1) state.stock[id] = Math.floor(count);
    }
  }
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
