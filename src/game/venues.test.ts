import { describe, expect, it } from "vitest";
import { nextVenue, venueById, venues } from "./venues";

describe("venues", () => {
  it("has the four tiers in order", () => {
    expect(venues.map((venue) => venue.name)).toEqual([
      "Back garden",
      "Village green",
      "Town park",
      "City stadium",
    ]);
  });

  it("grows the cap, crowd, multiplier and price with each tier", () => {
    for (let i = 1; i < venues.length; i++) {
      expect(venues[i].fireworkCap).toBeGreaterThan(venues[i - 1].fireworkCap);
      expect(venues[i].crowd).toBeGreaterThan(venues[i - 1].crowd);
      expect(venues[i].moneyMultiplier).toBeGreaterThan(venues[i - 1].moneyMultiplier);
      expect(venues[i].price).toBeGreaterThan(venues[i - 1].price);
    }
  });

  it("finds venues by id and the next tier", () => {
    expect(venueById("town-park")).toBe(venues[2]);
    expect(venueById("moon")).toBeUndefined();
    expect(nextVenue(venues[0])).toBe(venues[1]);
    expect(nextVenue(venues[3])).toBeUndefined();
  });
});
