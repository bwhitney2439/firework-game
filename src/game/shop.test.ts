import { describe, expect, it } from "vitest";
import { basicRocket } from "../fireworks/basicRocket";
import type { FireworkType } from "../fireworks/types";
import {
  buyFirework,
  canBuyFirework,
  refundFirework,
  shopItems,
  upgradeVenue,
} from "./shop";
import { FREE_BATCH, createGameState, spaceLeft } from "./state";
import { venues } from "./venues";

const sparkler: FireworkType = { ...basicRocket, id: "sparkler", price: 5 };

function richState() {
  return { ...createGameState(), money: 10000 };
}

describe("shop items", () => {
  it("lists every paid type and leaves out free ones", () => {
    expect(shopItems([basicRocket, sparkler])).toEqual([sparkler]);
  });
});

describe("buying fireworks", () => {
  it("takes the price and adds one to the stock", () => {
    const state = { ...createGameState(), money: 12 };
    expect(buyFirework(state, sparkler)).toBe("ok");
    expect(state.money).toBe(7);
    expect(state.stock).toEqual({ sparkler: 1 });
  });

  it("refuses when the money is short", () => {
    const state = { ...createGameState(), money: 4 };
    expect(buyFirework(state, sparkler)).toBe("too-expensive");
    expect(state.money).toBe(4);
    expect(state.stock).toEqual({});
  });

  it("refuses free types", () => {
    expect(canBuyFirework(richState(), basicRocket)).toBe("free");
  });

  it("stops at the venue cap", () => {
    const state = richState();
    const room = venues[0].fireworkCap - FREE_BATCH;
    for (let i = 0; i < room; i++) expect(buyFirework(state, sparkler)).toBe("ok");
    expect(buyFirework(state, sparkler)).toBe("no-space");
    expect(state.stock.sparkler).toBe(room);
  });

  it("refunds a bought firework in full", () => {
    const state = richState();
    buyFirework(state, sparkler);
    buyFirework(state, sparkler);
    expect(refundFirework(state, sparkler)).toBe(true);
    expect(state.stock).toEqual({ sparkler: 1 });
    expect(refundFirework(state, sparkler)).toBe(true);
    expect(state.stock).toEqual({});
    expect(state.money).toBe(10000);
    expect(refundFirework(state, sparkler)).toBe(false);
  });
});

describe("venue upgrades", () => {
  it("moves up one tier for its price", () => {
    const state = { ...createGameState(), money: venues[1].price };
    expect(upgradeVenue(state)).toBe("ok");
    expect(state.venueId).toBe(venues[1].id);
    expect(state.money).toBe(0);
  });

  it("raises the cap so more fireworks fit", () => {
    const state = richState();
    const before = spaceLeft(state);
    upgradeVenue(state);
    expect(spaceLeft(state)).toBe(before + venues[1].fireworkCap - venues[0].fireworkCap);
  });

  it("refuses when the money is short", () => {
    const state = { ...createGameState(), money: venues[1].price - 1 };
    expect(upgradeVenue(state)).toBe("too-expensive");
    expect(state.venueId).toBe(venues[0].id);
  });

  it("stops at the top tier", () => {
    const state = richState();
    for (let i = 1; i < venues.length; i++) expect(upgradeVenue(state)).toBe("ok");
    expect(state.venueId).toBe("city-stadium");
    expect(upgradeVenue(state)).toBe("top-venue");
  });
});
