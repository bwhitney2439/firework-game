import { describe, expect, it } from "vitest";
import { SAVE_KEY, type SaveStorage, clearSave, loadGame, parseSave, saveGame } from "./save";
import { basicRocket } from "../fireworks/basicRocket";
import { fireworkTypes } from "../fireworks/registry";
import { FREE_BATCH, createGameState } from "./state";
import { venues } from "./venues";

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
      stock: { "roman-candle": 3 },
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
        stock: { "golden-rain": "lots", "roman-candle": -1, chrysanthemum: 2 },
      }),
    ).toEqual({ ...createGameState(), stock: { chrysanthemum: 2 } });
  });

  it("ignores fields from older saves", () => {
    expect(parseSave({ money: 5, showsPlayed: 7 })).toEqual({ ...createGameState(), money: 5 });
  });

  it("refunds stock over the venue cap at the shop price", () => {
    const candle = fireworkTypes.find((type) => type.id === "roman-candle")!;
    const space = venues[0].fireworkCap - FREE_BATCH;
    const state = parseSave({ money: 10, stock: { "roman-candle": space + 18 } });
    expect(state.stock).toEqual({ "roman-candle": space });
    expect(state.money).toBe(10 + 18 * candle.price);
  });

  it("drops unknown and free firework ids", () => {
    const state = parseSave({
      money: 10,
      stock: { retired: 4, [basicRocket.id]: 2, "roman-candle": 1 },
    });
    expect(state.stock).toEqual({ "roman-candle": 1 });
    expect(state.money).toBe(10);
  });

  it("gives defaults for non-objects", () => {
    expect(parseSave(null)).toEqual(createGameState());
    expect(parseSave(3)).toEqual(createGameState());
  });
});
