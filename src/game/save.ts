import { fireworkTypes } from "../fireworks/registry";
import type { FireworkType } from "../fireworks/types";
import {
  type Request,
  type RequestProgress,
  createRequestProgress,
  requestKinds,
} from "./requests";
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
 * Reads a saved request, or null if it is not a whole, valid one. A
 * "pop-type" request needs a type id from `types`.
 */
function parseRequest(data: unknown, types: FireworkType[]): Request | null {
  if (typeof data !== "object" || data === null) return null;
  const saved = data as Record<string, unknown>;
  const kind = requestKinds.find((candidate) => candidate === saved.kind);
  if (!kind) return null;
  if (!isCount(saved.target) || saved.target < 1) return null;
  if (!isCount(saved.reward)) return null;
  if (typeof saved.text !== "string") return null;
  const request: Request = { kind, target: saved.target, reward: saved.reward, text: saved.text };
  if (kind === "pop-type") {
    const typeId = saved.typeId;
    if (typeof typeId !== "string" || !types.some((type) => type.id === typeId)) return null;
    request.typeId = typeId;
  }
  return request;
}

function parseProgress(data: unknown): RequestProgress {
  const progress = createRequestProgress();
  if (typeof data !== "object" || data === null) return progress;
  const saved = data as Record<string, unknown>;
  if (isCount(saved.count)) progress.count = saved.count;
  if (typeof saved.done === "boolean") progress.done = saved.done;
  return progress;
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
  state.request = parseRequest(saved.request, types) ?? state.request;
  state.activeRequest = parseRequest(saved.activeRequest, types);
  if (state.activeRequest) state.requestProgress = parseProgress(saved.requestProgress);
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
