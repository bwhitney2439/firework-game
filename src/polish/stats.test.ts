import { describe, expect, it } from "vitest";
import { basicRocket } from "../fireworks/basicRocket";
import { crossette } from "../fireworks/crossette";
import { skyLantern } from "../fireworks/skyLantern";
import {
  LAUNCH_INTERVAL,
  type ShowEvent,
  clickAt,
  createShow,
  fireworkPosition,
  isAvoid,
} from "../game/show";
import { createScoring, handleShowClick } from "../scoring/scoring";
import { LANTERN_FIRST_DELAY } from "../scoring/tuning";
import {
  PERFECT_MAX_MISSES_PER_LAUNCH,
  SPECTACULAR_MAX_MISSES_PER_LAUNCH,
  SUMMARY_DELAY,
  createStats,
  fewMisses,
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
    expect(rate(1, 10, 0).title).toBe("Perfect show!");
    expect(rate(0.8, 10, 0).title).toBe("Spectacular!");
    expect(rate(0.5, 10, 0).title).toBe("Crowd pleaser");
    expect(rate(0.1, 10, 0).title).toBe("A damp squib");
    expect(rate(0, 10, 0).title).toBe("Total washout");
    expect(rate(0, 0, 0).title).toBe("No show tonight");
  });
});

describe("rating missed clicks", () => {
  it("still rates careful play with a few misses as perfect", () => {
    expect(rate(1, 10, 10 * PERFECT_MAX_MISSES_PER_LAUNCH).title).toBe("Perfect show!");
    expect(rate(1, 10, 1).title).toBe("Perfect show!");
  });

  it("drops a perfect hit rate to spectacular past the perfect miss limit", () => {
    expect(rate(1, 10, 10 * PERFECT_MAX_MISSES_PER_LAUNCH + 1).title).toBe("Spectacular!");
    expect(rate(1, 10, 10 * SPECTACULAR_MAX_MISSES_PER_LAUNCH).title).toBe("Spectacular!");
  });

  it("rates mashing with a perfect hit rate no higher than a crowd pleaser", () => {
    expect(rate(1, 10, 10 * SPECTACULAR_MAX_MISSES_PER_LAUNCH + 1).title).toBe("Crowd pleaser");
    expect(rate(1, 10, 200).title).toBe("Crowd pleaser");
    expect(rate(0.9, 10, 200).title).toBe("Crowd pleaser");
  });

  it("shares its miss limit check with the venue stars", () => {
    expect(fewMisses(10, 2, PERFECT_MAX_MISSES_PER_LAUNCH)).toBe(true);
    expect(fewMisses(10, 3, PERFECT_MAX_MISSES_PER_LAUNCH)).toBe(false);
    expect(fewMisses(10, 5, SPECTACULAR_MAX_MISSES_PER_LAUNCH)).toBe(true);
    expect(fewMisses(10, 6, SPECTACULAR_MAX_MISSES_PER_LAUNCH)).toBe(false);
    expect(fewMisses(10, 1000, Infinity)).toBe(true);
    expect(fewMisses(0, 0, Infinity)).toBe(false);
  });

  it("leaves the lower ratings to the hit rate", () => {
    expect(rate(0.1, 10, 200).title).toBe("A damp squib");
    expect(rate(0, 10, 200).title).toBe("Total washout");
    expect(rate(0, 0, 200).title).toBe("No show tonight");
  });

  /**
   * Plays a show of rockets through handleShowClick, the way main.ts does,
   * popping every rocket. Each step also clicks `stray` times on empty sky.
   */
  function playClicking(count: number, strayPerStep: number) {
    const show = createShow(Array.from({ length: count }, () => basicRocket));
    const stats = createStats();
    const scoring = createScoring();
    const click = (at: { x: number; y: number }) => {
      const result = handleShowClick(scoring, show, at, 1000, 800);
      if (result.kind === "missed") recordMiss(stats);
      else if (result.kind === "popped") recordEvent(stats, result.event);
    };
    for (let t = 0; t < 40; t += 0.1) {
      stepShow(show, stats, 0.1, middle);
      for (let i = 0; i < strayPerStep; i++) click({ x: 10 + i, y: 10 });
      for (const firework of [...show.active]) click(fireworkPosition(firework, 1000, 800));
    }
    return summarize(stats, noScore);
  }

  it("doesn't rate a mashing bot that pops everything as perfect", () => {
    const summary = playClicking(10, 3);
    expect(summary.hitRate).toBe(1);
    expect(summary.missedClicks).toBeGreaterThan(10);
    expect(summary.rating.title).not.toBe("Perfect show!");
    expect(summary.rating.title).toBe("Crowd pleaser");
  });

  it("rates careful play that pops everything as perfect", () => {
    const summary = playClicking(10, 0);
    expect(summary.hitRate).toBe(1);
    expect(summary.missedClicks).toBe(0);
    expect(summary.rating.title).toBe("Perfect show!");
  });

  it("doesn't count clicks after the show as misses", () => {
    const show = createShow([]);
    const stats = createStats();
    const result = handleShowClick(createScoring(), show, { x: 10, y: 10 }, 1000, 800);
    if (result.kind === "missed") recordMiss(stats);
    expect(stats.missedClicks).toBe(0);
  });
});

describe("crossette stars", () => {
  /** Plays a show of crossettes, popping each one and all of its stars. */
  function popEverything(count: number) {
    const show = createShow(Array.from({ length: count }, () => crossette));
    const stats = createStats();
    const popFirst = () => {
      const at = fireworkPosition(show.active[0], 1000, 800);
      recordEvent(stats, clickAt(show, at, 1000, 800)!);
    };
    for (let i = 0; i < count; i++) {
      stepShow(show, stats, i === 0 ? 0.5 : LAUNCH_INTERVAL, middle);
      popFirst();
      while (show.active.length > 0) popFirst();
    }
    return stats;
  }

  it("counts star pops as bonus stars, not as pops", () => {
    const stats = popEverything(1);
    expect(stats.launched).toBe(1);
    expect(stats.popped).toBe(1);
    expect(stats.bonusStars).toBe(crossette.split!.count);
    expect(summarize(stats, noScore).bonusStars).toBe(crossette.split!.count);
  });

  it("never takes the hit rate over 1", () => {
    const summary = summarize(popEverything(3), noScore);
    expect(summary.hitRate).toBe(1);
    expect(summary.rating.title).toBe("Perfect show!");
  });

  it("doesn't count stars that fade as fizzles", () => {
    const show = createShow([crossette]);
    const stats = createStats();
    stepShow(show, stats, 0.5, middle);
    const at = fireworkPosition(show.active[0], 1000, 800);
    recordEvent(stats, clickAt(show, at, 1000, 800)!);
    stepShow(show, stats, 5, middle);
    expect(stats.fizzled).toBe(0);
    expect(summarize(stats, noScore).hitRate).toBe(1);
  });
});

describe("sky lanterns", () => {
  const lantern = { type: skyLantern, launchX: 0.5, age: 1 };
  const lanternPop: ShowEvent = { kind: "popped", firework: lantern, at: { x: 0, y: 0 } };

  it("counts a popped lantern on its own, not as a pop", () => {
    const stats = createStats();
    recordEvent(stats, lanternPop);
    expect(stats.lanternsPopped).toBe(1);
    expect(stats.popped).toBe(0);
    expect(stats.fizzled).toBe(0);
    expect(stats.bonusStars).toBe(0);
    expect(summarize(stats, noScore).lanternsPopped).toBe(1);
  });

  /** Plays a show of rockets, popping every rocket and, if asked, every lantern. */
  function playShow(count: number, popLanterns: boolean) {
    const show = createShow(Array.from({ length: count }, () => basicRocket));
    const stats = createStats();
    let launched = 0;
    for (let t = 0; t < 40; t += 0.1) {
      launched += stepShow(show, stats, 0.1, middle).launched;
      for (const firework of [...show.active]) {
        if (isAvoid(firework) && !popLanterns) continue;
        const at = fireworkPosition(firework, 1000, 800);
        const event = clickAt(show, at, 1000, 800);
        if (event) recordEvent(stats, event);
      }
    }
    return { stats, launched };
  }

  it("aren't counted as launched", () => {
    const { stats, launched } = playShow(10, false);
    expect(stats.launched).toBe(10);
    expect(launched).toBe(10);
  });

  it("can be left alone for a perfect show at no cost", () => {
    const { stats } = playShow(10, false);
    expect(stats.fizzled).toBe(0);
    expect(stats.lanternsPopped).toBe(0);
    expect(summarize(stats, noScore).rating.title).toBe("Perfect show!");
  });

  it("don't spoil the hit rate even when popped", () => {
    const { stats } = playShow(10, true);
    expect(stats.lanternsPopped).toBeGreaterThan(0);
    expect(stats.popped).toBe(10);
    expect(summarize(stats, noScore).hitRate).toBe(1);
  });

  it("aren't counted as fizzled when they float away", () => {
    const show = createShow(Array.from({ length: 6 }, () => basicRocket));
    const stats = createStats();
    stepShow(show, stats, LANTERN_FIRST_DELAY, middle);
    expect(show.active.some(isAvoid)).toBe(true);
    for (let t = 0; t < 30; t += 0.1) stepShow(show, stats, 0.1, middle);
    expect(show.active).toHaveLength(0);
    expect(stats.fizzled).toBe(6);
  });
});
