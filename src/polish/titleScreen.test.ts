import { describe, expect, it } from "vitest";
import { titleBurst, titleLayout } from "./titleScreen";

/** Roughly how wide text is: each character is just over half the font size. */
const measure = (text: string, font: string) => text.length * Number(/(\d+(\.\d+)?)px/.exec(font)![1]) * 0.55;

describe("title screen bursts", () => {
  it("stay in the upper sky", () => {
    for (let t = 0; t < 30; t += 0.37) {
      for (let slot = 0; slot < 3; slot++) {
        const { at, progress } = titleBurst(slot, t, 1000, 800);
        expect(at.x).toBeGreaterThanOrEqual(0);
        expect(at.x).toBeLessThanOrEqual(1000);
        expect(at.y).toBeLessThan(800 * 0.5);
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThan(1);
      }
    }
  });

  it("move somewhere new each cycle", () => {
    const first = titleBurst(0, 0.1, 1000, 800).at;
    const later = titleBurst(0, 2.5, 1000, 800).at;
    expect(later).not.toEqual(first);
  });
});

describe("title screen text", () => {
  for (const [width, height] of [
    [390, 844],
    [390, 700],
    [1280, 720],
  ]) {
    it(`fits across a ${width}×${height} screen without lines running into each other`, () => {
      const lines = titleLayout(width, height, false, measure);
      for (const line of lines) {
        expect(measure(line.text, line.font), line.text).toBeLessThanOrEqual(width - 32);
      }
      for (let i = 1; i < lines.length; i++) {
        expect(lines[i].y).toBeGreaterThan(lines[i - 1].y + 15);
      }
      expect(lines.at(-1)!.y).toBeLessThan(height - 40);
    });
  }

  it("wraps the subtitle on a phone", () => {
    const subtitle = titleLayout(390, 844, false, measure).filter((line) => line.kind === "subtitle");
    expect(subtitle.length).toBeGreaterThan(1);
    expect(subtitle.map((line) => line.text).join(" ")).toBe(
      "Click the fireworks to pop them before they fizzle out",
    );
  });

  it("keeps the desktop title screen as it was", () => {
    const lines = titleLayout(1280, 720, true, measure);
    expect(lines.map(({ text, y }) => [text, Math.round(y)])).toEqual([
      ["Bonfire Night Popper", 302],
      ["Click the fireworks to pop them before they fizzle out", 360],
      ["Click to start", 416],
      ["Press M to turn sound on", 450],
    ]);
  });
});
