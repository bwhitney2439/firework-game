import { describe, expect, it } from "vitest";
import { basicRocket } from "./fireworks/basicRocket";
import { fireworkTypes } from "./fireworks/registry";
import type { FireworkType } from "./fireworks/types";
import { createGameState } from "./game/state";
import { venues } from "./game/venues";
import { type Box, type ShopButton, requestCardBox, shopButtons, shopClick } from "./shopScreen";

const WIDTH = 1000;
const HEIGHT = 800;
const sparkler: FireworkType = { ...basicRocket, id: "sparkler", name: "Sparkler", price: 5 };
const types = [basicRocket, sparkler];

function centre(button: ShopButton) {
  return { x: button.x + button.width / 2, y: button.y + button.height / 2 };
}

function find(state = createGameState(), kind: string) {
  return shopButtons(state, types, WIDTH, HEIGHT).find(
    (button) => button.action.kind === kind,
  )!;
}

describe("shop screen", () => {
  it("has a buy button with the price for each paid type", () => {
    const buys = shopButtons(createGameState(), types, WIDTH, HEIGHT).filter(
      (button) => button.action.kind === "buy",
    );
    expect(buys.map((button) => button.label)).toEqual(["Buy £5"]);
  });

  it("buys when the buy button is clicked", () => {
    const state = { ...createGameState(), money: 10 };
    const result = shopClick(state, types, centre(find(state, "buy")), WIDTH, HEIGHT);
    expect(result).toBe("changed");
    expect(state.stock).toEqual({ sparkler: 1 });
  });

  it("ignores disabled buttons", () => {
    const state = createGameState();
    expect(find(state, "buy").enabled).toBe(false);
    expect(shopClick(state, types, centre(find(state, "buy")), WIDTH, HEIGHT)).toBeNull();
  });

  it("refunds with the minus button", () => {
    const state = { ...createGameState(), stock: { sparkler: 1 } };
    expect(shopClick(state, types, centre(find(state, "refund")), WIDTH, HEIGHT)).toBe(
      "changed",
    );
    expect(state.money).toBe(5);
  });

  it("disables the minus button for fireworks that went into a show", () => {
    const state = { ...createGameState(), stock: { sparkler: 1 }, lockedStock: { sparkler: 1 } };
    expect(find(state, "refund").enabled).toBe(false);
    expect(shopClick(state, types, centre(find(state, "refund")), WIDTH, HEIGHT)).toBeNull();
    expect(state.money).toBe(0);
  });

  it("upgrades the venue", () => {
    const state = { ...createGameState(), money: 1000 };
    expect(find(state, "upgrade").label).toBe("Move to Village green: £300");
    shopClick(state, types, centre(find(state, "upgrade")), WIDTH, HEIGHT);
    expect(state.venueId).toBe(venues[1].id);
  });

  it("starts the show", () => {
    const state = createGameState();
    expect(shopClick(state, types, centre(find(state, "start")), WIDTH, HEIGHT)).toBe(
      "start",
    );
  });

  it("resets only after confirming", () => {
    const state = { ...createGameState(), money: 50 };
    const at = centre(find(state, "new-game"));
    expect(shopClick(state, types, at, WIDTH, HEIGHT, () => false)).toBeNull();
    expect(state.money).toBe(50);
    expect(shopClick(state, types, at, WIDTH, HEIGHT, () => true)).toBe("changed");
    expect(state).toEqual(createGameState());
  });

  it("does nothing for a click on empty space", () => {
    expect(shopClick(createGameState(), types, { x: 1, y: 1 }, WIDTH, HEIGHT)).toBeNull();
  });
});

describe("the booker's request card", () => {
  const overlaps = (a: Box, b: Box) =>
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  const fiveRows = [
    basicRocket,
    ...Array.from({ length: 5 }, (_, i) => ({ ...sparkler, id: `sparkler-${i}` })),
  ];

  for (const [width, height, list] of [
    [1280, 720, fireworkTypes],
    [1280, 720, fiveRows],
    [WIDTH, HEIGHT, types],
  ] as const) {
    it(`sits between the list and the Start button at ${width}×${height} with ${list.length} types`, () => {
      const state = createGameState();
      const card = requestCardBox([...list], width, height)!;
      expect(card).not.toBeNull();
      const buttons = shopButtons(state, [...list], width, height);
      const lowestRow = Math.max(
        ...buttons.filter((button) => button.action.kind === "buy").map((b) => b.y + b.height),
      );
      expect(card.y).toBeGreaterThan(lowestRow);
      for (const button of buttons) expect(overlaps(card, button)).toBe(false);
      expect(card.x + card.width).toBeLessThanOrEqual(width);
    });
  }

  it("is left out when the screen is too short for it", () => {
    expect(requestCardBox(fireworkTypes, 1280, 480)).toBeNull();
  });

  it("doesn't catch clicks", () => {
    const card = requestCardBox(types, WIDTH, HEIGHT)!;
    const at = { x: card.x + 20, y: card.y + card.height / 2 };
    expect(shopClick(createGameState(), types, at, WIDTH, HEIGHT)).toBeNull();
  });
});
