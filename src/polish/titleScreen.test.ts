import { describe, expect, it } from "vitest";
import { venues } from "../game/venues";
import { bestShowText, titleBurst, titleLayout } from "./titleScreen";

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

/** A best show at the most expensive venue, so its line is as long as it gets. */
const best = { venue: venues.at(-1)!, money: 1_234_567 };

describe("title screen text", () => {
  for (const [width, height] of [
    [390, 844],
    [390, 700],
    [1280, 720],
  ]) {
    for (const [label, options] of [
      ["", {}],
      [" with touch wording and a best show", { touch: true, best }],
      [" with a best show", { best }],
    ] as const) {
      it(`fits across a ${width}×${height} screen${label} without lines running into each other`, () => {
        const lines = titleLayout(width, height, false, measure, options);
        for (const line of lines) {
          expect(measure(line.text, line.font), line.text).toBeLessThanOrEqual(width - 32);
        }
        for (let i = 1; i < lines.length; i++) {
          expect(lines[i].y).toBeGreaterThan(lines[i - 1].y + 15);
        }
        expect(lines.at(-1)!.y).toBeLessThan(height - 40);
      });
    }
  }

  it("wraps the subtitle on a phone", () => {
    const subtitle = titleLayout(390, 844, false, measure).filter((line) => line.kind === "subtitle");
    expect(subtitle.length).toBeGreaterThan(1);
    expect(subtitle.map((line) => line.text).join(" ")).toBe(
      "Click the fireworks to pop them before they fizzle out",
    );
  });

  it("warns about the sky lanterns under the subtitle", () => {
    const lines = titleLayout(390, 844, false, measure);
    const lantern = lines.findIndex((line) => line.kind === "lantern");
    expect(lines[lantern].text).toBe("Don't pop the sky lanterns!");
    expect(lines[lantern - 1].kind).toBe("subtitle");
  });

  it("keeps the desktop title screen as it was, plus the lantern warning", () => {
    const lines = titleLayout(1280, 720, true, measure);
    expect(lines.map(({ text, y }) => [text, Math.round(y)])).toEqual([
      ["Bonfire Night Popper", 302],
      ["Click the fireworks to pop them before they fizzle out", 360],
      ["Don't pop the sky lanterns!", 392],
      ["Click to start", 448],
      ["Press M to turn sound on", 482],
    ]);
  });

  it("says Tap and points to the speaker button on a touch screen", () => {
    const lines = titleLayout(390, 844, false, measure, { touch: true });
    const text = (kind: string) =>
      lines.filter((line) => line.kind === kind).map((line) => line.text).join(" ");
    expect(text("subtitle")).toBe("Tap the fireworks to pop them before they fizzle out");
    expect(text("start")).toBe("Tap to start");
    expect(text("sound")).toBe("Tap the speaker button to turn sound off");
    expect(lines.some((line) => /Click|Press M/.test(line.text))).toBe(false);
    expect(titleLayout(390, 844, true, measure, { touch: true }).at(-1)!.text).toBe(
      "Tap the speaker button to turn sound on",
    );
  });

  it("shows the best show between the lantern warning and the start line", () => {
    const lines = titleLayout(1280, 720, false, measure, { best: { venue: venues[1], money: 1250 } });
    expect(lines.map(({ text, y }) => [text, Math.round(y)])).toEqual([
      ["Bonfire Night Popper", 302],
      ["Click the fireworks to pop them before they fizzle out", 360],
      ["Don't pop the sky lanterns!", 392],
      ["Your best show: £1,250  ·  Village green", 424],
      ["Click to start", 480],
      ["Press M to turn sound off", 514],
    ]);
    expect(lines.find((line) => line.kind === "best")!.text).toBe(
      bestShowText({ venue: venues[1], money: 1250 }),
    );
  });

  it("wraps the best show between the money and the venue on a narrow phone", () => {
    const lines = titleLayout(320, 640, false, measure, { best }).filter((line) => line.kind === "best");
    expect(lines.map((line) => line.text)).toEqual(["Your best show: £1,234,567", "City stadium"]);
  });

  it("has no best show line without a record", () => {
    for (const options of [{}, { best: null }, { touch: true }]) {
      const lines = titleLayout(390, 844, false, measure, options);
      expect(lines.some((line) => line.kind === "best")).toBe(false);
    }
  });
});
