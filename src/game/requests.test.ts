import { describe, expect, it } from "vitest";
import { basicRocket } from "../fireworks/basicRocket";
import type { FireworkType } from "../fireworks/types";
import type { Firework } from "./show";
import type { PopScore, ScoredEvent } from "../scoring/score";
import {
  type Request,
  type RequestKind,
  STARTER_REQUEST,
  advanceRequest,
  createRequestProgress,
  pickRequest,
  requestKinds,
} from "./requests";
import { createGameState } from "./state";
import { venues } from "./venues";

const candle: FireworkType = { ...basicRocket, id: "candle", name: "Candle", price: 40 };
const finale: FireworkType = { ...basicRocket, id: "finale", name: "Finale", price: 250 };
const types = [basicRocket, candle, finale];

/** A random that gives these values in turn, then repeats the last one. */
function sequence(...values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

/** A random that picks this index out of `count` choices. */
const choose = (index: number, count: number) => (index + 0.5) / count;

/** Picks a request of this kind, with the type chosen by `typeRandom`. */
function pickKind(state = createGameState(), kind: RequestKind, typeRandom = 0) {
  const index = requestKinds.indexOf(kind);
  return pickRequest(state, types, sequence(choose(index, requestKinds.length), typeRandom));
}

function pop(score: Partial<PopScore> = {}, type = basicRocket): ScoredEvent {
  const firework = { type } as Firework;
  return {
    kind: "popped",
    event: { kind: "popped", firework, at: { x: 0, y: 0 } },
    score: { money: 10, combo: 1, crowd: 0.5, cheer: "Ooh", ...score } as PopScore,
  };
}

function fizzle(): ScoredEvent {
  const firework = { type: basicRocket } as Firework;
  return { kind: "fizzled", event: { kind: "fizzled", firework }, score: { crowd: 0, lostCombo: 0 } };
}

/** Feeds events in until the request is done. Returns how many it took. */
function eventsToFinish(request: Request, events: ScoredEvent[]): number | null {
  const progress = createRequestProgress();
  for (let i = 0; i < events.length; i++) {
    if (advanceRequest(progress, request, events[i])) return i + 1;
  }
  return null;
}

describe("picking a request", () => {
  it("starts a new game with the fixed easy one", () => {
    expect(createGameState().request).toEqual(STARTER_REQUEST);
    expect(STARTER_REQUEST.text).toBe("Pop 5 Basic rockets");
  });

  it("can pick every kind", () => {
    for (const kind of requestKinds) {
      const request = pickKind(createGameState(), kind);
      expect(request.kind).toBe(kind);
      expect(request.target).toBeGreaterThanOrEqual(1);
      expect(request.reward).toBeGreaterThan(0);
      expect(request.text.length).toBeGreaterThan(0);
    }
  });

  it("never picks the previous kind again", () => {
    for (const previous of requestKinds) {
      for (let r = 0; r < 1; r += 0.05) {
        const request = pickRequest(createGameState(), types, () => r, previous);
        expect(request.kind).not.toBe(previous);
      }
    }
  });

  it("only picks the free rocket when nothing else is owned or affordable", () => {
    for (let r = 0; r < 1; r += 0.05) {
      const request = pickKind({ ...createGameState(), money: 39 }, "pop-type", r);
      expect(request.typeId).toBe(basicRocket.id);
    }
  });

  it("picks types the player can afford, and no more of them than that", () => {
    const state = { ...createGameState(), money: 40 };
    const ids = new Set<string>();
    for (let r = 0; r < 1; r += 0.05) {
      const request = pickKind(state, "pop-type", r);
      ids.add(request.typeId!);
      if (request.typeId === candle.id) expect(request.target).toBe(1);
    }
    expect([...ids].sort()).toEqual([basicRocket.id, candle.id]);
  });

  it("picks types the player owns but can't afford", () => {
    const state = { ...createGameState(), stock: { finale: 2 } };
    const ids = new Set<string>();
    for (let r = 0; r < 1; r += 0.05) ids.add(pickKind(state, "pop-type", r).typeId!);
    expect([...ids].sort()).toEqual([basicRocket.id, finale.id]);
  });

  it("doesn't count stock already put into a show as owned", () => {
    const state = { ...createGameState(), stock: { finale: 2 }, lockedStock: { finale: 2 } };
    for (let r = 0; r < 1; r += 0.05) {
      expect(pickKind(state, "pop-type", r).typeId).not.toBe(finale.id);
    }
  });

  it("asks for more and pays more at bigger venues", () => {
    const garden = createGameState();
    const stadium = { ...createGameState(), venueId: venues[3].id };
    for (const kind of ["combo", "show-money", "aah"] as const) {
      expect(pickKind(stadium, kind).target).toBeGreaterThan(pickKind(garden, kind).target);
    }
    expect(pickKind(stadium, "combo").reward).toBeGreaterThan(pickKind(garden, "combo").reward);
  });

  it("never asks for more basic rockets than the free batch", () => {
    for (const venue of venues) {
      const state = { ...createGameState(), venueId: venue.id };
      expect(pickKind(state, "pop-type", 0).target).toBeLessThanOrEqual(10);
    }
  });
});

describe("request progress", () => {
  const garden = createGameState();

  it("pop N of a type is done on the Nth pop of that type", () => {
    const request = { ...pickKind({ ...garden, money: 1000 }, "pop-type", choose(1, 3)) };
    expect(request.typeId).toBe(candle.id);
    const events = [pop({}, basicRocket), ...Array.from({ length: request.target }, () => pop({}, candle))];
    expect(eventsToFinish(request, events)).toBe(1 + request.target);
    expect(eventsToFinish(request, events.slice(0, -1))).toBeNull();
  });

  it("reach combo N is done when the combo reaches N", () => {
    const request = pickKind(garden, "combo");
    const events = Array.from({ length: request.target }, (_, i) => pop({ combo: i + 1 }));
    expect(eventsToFinish(request, events)).toBe(request.target);
    expect(eventsToFinish(request, events.slice(0, -1))).toBeNull();
  });

  it("a combo broken by a fizzle still counts its best", () => {
    const request = pickKind(garden, "combo");
    const progress = createRequestProgress();
    advanceRequest(progress, request, pop({ combo: 2 }));
    advanceRequest(progress, request, fizzle());
    advanceRequest(progress, request, pop({ combo: 1 }));
    expect(progress.count).toBe(2);
  });

  it("fill the crowd is done only when the meter is full", () => {
    const request = pickKind(garden, "full-crowd");
    expect(eventsToFinish(request, [pop({ crowd: 0.9 }), pop({ crowd: 0.99 })])).toBeNull();
    expect(eventsToFinish(request, [pop({ crowd: 0.9 }), pop({ crowd: 1 })])).toBe(2);
  });

  it("earn £N is done when the show's pops add up to N", () => {
    const request = pickKind(garden, "show-money");
    const short = pop({ money: request.target - 1 });
    expect(eventsToFinish(request, [short, fizzle()])).toBeNull();
    expect(eventsToFinish(request, [short, pop({ money: 1 })])).toBe(2);
  });

  it("N Aah pops is done on the Nth Aah, and Oohs don't count", () => {
    const request = pickKind(garden, "aah");
    const events = [pop({ cheer: "Ooh" }), ...Array.from({ length: request.target }, () => pop({ cheer: "Aah" }))];
    expect(eventsToFinish(request, events)).toBe(1 + request.target);
    expect(eventsToFinish(request, events.slice(0, -1))).toBeNull();
  });
});
