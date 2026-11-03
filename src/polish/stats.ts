import {
  BURST_DURATION,
  type Show,
  type ShowEvent,
  isShowOver,
  isStar,
  updateShow,
} from "../game/show";

/**
 * Seconds between the last firework leaving the sky and the summary,
 * so the final burst can finish first.
 */
export const SUMMARY_DELAY = BURST_DURATION + 0.4;

/** Counts for one show. Only uses the generic show events. */
export interface ShowStats {
  launched: number;
  popped: number;
  fizzled: number;
  /**
   * Stars split off a crossette that were popped. They aren't launched from
   * the stock, so they don't count in `popped` or the hit rate.
   */
  bonusStars: number;
  /** Clicks that hit nothing while fireworks were in the air. */
  missedClicks: number;
  /** Seconds since the show ended. Zero while it is running. */
  overFor: number;
}

export function createStats(): ShowStats {
  return {
    launched: 0,
    popped: 0,
    fizzled: 0,
    bonusStars: 0,
    missedClicks: 0,
    overFor: 0,
  };
}

export function recordEvent(stats: ShowStats, event: ShowEvent): void {
  if (event.kind === "popped" && isStar(event.firework)) stats.bonusStars++;
  else if (event.kind === "popped") stats.popped++;
  else stats.fizzled++;
}

export function recordMiss(stats: ShowStats): void {
  stats.missedClicks++;
}

export interface Step {
  events: ShowEvent[];
  /** Fireworks launched during this step. */
  launched: number;
}

/** Runs updateShow and records what happened in the stats. */
export function stepShow(
  show: Show,
  stats: ShowStats,
  dt: number,
  random?: () => number,
): Step {
  const queued = show.queue.length;
  const events = updateShow(show, dt, random);
  const launched = queued - show.queue.length;
  stats.launched += launched;
  for (const event of events) recordEvent(stats, event);
  stats.overFor = isShowOver(show) ? stats.overFor + dt : 0;
  return { events, launched };
}

export function isSummaryDue(stats: ShowStats): boolean {
  return stats.overFor >= SUMMARY_DELAY;
}

export interface Rating {
  title: string;
  line: string;
}

export interface Summary {
  launched: number;
  popped: number;
  fizzled: number;
  /** Crossette stars popped. Not part of the hit rate. */
  bonusStars: number;
  missedClicks: number;
  /** Share of launched fireworks that were popped, from 0 to 1. */
  hitRate: number;
  /** Money earned in this show. */
  money: number;
  /** Longest combo in this show. */
  bestCombo: number;
  rating: Rating;
}

/** The show's scoring totals; they start again with every show. */
export interface ShowScore {
  showMoney: number;
  bestCombo: number;
}

export function rate(hitRate: number, launched: number): Rating {
  if (launched === 0) {
    return { title: "No show tonight", line: "Nothing went up at all." };
  }
  if (hitRate >= 1) {
    return {
      title: "Perfect show!",
      line: "Not a single dud. Remember, remember!",
    };
  }
  if (hitRate >= 0.8) {
    return {
      title: "Spectacular!",
      line: "The crowd will talk about this one.",
    };
  }
  if (hitRate >= 0.5) {
    return { title: "Crowd pleaser", line: "Plenty of oohs and aahs." };
  }
  if (hitRate > 0) {
    return { title: "A damp squib", line: "Most of them fizzled out." };
  }
  return {
    title: "Total washout",
    line: "The crowd went home for a hot drink.",
  };
}

export function summarize(stats: ShowStats, score: ShowScore): Summary {
  const hitRate = stats.launched > 0 ? stats.popped / stats.launched : 0;
  return {
    launched: stats.launched,
    popped: stats.popped,
    fizzled: stats.fizzled,
    bonusStars: stats.bonusStars,
    missedClicks: stats.missedClicks,
    hitRate,
    money: score.showMoney,
    bestCombo: score.bestCombo,
    rating: rate(hitRate, stats.launched),
  };
}
