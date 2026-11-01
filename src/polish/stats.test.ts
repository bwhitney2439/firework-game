import { describe, expect, it } from "vitest";
import { basicRocket } from "../fireworks/basicRocket";
import {
  LAUNCH_INTERVAL,
  type ShowEvent,
  clickAt,
  createShow,
} from "../game/show";
import {
  SUMMARY_DELAY,
  createStats,
  isSummaryDue,
  rate,
  recordEvent,
  recordMiss,
  stepShow,
  summarize,
} from "./stats";

const middle = () => 0.5;
const flightTime = 1 / basicRocket.riseSpeed;
const firework = { type: basicRocket, launchX: 0.5, age: 1 };
const pop: ShowEvent = { kind: "popped", firework, at: { x: 0, y: 0 } };
const fizzle: ShowEvent = { kind: "fizzled", firework };

describe("recording events", () => {
  it("counts pops and fizzles", () => {
    const stats = createStats();
    recordEvent(stats, pop);
    recordEvent(stats, pop);
    recordEvent(stats, fizzle);
    expect(stats.popped).toBe(2);
    expect(stats.fizzled).toBe(1);
  });

  it("keeps the best streak after a fizzle breaks it", () => {
    const stats = createStats();
    for (const event of [pop, pop, pop, fizzle, pop]) recordEvent(stats, event);
    expect(stats.streak).toBe(1);
    expect(stats.bestStreak).toBe(3);
  });

  it("counts missed clicks", () => {
    const stats = createStats();
    recordMiss(stats);
    recordMiss(stats);
    expect(stats.missedClicks).toBe(2);
  });
});

describe("stepShow", () => {
  it("reports launches as they happen", () => {
    const show = createShow([basicRocket, basicRocket]);
    const stats = createStats();
    expect(stepShow(show, stats, 0.01, middle).launched).toBe(1);
    expect(stepShow(show, stats, 0.01, middle).launched).toBe(0);
    expect(stepShow(show, stats, LAUNCH_INTERVAL, middle).launched).toBe(1);
    expect(stats.launched).toBe(2);
  });

  it("records fizzles from the show", () => {
    const show = createShow([basicRocket]);
    const stats = createStats();
    stepShow(show, stats, 0.01, middle);
    const step = stepShow(show, stats, flightTime, middle);
    expect(step.events).toEqual([expect.objectContaining({ kind: "fizzled" })]);
    expect(stats.fizzled).toBe(1);
  });

  it("makes the summary due a moment after the show ends", () => {
    const show = createShow([basicRocket]);
    const stats = createStats();
    stepShow(show, stats, 0.01, middle);
    const at = { x: 500, y: 800 - 0.01 * basicRocket.riseSpeed * 720 };
    recordEvent(stats, clickAt(show, at, 1000, 800)!);
    stepShow(show, stats, 0.01, middle);
    expect(isSummaryDue(stats)).toBe(false);
    stepShow(show, stats, SUMMARY_DELAY, middle);
    expect(isSummaryDue(stats)).toBe(true);
  });

  it("is not due while fireworks are still to come", () => {
    const show = createShow([basicRocket, basicRocket]);
    const stats = createStats();
    stepShow(show, stats, SUMMARY_DELAY + 0.1, middle);
    expect(isSummaryDue(stats)).toBe(false);
  });
});

const noScore = { showMoney: 0, bestCombo: 0 };

describe("summary", () => {
  it("works out the hit rate from launches", () => {
    const stats = createStats();
    stats.launched = 4;
    stats.popped = 3;
    stats.fizzled = 1;
    expect(summarize(stats, noScore)).toMatchObject({
      launched: 4,
      popped: 3,
      fizzled: 1,
      hitRate: 0.75,
    });
  });

  it("takes the show money and best combo from the show's score", () => {
    const summary = summarize(createStats(), { showMoney: 1234, bestCombo: 5 });
    expect(summary.money).toBe(1234);
    expect(summary.bestCombo).toBe(5);
  });

  it("has a hit rate of zero when nothing launched", () => {
    expect(summarize(createStats(), noScore).hitRate).toBe(0);
  });

  it("rates the show by hit rate", () => {
    expect(rate(1, 10).title).toBe("Perfect show!");
    expect(rate(0.8, 10).title).toBe("Spectacular!");
    expect(rate(0.5, 10).title).toBe("Crowd pleaser");
    expect(rate(0.1, 10).title).toBe("A damp squib");
    expect(rate(0, 10).title).toBe("Total washout");
    expect(rate(0, 0).title).toBe("No show tonight");
  });
});
