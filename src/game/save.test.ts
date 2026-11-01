import { describe, expect, it } from "vitest";
import { SAVE_KEY, type SaveStorage, clearSave, loadGame, parseSave, saveGame } from "./save";
import { createGameState } from "./state";

function memoryStorage(): SaveStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

describe("save and load", () => {
  it("round-trips the whole state", () => {
    const storage = memoryStorage();
    const state = {
      money: 42.5,
      venueId: "town-park",
      stock: { sparkler: 3 },
      showsPlayed: 7,
    };
    expect(saveGame(state, storage)).toBe(true);
    expect(loadGame(storage)).toEqual(state);
  });

  it("gives a new game when there is no save", () => {
    expect(loadGame(memoryStorage())).toEqual(createGameState());
  });

  it("gives a new game when the save is not JSON", () => {
    const storage = memoryStorage();
    storage.setItem(SAVE_KEY, "{not json");
    expect(loadGame(storage)).toEqual(createGameState());
  });

  it("works without storage", () => {
    expect(saveGame(createGameState(), null)).toBe(false);
    expect(loadGame(null)).toEqual(createGameState());
  });

  it("reports a failed write instead of throwing", () => {
    const storage = memoryStorage();
    storage.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    expect(saveGame(createGameState(), storage)).toBe(false);
  });

  it("clears the save", () => {
    const storage = memoryStorage();
    saveGame({ ...createGameState(), money: 9 }, storage);
    clearSave(storage);
    expect(storage.data.size).toBe(0);
  });
});

describe("parsing a save", () => {
  it("replaces bad fields with defaults", () => {
    expect(
      parseSave({
        money: -5,
        venueId: "moon",
        stock: { sparkler: "lots", rocket: -1, candle: 2 },
        showsPlayed: "many",
      }),
    ).toEqual({ ...createGameState(), stock: { candle: 2 } });
  });

  it("gives defaults for non-objects", () => {
    expect(parseSave(null)).toEqual(createGameState());
    expect(parseSave(3)).toEqual(createGameState());
  });
});
