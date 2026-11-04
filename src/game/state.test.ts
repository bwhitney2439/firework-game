import { describe, expect, it } from "vitest";
import { basicRocket } from "../fireworks/basicRocket";
import type { FireworkType } from "../fireworks/types";
import {
  FREE_BATCH,
  boughtCount,
  createGameState,
  currentVenue,
  fireworksForShow,
  fitStock,
  refundableCount,
  spaceLeft,
  useFirework,
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

describe("fitting the stock to the venue", () => {
  const candle: FireworkType = { ...basicRocket, id: "candle", price: 40, baseValue: 5 };
  const space = venues[0].fireworkCap - FREE_BATCH;

  it("leaves stock that fits alone", () => {
    const state = { ...createGameState(), money: 7 };
    state.stock = { sparkler: 2, candle: 1 };
    expect(fitStock(state, [sparkler, candle])).toBe(0);
    expect(state.stock).toEqual({ sparkler: 2, candle: 1 });
    expect(state.money).toBe(7);
  });

  it("refunds fireworks over the cap at their shop price", () => {
    const state = { ...createGameState(), money: 7 };
    state.stock = { sparkler: space + 3 };
    expect(fitStock(state, [sparkler])).toBe(3 * sparkler.price);
    expect(state.stock).toEqual({ sparkler: space });
    expect(state.money).toBe(7 + 3 * sparkler.price);
    expect(spaceLeft(state)).toBe(0);
  });

  it("keeps types in order and refunds the ones that no longer fit", () => {
    const state = createGameState();
    state.stock = { candle: 2, sparkler: space };
    fitStock(state, [sparkler, candle]);
    expect(state.stock).toEqual({ sparkler: space });
    expect(state.money).toBe(2 * candle.price);
  });

  it("uses the cap of the current venue", () => {
    const state = { ...createGameState(), venueId: venues[1].id };
    state.stock = { sparkler: venues[1].fireworkCap };
    fitStock(state, [sparkler]);
    expect(state.stock.sparkler).toBe(venues[1].fireworkCap - FREE_BATCH);
    expect(state.money).toBe(FREE_BATCH * sparkler.price);
  });

  it("keeps the locked count within the stock it kept", () => {
    const state = createGameState();
    state.stock = { sparkler: space + 2, candle: 1 };
    state.lockedStock = { sparkler: space + 2, candle: 1, retired: 3 };
    fitStock(state, [sparkler]);
    expect(state.lockedStock).toEqual({ sparkler: space });
  });

  it("drops unknown and free ids without paying for them", () => {
    const state = createGameState();
    state.stock = { retired: 4, [basicRocket.id]: 2, sparkler: 1 };
    expect(fitStock(state, [basicRocket, sparkler])).toBe(0);
    expect(state.stock).toEqual({ sparkler: 1 });
    expect(state.money).toBe(0);
  });
});

describe("starting a show", () => {
  it("gives the free batch of basic rockets with no purchases", () => {
    const state = createGameState();
    const stock = fireworksForShow(state, [basicRocket, sparkler], first);
    expect(stock).toHaveLength(FREE_BATCH);
    expect(stock.every((type) => type === basicRocket)).toBe(true);
  });

  it("adds purchases on top of the free batch and keeps them in the stock", () => {
    const state = createGameState();
    state.stock.sparkler = 2;
    const stock = fireworksForShow(state, [basicRocket, sparkler], first);
    expect(stock).toHaveLength(FREE_BATCH + 2);
    expect(stock.filter((type) => type === sparkler)).toHaveLength(2);
    expect(state.stock).toEqual({ sparkler: 2 });
  });

  it("gives the free batch again next show", () => {
    const state = createGameState();
    fireworksForShow(state, [basicRocket], first);
    expect(fireworksForShow(state, [basicRocket], first)).toHaveLength(FREE_BATCH);
  });

  it("never goes over the venue cap and refunds the extras", () => {
    const state = createGameState();
    state.stock.sparkler = 100;
    expect(fireworksForShow(state, [sparkler], first)).toHaveLength(venues[0].fireworkCap);
    expect(state.money).toBe((100 - (venues[0].fireworkCap - FREE_BATCH)) * sparkler.price);
  });

  it("locks the bought stock so it cannot be sold back", () => {
    const state = createGameState();
    state.stock = { sparkler: 2 };
    fireworksForShow(state, [sparkler], first);
    expect(state.lockedStock).toEqual({ sparkler: 2 });
    expect(refundableCount(state, sparkler)).toBe(0);
  });

  it("drops ids that are not in the registry", () => {
    const state = createGameState();
    state.stock.retired = 4;
    expect(fireworksForShow(state, [basicRocket], first)).toHaveLength(FREE_BATCH);
    expect(state.stock).toEqual({});
  });

  it("mixes the purchases in among the free rockets", () => {
    const state = createGameState();
    state.stock.sparkler = 1;
    const stock = fireworksForShow(state, [sparkler], first);
    expect(stock[stock.length - 1]).toBe(basicRocket);
  });
});

describe("using a firework", () => {
  it("takes one bought firework out of the stock", () => {
    const state = createGameState();
    state.stock.sparkler = 2;
    useFirework(state, sparkler);
    expect(state.stock).toEqual({ sparkler: 1 });
    useFirework(state, sparkler);
    expect(state.stock).toEqual({});
  });

  it("unlocks the used firework too", () => {
    const state = createGameState();
    state.stock.sparkler = 2;
    state.lockedStock.sparkler = 2;
    useFirework(state, sparkler);
    expect(state.lockedStock).toEqual({ sparkler: 1 });
    useFirework(state, sparkler);
    expect(state.lockedStock).toEqual({});
  });

  it("does nothing for a free rocket", () => {
    const state = createGameState();
    state.stock.sparkler = 1;
    useFirework(state, basicRocket);
    expect(state.stock).toEqual({ sparkler: 1 });
  });
});

describe("the booker's request", () => {
  it("moves to the show when it starts, and a new one is picked for the shop", () => {
    const state = createGameState();
    const shown = state.request;
    state.requestProgress = { count: 3, done: true };
    fireworksForShow(state, [basicRocket, sparkler], first);

    expect(state.activeRequest).toEqual(shown);
    expect(state.requestProgress).toEqual({ count: 0, done: false });
    expect(state.request.kind).not.toBe(shown.kind);
  });

  it("is new after every show, whether it was met or not", () => {
    const state = createGameState();
    for (let show = 0; show < 4; show++) {
      const before = state.request;
      fireworksForShow(state, [basicRocket, sparkler], () => 0.7);
      expect(state.activeRequest).toBe(before);
      expect(state.request).not.toBe(before);
      expect(state.request.kind).not.toBe(before.kind);
    }
  });

  it("stays plain data that survives JSON", () => {
    const state = createGameState();
    fireworksForShow(state, [basicRocket, sparkler], first);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});
