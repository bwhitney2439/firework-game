import { describe, expect, it } from "vitest";
import { createStats, summarize } from "./stats";
import { canContinue, summaryRows } from "./summaryScreen";

describe("summary screen", () => {
  it("lists the counts and the hit rate as a percentage", () => {
    const stats = createStats();
    Object.assign(stats, {
      launched: 3,
      popped: 2,
      fizzled: 1,
      bestStreak: 2,
      missedClicks: 5,
    });
    expect(summaryRows(summarize(stats))).toEqual([
      ["Launched", "3"],
      ["Popped", "2"],
      ["Fizzled", "1"],
      ["Hit rate", "67%"],
      ["Best streak", "2"],
      ["Missed clicks", "5"],
    ]);
  });

  it("ignores clicks until it has been open a moment", () => {
    expect(canContinue(0.1)).toBe(false);
    expect(canContinue(1)).toBe(true);
  });
});
