import type { Summary } from "../polish/stats";

/** Hit rate needed for 1, 2 and 3 stars. */
export const STAR_HIT_RATES = [0.5, 0.8, 1];
/** Most stars one show can earn. */
export const MAX_STARS = STAR_HIT_RATES.length;

/** The best a player has done at one venue. Each field only ever goes up. */
export interface VenueRecord {
  /** Most stars from one show. */
  stars: number;
  /** Most money made in one show. */
  bestMoney: number;
  /** Longest combo in one show. */
  bestCombo: number;
}

/** Records per venue id. Venues not played yet have no entry. */
export type Records = Record<string, VenueRecord>;

/** Which records a show beat. */
export interface NewBests {
  stars: boolean;
  money: boolean;
  combo: boolean;
}

export function emptyRecord(): VenueRecord {
  return { stars: 0, bestMoney: 0, bestCombo: 0 };
}

/** Stars from 0 to 3 for a show's hit rate. A show with nothing launched gets none. */
export function starsFor(summary: Pick<Summary, "hitRate" | "launched">): number {
  if (summary.launched <= 0) return 0;
  return STAR_HIT_RATES.filter((rate) => summary.hitRate >= rate).length;
}

/** The record for a venue, or an empty one if it hasn't been played. */
export function recordAt(records: Records, venueId: string): VenueRecord {
  return records[venueId] ?? emptyRecord();
}

export function isNewBest(bests: NewBests): boolean {
  return bests.stars || bests.money || bests.combo;
}

/**
 * Keeps the best of `summary` in the venue's record and returns which
 * records it beat. A record has to be beaten, not matched.
 */
export function recordShow(
  records: Records,
  venueId: string,
  summary: Summary,
): NewBests {
  const record = recordAt(records, venueId);
  const stars = starsFor(summary);
  const bests = {
    stars: stars > record.stars,
    money: summary.money > record.bestMoney,
    combo: summary.bestCombo > record.bestCombo,
  };
  records[venueId] = {
    stars: Math.max(record.stars, stars),
    bestMoney: Math.max(record.bestMoney, summary.money),
    bestCombo: Math.max(record.bestCombo, summary.bestCombo),
  };
  return bests;
}

/** Stars as text, filled then empty, such as "★★☆". */
export function starText(stars: number): string {
  const filled = Math.max(0, Math.min(MAX_STARS, stars));
  return "★".repeat(filled) + "☆".repeat(MAX_STARS - filled);
}
