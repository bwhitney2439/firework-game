import { describe, expect, it } from "vitest";
import { basicRocket } from "../fireworks/basicRocket";
import {
  PERFECT_MAX_MISSES_PER_LAUNCH,
  SPECTACULAR_MAX_MISSES_PER_LAUNCH,
  createStats,
  recordEvent,
  recordMiss,
  stepShow,
  summarize,
  type Summary,
} from "../polish/stats";
import { createScoring, handleShowClick } from "../scoring/scoring";
import { parseSave } from "./save";
import { canUpgradeVenue } from "./shop";
import { createShow, fireworkPosition } from "./show";
import { createGameState } from "./state";
import { venues } from "./venues";
import {
  MAX_STARS,
  type Records,
  bestShow,
  isNewBest,
  recordAt,
  recordShow,
  starText,
  starsFor,
} from "./records";

/**
 * A summary for a show with `popped` of 10 launched fireworks popped and
 * `missedClicks` clicks on empty sky.
 */
function show(
  popped: number,
  money = 0,
  bestCombo = 0,
  launched = 10,
  missedClicks = 0,
): Summary {
  const stats = createStats();
  Object.assign(stats, { launched, popped, fizzled: launched - popped, missedClicks });
  return summarize(stats, { showMoney: money, bestCombo });
}

/** Always the middle of the range, so launches are steady. */
const middle = () => 0.5;

/**
 * Plays a show of `count` rockets through handleShowClick, the way main.ts
 * does, popping every rocket. Each step also clicks `strayPerStep` times on
 * empty sky, so a high number is a player mashing.
 */
function playClicking(count: number, strayPerStep: number): Summary {
  const played = createShow(Array.from({ length: count }, () => basicRocket));
  const stats = createStats();
  const scoring = createScoring();
  const click = (at: { x: number; y: number }) => {
    const result = handleShowClick(scoring, played, at, 1000, 800);
    if (result.kind === "missed") recordMiss(stats);
    else if (result.kind === "popped") recordEvent(stats, result.event);
  };
  for (let t = 0; t < 40; t += 0.1) {
    stepShow(played, stats, 0.1, middle);
    for (let i = 0; i < strayPerStep; i++) click({ x: 10 + i, y: 10 });
    for (const firework of [...played.active]) click(fireworkPosition(firework, 1000, 800));
  }
  return summarize(stats, { showMoney: 0, bestCombo: 0 });
}

describe("stars for a show", () => {
  it("gives 1 star at 50%, 2 at 80% and 3 at 100%", () => {
    expect([0, 4, 5, 7, 8, 9, 10].map((popped) => starsFor(show(popped)))).toEqual([
      0, 0, 1, 1, 2, 2, 3,
    ]);
  });

  it("gives none when nothing was launched", () => {
    expect(starsFor(show(0, 0, 0, 0))).toBe(0);
  });

  it("never gives more than three", () => {
    expect(starsFor({ hitRate: 2, launched: 1, missedClicks: 0 })).toBe(MAX_STARS);
  });
});

describe("stars and missed clicks", () => {
  it("gives careful play the same stars as before", () => {
    const careful = 10 * PERFECT_MAX_MISSES_PER_LAUNCH;
    for (const misses of [0, 1, careful]) {
      expect(
        [0, 4, 5, 7, 8, 9, 10].map((popped) => starsFor(show(popped, 0, 0, 10, misses))),
        `${misses} misses`,
      ).toEqual([0, 0, 1, 1, 2, 2, 3]);
    }
  });

  it("needs few misses for 3 stars, as a perfect show does", () => {
    expect(starsFor(show(10, 0, 0, 10, 10 * PERFECT_MAX_MISSES_PER_LAUNCH + 1))).toBe(2);
    expect(starsFor(show(10, 0, 0, 10, 10 * SPECTACULAR_MAX_MISSES_PER_LAUNCH))).toBe(2);
  });

  it("gives a masher 1 star at most, however many pops", () => {
    const mashing = 10 * SPECTACULAR_MAX_MISSES_PER_LAUNCH + 1;
    expect(starsFor(show(10, 0, 0, 10, mashing))).toBe(1);
    expect(starsFor(show(8, 0, 0, 10, 200))).toBe(1);
    expect(starsFor(show(4, 0, 0, 10, 200))).toBe(0);
  });

  it("matches the summary rating: 3 stars only for a perfect show, 2 for spectacular", () => {
    for (const popped of [5, 8, 10]) {
      for (const misses of [0, 2, 3, 5, 6, 50]) {
        const summary = show(popped, 0, 0, 10, misses);
        const stars = starsFor(summary);
        expect(stars === 3, `${popped} pops, ${misses} misses`).toBe(
          summary.rating.title === "Perfect show!",
        );
        expect(stars >= 2, `${popped} pops, ${misses} misses`).toBe(
          ["Perfect show!", "Spectacular!"].includes(summary.rating.title),
        );
      }
    }
  });

  it("doesn't let a mashing bot that pops everything leave the venue", () => {
    const summary = playClicking(10, 3);
    expect(summary.hitRate).toBe(1);
    expect(summary.missedClicks).toBeGreaterThan(10);
    expect(starsFor(summary)).toBe(1);

    const state = { ...createGameState(), money: 10000 };
    recordShow(state.records, state.venueId, summary);
    expect(recordAt(state.records, state.venueId).stars).toBeLessThan(venues[0].starsToLeave);
    expect(canUpgradeVenue(state)).toBe("needs-stars");
  });

  it("gives careful play that pops everything 3 stars and lets it move on", () => {
    const summary = playClicking(10, 0);
    expect(summary.missedClicks).toBe(0);
    expect(starsFor(summary)).toBe(3);

    const state = { ...createGameState(), money: 10000 };
    recordShow(state.records, state.venueId, summary);
    expect(canUpgradeVenue(state)).toBe("ok");
  });

  it("keeps stars already saved, even after a mashing show", () => {
    const state = parseSave({
      money: 10000,
      records: { "back-garden": { stars: 3, bestMoney: 120, bestCombo: 9 } },
    });
    expect(state.records["back-garden"]).toEqual({ stars: 3, bestMoney: 120, bestCombo: 9 });
    expect(recordShow(state.records, "back-garden", show(10, 0, 0, 10, 200)).stars).toBe(false);
    expect(state.records["back-garden"].stars).toBe(3);
    expect(canUpgradeVenue(state)).toBe("ok");
  });
});

describe("recording a show", () => {
  it("starts a record for a new venue and calls each part a new best", () => {
    const records: Records = {};
    expect(recordShow(records, "back-garden", show(8, 120, 9))).toEqual({
      stars: true,
      money: true,
      combo: true,
    });
    expect(records["back-garden"]).toEqual({ stars: 2, bestMoney: 120, bestCombo: 9 });
  });

  it("only goes up", () => {
    const records: Records = { "back-garden": { stars: 2, bestMoney: 120, bestCombo: 9 } };
    const bests = recordShow(records, "back-garden", show(10, 60, 4));
    expect(bests).toEqual({ stars: true, money: false, combo: false });
    expect(records["back-garden"]).toEqual({ stars: 3, bestMoney: 120, bestCombo: 9 });

    expect(recordShow(records, "back-garden", show(2, 200, 2))).toEqual({
      stars: false,
      money: true,
      combo: false,
    });
    expect(records["back-garden"]).toEqual({ stars: 3, bestMoney: 200, bestCombo: 9 });
  });

  it("doesn't call a tie a new best", () => {
    const records: Records = { "back-garden": { stars: 2, bestMoney: 120, bestCombo: 9 } };
    const bests = recordShow(records, "back-garden", show(8, 120, 9));
    expect(isNewBest(bests)).toBe(false);
  });

  it("keeps each venue's records apart", () => {
    const records: Records = {};
    recordShow(records, "back-garden", show(10, 50, 10));
    recordShow(records, "village-green", show(5, 20, 3));
    expect(recordAt(records, "back-garden").stars).toBe(3);
    expect(recordAt(records, "village-green").stars).toBe(1);
    expect(recordAt(records, "town-park")).toEqual({ stars: 0, bestMoney: 0, bestCombo: 0 });
  });

  it("gives no new best for an empty show at a new venue", () => {
    expect(isNewBest(recordShow({}, "back-garden", show(0, 0, 0, 0)))).toBe(false);
  });
});

describe("star text", () => {
  it("fills the earned stars", () => {
    expect([0, 2, 3, 5].map(starText)).toEqual(["☆☆☆", "★★☆", "★★★", "★★★"]);
  });
});

describe("best show", () => {
  it("is null with no records", () => {
    expect(bestShow({}, venues)).toBeNull();
  });

  it("is null when no show has made money yet", () => {
    // An old save gets stars for venues it has passed, but no money.
    const records: Records = { "back-garden": { stars: 2, bestMoney: 0, bestCombo: 0 } };
    expect(bestShow(records, venues)).toBeNull();
  });

  it("is the venue record with the most money", () => {
    const records: Records = {
      "back-garden": { stars: 3, bestMoney: 180, bestCombo: 12 },
      "village-green": { stars: 1, bestMoney: 420, bestCombo: 5 },
      "town-park": { stars: 0, bestMoney: 90, bestCombo: 2 },
    };
    expect(bestShow(records, venues)).toEqual({ venue: venues[1], money: 420 });
  });

  it("goes to the bigger venue on a tie", () => {
    const records: Records = {
      "back-garden": { stars: 3, bestMoney: 300, bestCombo: 12 },
      "village-green": { stars: 1, bestMoney: 300, bestCombo: 5 },
    };
    expect(bestShow(records, venues)?.venue).toBe(venues[1]);
  });

  it("ignores records for venues it doesn't know", () => {
    const records: Records = { "moon-base": { stars: 3, bestMoney: 9999, bestCombo: 50 } };
    expect(bestShow(records, venues)).toBeNull();
  });

  it("follows recorded shows", () => {
    const records: Records = {};
    recordShow(records, "back-garden", show(8, 120, 9));
    expect(bestShow(records, venues)).toEqual({ venue: venues[0], money: 120 });
  });
});
