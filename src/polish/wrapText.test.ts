import { describe, expect, it } from "vitest";
import { isNarrow, wrapText } from "./wrapText";

/** Every character is 10 px wide. */
const measure = (text: string) => text.length * 10;

describe("wrapText", () => {
  it("keeps short text on one line", () => {
    expect(wrapText("Pop them all", 200, "", measure)).toEqual(["Pop them all"]);
  });

  it("breaks between words so no line is too wide", () => {
    const lines = wrapText("Click the fireworks to pop them", 100, "", measure);
    expect(lines).toEqual(["Click the", "fireworks", "to pop", "them"]);
    for (const line of lines) expect(measure(line)).toBeLessThanOrEqual(100);
  });

  it("gives a word that is too wide a line of its own", () => {
    expect(wrapText("a Chrysanthemum b", 50, "", measure)).toEqual(["a", "Chrysanthemum", "b"]);
  });

  it("only breaks at the separator it is given", () => {
    expect(wrapText("Crowd 12  ·  1× pay per pop", 150, "", measure, "  ·  ")).toEqual([
      "Crowd 12",
      "1× pay per pop",
    ]);
  });
});

describe("isNarrow", () => {
  it("is true under 520 px", () => {
    expect(isNarrow(390)).toBe(true);
    expect(isNarrow(520)).toBe(false);
  });
});
