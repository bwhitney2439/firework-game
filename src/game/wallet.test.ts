import { describe, expect, it } from "vitest";
import { basicRocket } from "../fireworks/basicRocket";
import { fireworkTypes } from "../fireworks/registry";
import { createScoring, handleShowEvents, type Scoring } from "../scoring/scoring";
import type { Request } from "./requests";
import { clickAt, createShow, fireworkPosition, isShowOver, updateShow } from "./show";
import type { FireworkType } from "../fireworks/types";
import { parseSave } from "./save";
import { buyFirework, refundFirework } from "./shop";
import { createGameState, fireworksForShow, type GameState } from "./state";
import { venues } from "./venues";
import { settleScoredEvents, startScoringAtVenue } from "./wallet";

const WIDTH = 1000;
const HEIGHT = 800;
const middle = () => 0.5;

const sparkler: FireworkType = { ...basicRocket, id: "sparkler", price: 5 };

/** Starts a show at the state's venue and pops its one firework. */
function popOne(state: GameState, saves: GameState[] = [], type = basicRocket) {
  const scoring = createScoring();
  settleScoredEvents(scoring, state, (saved) => saves.push(structuredClone(saved)));
  startScoringAtVenue(scoring, state);
  const show = createShow([type]);
  updateShow(show, 1, middle);
  const at = fireworkPosition(show.active[0], WIDTH, HEIGHT);
  const popped = clickAt(show, at, WIDTH, HEIGHT);
  const [scored] = handleShowEvents(scoring, [popped], WIDTH, HEIGHT);
  if (scored.kind !== "popped") throw new Error("expected a pop");
  return scored.score;
}

describe("wallet", () => {
  it("pays one pop exactly once", () => {
    const state = { ...createGameState(), money: 100 };
    const saves: GameState[] = [];
    const score = popOne(state, saves);

    expect(score.money).toBeGreaterThan(0);
    expect(state.money).toBe(100 + score.money);
    expect(saves).toHaveLength(1);
    expect(saves[0].money).toBe(100 + score.money);
  });

  it("uses the venue money multiplier for the pop", () => {
    const garden = createGameState();
    const stadium = { ...createGameState(), venueId: venues[3].id };
    const gardenScore = popOne(garden);
    const stadiumScore = popOne(stadium);

    expect(stadiumScore.moneyMultiplier).toBe(venues[3].moneyMultiplier);
    expect(stadium.money).toBe(stadiumScore.money);
    expect(stadium.money).toBeCloseTo(gardenScore.money * venues[3].moneyMultiplier, -1);
  });

  it("pays nothing for a fizzle", () => {
    const state = createGameState();
    const scoring = createScoring();
    settleScoredEvents(scoring, state);
    const show = createShow([basicRocket]);
    const events = [...updateShow(show, 1, middle), ...updateShow(show, 60, middle)];
    handleShowEvents(scoring, events, WIDTH, HEIGHT);

    expect(events.some((event) => event.kind === "fizzled")).toBe(true);
    expect(state.money).toBe(0);
  });
});

describe("bought stock during a show", () => {
  it("is used up and saved when a bought firework pops", () => {
    const state = createGameState();
    state.stock.sparkler = 2;
    const saves: GameState[] = [];
    popOne(state, saves, sparkler);

    expect(state.stock).toEqual({ sparkler: 1 });
    expect(saves[0].stock).toEqual({ sparkler: 1 });
  });

  it("is used up and saved when a bought firework fizzles", () => {
    const state = createGameState();
    state.stock.sparkler = 1;
    const saves: GameState[] = [];
    const scoring = createScoring();
    settleScoredEvents(scoring, state, (saved) => saves.push(structuredClone(saved)));
    const show = createShow([sparkler]);
    handleShowEvents(scoring, updateShow(show, 60, middle), WIDTH, HEIGHT);

    expect(state.stock).toEqual({});
    expect(saves).toEqual([expect.objectContaining({ stock: {} })]);
  });

  it("stays in the save for fireworks that have not popped or fizzled yet", () => {
    const state = createGameState();
    state.stock.sparkler = 3;
    const saves: GameState[] = [];
    popOne(state, saves, sparkler);

    // A reload now loads the last save: two sparklers still to use.
    expect(saves.at(-1)!.stock).toEqual({ sparkler: 2 });
  });

  it("cannot be sold back after a reload mid-show", () => {
    const state = { ...createGameState(), money: 100 };
    state.stock.sparkler = 2;
    const saves: GameState[] = [];
    const scoring = createScoring();
    settleScoredEvents(scoring, state, (saved) => saves.push(structuredClone(saved)));
    const show = createShow(fireworksForShow(state, [sparkler], middle));
    // One bought firework pops, then the page reloads.
    while (!show.active.some((firework) => firework.type === sparkler)) updateShow(show, 1, middle);
    const firework = show.active.find((candidate) => candidate.type === sparkler)!;
    handleShowEvents(
      scoring,
      [clickAt(show, fireworkPosition(firework, WIDTH, HEIGHT), WIDTH, HEIGHT)],
      WIDTH,
      HEIGHT,
    );
    const reloaded = parseSave(JSON.parse(JSON.stringify(saves.at(-1))), [sparkler]);

    expect(reloaded.stock).toEqual({ sparkler: 1 });
    const money = reloaded.money;
    expect(refundFirework(reloaded, sparkler)).toBe(false);
    expect(reloaded.money).toBe(money);
    // A firework bought after the reload can still be sold back.
    expect(buyFirework(reloaded, sparkler)).toBe("ok");
    expect(refundFirework(reloaded, sparkler)).toBe(true);
    expect(reloaded.money).toBe(money);
    expect(reloaded.stock).toEqual({ sparkler: 1 });
  });

  it("is not touched by the free rockets", () => {
    const state = createGameState();
    state.stock.sparkler = 1;
    popOne(state, [], basicRocket);
    expect(state.stock).toEqual({ sparkler: 1 });
  });
});

describe("the booker's request during a show", () => {
  const twoPops: Request = {
    kind: "pop-type",
    target: 2,
    typeId: basicRocket.id,
    reward: 40,
    text: "Pop 2 Basic rockets",
  };

  /** A state whose active request is `request`, as at the start of a show. */
  function withRequest(request = twoPops): GameState {
    return { ...createGameState(), activeRequest: { ...request } };
  }

  /** Pops `count` basic rockets in a show that is already scoring. */
  function popMore(scoring: Scoring, count: number) {
    const show = createShow(Array.from({ length: count }, () => basicRocket));
    const scored = [];
    for (let i = 0; i < count; i++) {
      updateShow(show, 1, middle);
      const at = fireworkPosition(show.active[0], WIDTH, HEIGHT);
      scored.push(...handleShowEvents(scoring, [clickAt(show, at, WIDTH, HEIGHT)], WIDTH, HEIGHT));
    }
    return scored;
  }

  function startShow(state: GameState, saves: GameState[] = []): Scoring {
    const scoring = createScoring();
    settleScoredEvents(scoring, state, (saved) => saves.push(structuredClone(saved)));
    startScoringAtVenue(scoring, state);
    return scoring;
  }

  const golds = (scoring: Scoring) => scoring.popups.filter((popup) => popup.style === "gold");
  const popMoney = (scored: ReturnType<typeof popMore>) =>
    scored.reduce((sum, event) => sum + (event.kind === "popped" ? event.score.money : 0), 0);

  it("pays the reward at once with a gold pop-up when it is met", () => {
    const state = withRequest();
    const scoring = startShow(state);
    const first = popMore(scoring, 1);
    expect(state.money).toBe(popMoney(first));
    expect(golds(scoring)).toHaveLength(0);

    const second = popMore(scoring, 1);
    expect(state.money).toBe(popMoney([...first, ...second]) + 40);
    expect(state.requestProgress.done).toBe(true);
    expect(golds(scoring).map((popup) => popup.text)).toEqual(["Request done! +£40"]);
  });

  it("pays once, even after more pops", () => {
    const state = withRequest();
    const scoring = startShow(state);
    const scored = popMore(scoring, 5);
    expect(state.money).toBe(popMoney(scored) + 40);
    expect(golds(scoring)).toHaveLength(1);
  });

  it("keeps the progress over a reload mid-show and doesn't pay a second time", () => {
    const saves: GameState[] = [];
    const state = withRequest();
    popMore(startShow(state, saves), 1);
    const halfway = parseSave(JSON.parse(JSON.stringify(saves.at(-1))));
    expect(halfway.activeRequest).toEqual(twoPops);
    expect(halfway.requestProgress).toEqual({ count: 1, done: false });

    popMore(startShow(state, saves), 1);
    const paid = parseSave(JSON.parse(JSON.stringify(saves.at(-1))));
    expect(paid.requestProgress.done).toBe(true);
    const money = paid.money;
    const scoring = startShow(paid);
    const more = popMore(scoring, 3);
    expect(paid.money).toBe(money + popMoney(more));
    expect(golds(scoring)).toHaveLength(0);
  });

  it("does nothing without an active request", () => {
    const state = createGameState();
    const scoring = startShow(state);
    const scored = popMore(scoring, 6);
    expect(state.money).toBe(popMoney(scored));
    expect(golds(scoring)).toHaveLength(0);
  });

  it("goes to the next show from the shop's request", () => {
    const state = createGameState();
    const shown = state.request;
    const show = createShow(fireworksForShow(state, fireworkTypes, middle));
    const scoring = startShow(state);
    while (!isShowOver(show)) {
      const events = updateShow(show, 0.25, middle);
      handleShowEvents(scoring, events, WIDTH, HEIGHT);
      for (const firework of [...show.active]) {
        handleShowEvents(
          scoring,
          [clickAt(show, fireworkPosition(firework, WIDTH, HEIGHT), WIDTH, HEIGHT)],
          WIDTH,
          HEIGHT,
        );
      }
    }
    expect(state.activeRequest).toBe(shown);
    expect(state.requestProgress.done).toBe(true);
    expect(golds(scoring)).toHaveLength(1);
  });
});
