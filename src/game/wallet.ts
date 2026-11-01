import { onScored, type Scoring, startScoringShow } from "../scoring/scoring";
import { currentVenue, type GameState, useFirework } from "./state";

/**
 * Settles each scored pop and fizzle against the saved state: the firework
 * comes out of the stock, and a pop's money goes into `state.money`, the
 * game's only wallet. Scoring already has the venue's money multiplier in
 * each pop's money, so nothing else should add money for a pop. Saves after
 * every event, so a reload mid-show keeps the money and the unused stock.
 */
export function settleScoredEvents(
  scoring: Scoring,
  state: GameState,
  save: (state: GameState) => void = () => {},
): void {
  onScored(scoring, (scored) => {
    useFirework(state, scored.event.firework.type);
    if (scored.kind === "popped") state.money += scored.score.money;
    save(state);
  });
}

/** Resets the show scoring and sets the money multiplier from the venue. */
export function startScoringAtVenue(scoring: Scoring, state: GameState): void {
  startScoringShow(scoring, currentVenue(state).moneyMultiplier);
}
