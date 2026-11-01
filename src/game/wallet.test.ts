import { describe, expect, it } from "vitest";
import { basicRocket } from "../fireworks/basicRocket";
import { createScoring, handleShowEvents } from "../scoring/scoring";
import { clickAt, createShow, fireworkPosition, updateShow } from "./show";
import { createGameState, type GameState } from "./state";
import { venues } from "./venues";
import { payPopsIntoWallet, startShowScoring } from "./wallet";

const WIDTH = 1000;
const HEIGHT = 800;
const middle = () => 0.5;

/** Starts a show at the state's venue and pops its one firework. */
function popOne(state: GameState, saves: GameState[] = []) {
  const scoring = createScoring();
  payPopsIntoWallet(scoring, state, (saved) => saves.push({ ...saved }));
  startShowScoring(scoring, state);
  const show = createShow([basicRocket]);
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
    payPopsIntoWallet(scoring, state);
    const show = createShow([basicRocket]);
    const events = [...updateShow(show, 1, middle), ...updateShow(show, 60, middle)];
    handleShowEvents(scoring, events, WIDTH, HEIGHT);

    expect(events.some((event) => event.kind === "fizzled")).toBe(true);
    expect(state.money).toBe(0);
  });
});
