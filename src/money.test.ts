import { describe, expect, it } from "vitest";
import { formatMoney } from "./money";

describe("formatMoney", () => {
  it("formats money in pounds", () => {
    expect(formatMoney(12)).toBe("£12");
    expect(formatMoney(1.5)).toBe("£1.50");
    expect(formatMoney(5000)).toBe("£5,000");
    expect(formatMoney(1234567)).toBe("£1,234,567");
  });
});
