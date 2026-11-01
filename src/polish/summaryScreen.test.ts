import { describe, expect, it } from "vitest";
import { createStats, summarize } from "./stats";
import { canContinue, summaryRows } from "./summaryScreen";

describe("summary screen", () => {
  it("lists the counts, the hit rate as a percentage and the show money", () => {
    const stats = createStats();
    Object.assign(stats, {
      launched: 3,
      popped: 2,
      fizzled: 1,
      missedClicks: 5,
    });
    const score = { showMoney: 1250, bestCombo: 3 };
    expect(summaryRows(summarize(stats, score))).toEqual([
      ["Launched", "3"],
      ["Popped", "2"],
      ["Fizzled", "1"],
      ["Hit rate", "67%"],
      ["Best combo", "3"],
      ["Missed clicks", "5"],
      ["Money earned", "£1,250"],
    ]);
  });

  it("ignores clicks until it has been open a moment", () => {
    expect(canContinue(0.1)).toBe(false);
    expect(canContinue(1)).toBe(true);
  });
});
