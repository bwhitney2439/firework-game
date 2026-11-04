import { describe, expect, it } from "vitest";
import { createStats, summarize } from "./stats";
import {
  canContinue,
  continueText,
  drawSummaryScreen,
  newBestLabels,
  starScale,
  summaryLayout,
  summaryRows,
} from "./summaryScreen";

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

  it("marks the rows that beat a record", () => {
    expect(newBestLabels({ stars: true, money: false, combo: false })).toEqual([]);
    expect(newBestLabels({ stars: false, money: true, combo: true })).toEqual([
      "Best combo",
      "Money earned",
    ]);
    const labels = summaryRows(summarize(createStats(), { showMoney: 0, bestCombo: 0 })).map(
      ([label]) => label,
    );
    for (const label of newBestLabels({ stars: true, money: true, combo: true })) {
      expect(labels).toContain(label);
    }
  });

  it("pops the stars in one after another, then holds them", () => {
    expect(starScale(0, 0)).toBe(0);
    expect(starScale(0, 5)).toBe(1);
    const time = 0.7;
    expect(starScale(0, time)).toBeGreaterThan(0);
    expect(starScale(2, time)).toBe(0);
    for (let t = 0; t < 2; t += 0.05) expect(starScale(1, t)).toBeLessThanOrEqual(1.25);
  });

  it("says Tap to continue on a touch screen and Click on a desktop", () => {
    expect(continueText(false)).toBe("Click to continue");
    expect(continueText(true)).toBe("Tap to continue");
    const summary = summarize(createStats(), { showMoney: 0, bestCombo: 0 });
    const drawn = (touch?: boolean) => {
      const texts: string[] = [];
      const ctx = new Proxy({} as Record<string | symbol, unknown>, {
        get(target, key) {
          if (key === "fillText") return (text: string) => texts.push(text);
          if (key === "measureText") return (text: string) => ({ width: text.length * 8 });
          return key in target ? target[key] : () => {};
        },
        set(target, key, value) {
          target[key] = value;
          return true;
        },
      }) as unknown as CanvasRenderingContext2D;
      drawSummaryScreen(ctx, summary, 390, 844, 5, undefined, touch);
      return texts;
    };
    expect(drawn()).toContain("Click to continue");
    expect(drawn(false)).toContain("Click to continue");
    expect(drawn(true)).toContain("Tap to continue");
    expect(drawn(true).some((text) => text.includes("Click"))).toBe(false);
  });

  it("ignores clicks until it has been open a moment", () => {
    expect(canContinue(0.1)).toBe(false);
    expect(canContinue(1)).toBe(true);
  });
});

describe("summary layout", () => {
  /** The panel as it ends up on screen, after any shrinking. */
  function onScreen(width: number, height: number, lines = 1) {
    const layout = summaryLayout(width, height, 7, lines);
    const scaled = (value: number, middle: number) => middle + (value - middle) * layout.scale;
    return {
      left: scaled(layout.left, width / 2),
      right: scaled(layout.left + layout.width, width / 2),
      top: scaled(layout.top, height / 2),
      bottom: scaled(layout.top + layout.height, height / 2),
    };
  }

  for (const [width, height] of [
    [390, 700],
    [390, 844],
    [1280, 720],
    [844, 390],
  ]) {
    it(`fits on a ${width}×${height} screen`, () => {
      for (const lines of [1, 2]) {
        const panel = onScreen(width, height, lines);
        expect(panel.left).toBeGreaterThanOrEqual(0);
        expect(panel.top).toBeGreaterThanOrEqual(0);
        expect(panel.right).toBeLessThanOrEqual(width);
        expect(panel.bottom).toBeLessThanOrEqual(height);
      }
    });
  }

  it("puts the stars between the rating line and the rows", () => {
    for (const lines of [1, 2]) {
      const layout = summaryLayout(390, 844, 7, lines);
      expect(layout.starsY - layout.starRadius).toBeGreaterThan(layout.top + 116 + (lines - 1) * 22);
      expect(layout.starsY + layout.starRadius).toBeLessThan(layout.rowsTop - layout.rowSize);
    }
  });

  it("lays out the desktop summary with room for the stars", () => {
    expect(summaryLayout(1280, 720, 7)).toMatchObject({
      left: 430,
      top: 118,
      width: 420,
      height: 484,
      pad: 40,
      titleSize: 34,
      starsY: 272,
      rowsTop: 328,
      scale: 1,
    });
  });

  it("uses smaller text on a phone", () => {
    const phone = summaryLayout(390, 844, 7);
    const desktop = summaryLayout(1280, 720, 7);
    expect(phone.titleSize).toBeLessThan(desktop.titleSize);
    expect(phone.pad).toBeLessThan(desktop.pad);
    expect(phone.width).toBe(358);
  });

  it("moves the rows down when the rating line wraps", () => {
    const one = summaryLayout(390, 844, 7, 1);
    const two = summaryLayout(390, 844, 7, 2);
    expect(two.rowsTop).toBeGreaterThan(one.rowsTop);
    expect(two.height).toBeGreaterThan(one.height);
  });
});
