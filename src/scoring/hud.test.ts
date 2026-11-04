import { describe, expect, it } from "vitest";
import { HUD_WIDTH, drawScoreHud, hudLayout } from "./hud";
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

  it("keeps the desktop HUD as it was", () => {
    expect(hudLayout(1280)).toEqual({ right: 1264, meterLeft: 1084, meterWidth: 180, walletSize: 22 });
  });

  it("gets smaller on a phone and stays on screen inside HUD_WIDTH", () => {
    const layout = hudLayout(390);
    expect(layout.meterWidth).toBeLessThan(hudLayout(1280).meterWidth);
    expect(layout.right).toBeLessThanOrEqual(390);
    expect(layout.meterLeft).toBeGreaterThanOrEqual(390 - HUD_WIDTH);
    // Leaves the left two thirds of the top row for the counts line.
    expect(layout.meterLeft).toBeGreaterThan(390 * 0.6);
  });
});
