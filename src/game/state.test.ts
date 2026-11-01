import { describe, expect, it } from "vitest";
import { basicRocket } from "../fireworks/basicRocket";
import type { FireworkType } from "../fireworks/types";
import {
  FREE_BATCH,
  boughtCount,
  createGameState,
  currentVenue,
  earnPop,
  popMoney,
  spaceLeft,
  startShow,
} from "./state";
import { venues } from "./venues";

const sparkler: FireworkType = { ...basicRocket, id: "sparkler", price: 5, baseValue: 3 };
const first = () => 0;

describe("game state", () => {
  it("starts at the first venue with no money or stock", () => {
    const state = createGameState();
    expect(state.money).toBe(0);
    expect(currentVenue(state)).toBe(venues[0]);
    expect(boughtCount(state)).toBe(0);
    expect(state.showsPlayed).toBe(0);
  });

  it("is plain data that survives JSON", () => {
    const state = createGameState();
    state.stock.sparkler = 2;
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  it("falls back to the first venue for an unknown id", () => {
    const state = { ...createGameState(), venueId: "moon" };
    expect(currentVenue(state)).toBe(venues[0]);
  });
});

describe("money per pop", () => {
  it("multiplies the base value by the venue crowd", () => {
    const state = createGameState();
    expect(popMoney(state, sparkler)).toBe(3);
    state.venueId = venues[3].id;
    expect(popMoney(state, sparkler)).toBe(3 * venues[3].moneyMultiplier);
  });

  it("adds the pop money to the state", () => {
    const state = { ...createGameState(), venueId: venues[1].id };
    const amount = earnPop(state, basicRocket);
    expect(amount).toBe(venues[1].moneyMultiplier);
    expect(state.money).toBe(amount);
  });
});

describe("firework cap", () => {
  it("leaves room for purchases on top of the free batch", () => {
    const state = createGameState();
    expect(spaceLeft(state)).toBe(venues[0].fireworkCap - FREE_BATCH);
    state.stock.sparkler = 3;
    expect(spaceLeft(state)).toBe(venues[0].fireworkCap - FREE_BATCH - 3);
  });

  it("never reports negative space", () => {
    const state = createGameState();
    state.stock.sparkler = 999;
    expect(spaceLeft(state)).toBe(0);
  });
});

describe("starting a show", () => {
  it("gives the free batch of basic rockets with no purchases", () => {
    const state = createGameState();
    const stock = startShow(state, [basicRocket, sparkler], first);
    expect(stock).toHaveLength(FREE_BATCH);
    expect(stock.every((type) => type === basicRocket)).toBe(true);
  });

  it("adds purchases on top of the free batch and uses them up", () => {
    const state = createGameState();
    state.stock.sparkler = 2;
    const stock = startShow(state, [basicRocket, sparkler], first);
    expect(stock).toHaveLength(FREE_BATCH + 2);
    expect(stock.filter((type) => type === sparkler)).toHaveLength(2);
    expect(state.stock).toEqual({});
    expect(state.showsPlayed).toBe(1);
  });

  it("gives the free batch again next show", () => {
    const state = createGameState();
    startShow(state, [basicRocket], first);
    expect(startShow(state, [basicRocket], first)).toHaveLength(FREE_BATCH);
  });

  it("never goes over the venue cap", () => {
    const state = createGameState();
    state.stock.sparkler = 100;
    expect(startShow(state, [sparkler], first)).toHaveLength(venues[0].fireworkCap);
  });

  it("drops ids that are not in the registry", () => {
    const state = createGameState();
    state.stock.retired = 4;
    expect(startShow(state, [basicRocket], first)).toHaveLength(FREE_BATCH);
  });

  it("mixes the purchases in among the free rockets", () => {
    const state = createGameState();
    state.stock.sparkler = 1;
    const stock = startShow(state, [sparkler], first);
    expect(stock[stock.length - 1]).toBe(basicRocket);
  });
});
