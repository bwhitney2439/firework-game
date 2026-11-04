import { describe, expect, it } from "vitest";
import { createStats, summarize, type Summary } from "../polish/stats";
import {
  MAX_STARS,
  type Records,
  isNewBest,
  recordAt,
  recordShow,
  starText,
  starsFor,
} from "./records";

/** A summary for a show with `popped` of 10 launched fireworks popped. */
function show(popped: number, money = 0, bestCombo = 0, launched = 10): Summary {
  const stats = createStats();
  Object.assign(stats, { launched, popped, fizzled: launched - popped });
  return summarize(stats, { showMoney: money, bestCombo });
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
    expect(starsFor({ hitRate: 2, launched: 1 })).toBe(MAX_STARS);
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
