import { describe, expect, it } from "vitest";
import { drawScoreHud } from "./hud";
import { createScore } from "./score";

/** A canvas context that only records the text drawn on it. */
function textRecorder() {
  const texts: string[] = [];
  const ctx = new Proxy(
    {},
    {
      get: (_target, key) => (key === "fillText" ? (text: string) => texts.push(text) : () => {}),
      set: () => true,
    },
  ) as CanvasRenderingContext2D;
  return { ctx, texts };
}

describe("score HUD", () => {
  it("shows the venue and the wallet with a thousands separator", () => {
    const { ctx, texts } = textRecorder();
    drawScoreHud(ctx, createScore(), 1000, 12500, "Village green");
    expect(texts).toContain("Village green");
    expect(texts).toContain("£12,500");
  });
});
