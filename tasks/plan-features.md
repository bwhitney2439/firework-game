# Plan: new features

**Approved 2026-11-03 by Cody: all open-question defaults accepted; idea 11 (set list) skipped. Venue prices are not retuned yet.**

One build task per idea in [SPEC-features.md](../SPEC-features.md). Tasks
in the same wave share no files and can run at the same time. Start each
wave from master after the wave before it is merged.

Every task:
- Branch from fresh master. If `npm run build` fails with `tsc: not found`,
  run `npm ci` first.
- Put tests in a `*.test.ts` file next to the code, in the same style as the
  existing ones (pure functions, an injected `random` where there's
  randomness, no DOM).
- Done means `npm test` and `npm run build` both pass, plus the task's own
  "done when" list.
- Keep tuning numbers in `src/scoring/tuning.ts` (or next to the feature if
  that file isn't yours this wave) with a one-line doc comment, as the repo
  does now.
- Don't change files that another task in the same wave owns. If you have
  to, ask the Captain first.

---

## Wave 1 (recommended first)

### T1. Steady hand: missed clicks have a cost

**Files:** `src/scoring/score.ts`, `src/scoring/scoring.ts`,
`src/scoring/tuning.ts`, `src/main.ts`; tests in `src/scoring/score.test.ts`
and `src/scoring/scoring.test.ts`.

**Build:**
- `tuning.ts`: `MISS_CROWD_LOSS` (default 0.03) and
  `MISS_BREAKS_COMBO` (default true).
- `score.ts`: `scoreMiss(score): MissScore`. It lowers the crowd, ends the
  combo if `MISS_BREAKS_COMBO` is on, and returns the new crowd and the
  combo it broke.
- `scoring.ts`: `handleMiss(scoring, at)` calls `scoreMiss` and adds a
  "Whiff" pop-up (the `"groan"` style) and a short grey puff at `at`.
  Misses don't go to `listeners`, so the wallet doesn't change.
- `main.ts`: where a show click hits nothing, call `handleMiss` next to
  `recordMiss`.

**Tests:**
- A miss lowers the crowd by `MISS_CROWD_LOSS`, never below 0.
- A miss ends a combo, so the next pop is combo 1.
- A miss doesn't change `showMoney`.
- `handleMiss` adds a pop-up and calls no listeners.

**Done when:** mashing the mouse during a show visibly costs crowd and
combos, and one careful click per firework still gets "Perfect show!".

### T2. Bonfire sky: a proper backdrop for the show

**Files:** new `src/polish/scenery.ts` and `src/polish/scenery.test.ts`,
`src/render.ts`, `src/polish/titleScreen.ts`.

**Build:**
- `scenery.ts`: `drawScenery(ctx, width, height, time, excitement)` draws
  the sky gradient, stars (fixed positions from a seeded hash, as
  `titleBurst` does), treeline, bonfire and crowd silhouettes. Export
  `drawBonfire` (moved from `titleScreen.ts`).
- Pure helpers to test: `starField(seed, count, width, height)`,
  `crowdExcitement(bursts)` (0 to 1 from the bursts on screen and how old
  they are), and `crowdFigure(index, width, excitement, time)` for each
  figure's position and whether their arms are up.
- `render.ts`: replace the flat fill with `drawScenery`, using
  `performance.now()` or the burst ages for time, and `show.bursts` for the
  excitement. Keep the signature the same.
- `titleScreen.ts`: import `drawBonfire` from `scenery.ts`.

**Tests:**
- The star field is the same for the same seed and inside the canvas.
- Excitement is 0 with no bursts, goes up with new bursts and fades as they
  age.
- Crowd figures stay in the bottom band and inside the width.

**Done when:** a show screenshot has stars, ground, the bonfire and a crowd
that cheers when something pops. The title screen looks the same as before.
Fireworks are still clear against the sky.

### T3. Booker's requests: a goal for every show

**Files:** new `src/game/requests.ts` and `src/game/requests.test.ts`,
`src/game/wallet.ts`, `src/game/state.ts`, `src/game/save.ts`,
`src/shopScreen.ts`; tests in `wallet.test.ts`, `state.test.ts`,
`save.test.ts` and `shopScreen.test.ts`.

**Build:**
- `requests.ts`: a `Request` type (`kind`, `target`, `typeId?`, `reward`,
  `text`), the request kinds (pop N of a type, reach combo N, fill the
  crowd, earn £N in a show, N "Aah" pops), `pickRequest(state, types,
  random)` and `advanceRequest(progress, request, scored): boolean`, which
  returns true when the request is done.
- `state.ts`: `request` (shown in the shop), `activeRequest` and
  `requestProgress`. `createGameState` gives the fixed starter request.
  `fireworksForShow` moves `request` to `activeRequest`, resets the
  progress and picks the next `request`.
- `wallet.ts`: in the `settleScoredEvents` listener, update the active
  request. When it's done, add the reward to `state.money`, mark it done so
  it can't pay twice, and add a gold pop-up to `scoring.popups`.
- `save.ts`: parse the three new fields. Bad or missing ones get defaults.
- `shopScreen.ts`: a request card between the firework list and Start.

**Tests:**
- `pickRequest` only picks type requests for types the player owns or can
  afford, and the free basic rocket.
- Each request kind is done exactly when its target is reached.
- A request pays once, even after more pops.
- A reload mid-show keeps the progress and doesn't pay a second time.
- Old saves without the fields load with the starter request.

**Done when:** the shop shows a request, meeting it during the show pays at
once with a pop-up, and the next shop visit shows a new request.

### T4. Crossette: a shell that splits into stars

**Files:** new `src/fireworks/crossette.ts` and
`src/fireworks/crossette.test.ts`, `src/fireworks/registry.ts`,
`src/fireworks/types.ts`, `src/game/show.ts`, `src/polish/stats.ts`; tests in
`src/game/show.test.ts` and `src/polish/stats.test.ts`.

**Build:**
- `types.ts`: optional `split?: { type: FireworkType; count: number }`.
- `show.ts`: optional `origin?: Point` on `Firework`. `fireworkPosition`
  uses `origin` plus the type's path when it's set. `clickAt` adds
  `split.count` stars at the pop point, spread out evenly. `updateShow`
  drops stars that run out, with no fizzle event.
- `crossette.ts`: `crossette` (price 80, baseValue 4, slow, big hit
  radius) and `crossetteStar` (fast, small, not in the registry), each with
  its own drawing.
- `registry.ts`: add `crossette`.
- `stats.ts`: star pops are counted as "bonus stars", not as `popped`, so
  the hit rate stays at or under 100%.

**Tests:**
- Popping a crossette adds `count` stars at the pop point.
- Stars move outwards and are dropped with no event when they run out.
- Popping a star gives a normal `popped` event that carries on the combo.
- `useFirework` with the star type changes nothing.
- The hit rate never goes over 1 with stars popped.

**Done when:** the Crossette can be bought, its stars can be popped for a
bonus, missing them costs nothing, and all existing types behave as before.

---

## Wave 2

### T5. Pause and sound menu

**Files:** new `src/polish/pauseScreen.ts` and its test, `src/main.ts`,
`src/polish/sound.ts` and `src/polish/sound.test.ts`.

**Build:**
- `pauseScreen.ts`: `pauseButtons(width, height)`, `drawPause(...)` and
  `pauseClick(point)` returning `"resume" | "sound" | "quit" | null`. Also
  the corner pause button and the title-screen speaker button, with their
  hit areas.
- `sound.ts`: `setVolume(level: 0 | 1 | 2)` and `volume()`; mute is level 0.
- `main.ts`: a `"paused"` phase. Esc or P, or the button, toggles it.
  While paused nothing moves (no `stepShow`, no `updateScoring`) and the
  last frame is drawn with the menu over it. "Quit to shop" goes to the
  shop without settling the fireworks still in the air. Pause by itself
  when the tab is hidden (`visibilitychange`).

**Tests:** button hit areas, sound levels changing the output gain, and
mute still working. Pausing logic in `main.ts` isn't unit tested; test it
by hand with the steps in the PR.

**Done when:** you can pause and resume a show with no jump, quit
part-way and get your unused fireworks back, and mute by tapping on a
phone.

### T6. Big-pop juice

**Files:** new `src/polish/juice.ts` and its test, `src/scoring/scoring.ts`,
`src/scoring/popups.ts`, `src/scoring/tuning.ts`.

**Build:**
- `juice.ts`: `Juice` state (`flash`, `banner`), `triggerFlash(juice,
  strength)`, `triggerBanner(juice, text)`, `updateJuice(juice, dt)` and
  `drawJuice(ctx, juice, width, height)`.
- `tuning.ts`: `COMBO_MILESTONES` (5, 10, 15 and their words),
  `FLASH_MIN_BASE_VALUE` (types worth at least this much flash),
  `FLASH_ALPHA_MAX` (0.25).
- `scoring.ts`: keep a `Juice` in `Scoring`. Start the flash and banners
  in `handleShowEvents`, update them in `updateScoring` and draw them in
  `drawScoring`. Reset them in `startScoringShow`.
- `popups.ts`: a `"banner"` style.

**Tests:** a milestone combo starts the right banner just once; a cheap
pop doesn't flash; the flash and banner fade to nothing; resetting for a
new show clears them.

**Done when:** a Golden rain lights the sky, combos 5, 10 and 15 show a
banner, and nothing strobes.

### T7. Weather nights

**Files:** new `src/game/weather.ts` and its test, `src/game/show.ts`,
`src/render.ts`; tests in `src/game/show.test.ts`.

**Build:**
- `weather.ts`: `Weather` (`"clear" | "windy" | "drizzle"`), `pickWeather(random)`
  (default chances 70 / 15 / 15), `windDrift(age, strength)` and
  `riseFactor(weather)`.
- `show.ts`: `Show.weather` and `Show.windStrength`, picked in `createShow`
  with an optional `random`. `fireworkPosition` adds the drift, clamped to
  the side margin. Drizzle slows the climb.
- `render.ts`: rain lines for drizzle and the weather word on the counts
  line.

**Tests:** the weather is picked the same way for a given `random`; drift
stays inside the margins; `clickAt` hits a drifted firework where it's
drawn; drizzle makes the flight take longer.

**Done when:** windy and drizzly shows look and play differently, and a
clear night plays exactly as it does today.

### T8. Phone layout

**Files:** `src/shopScreen.ts`, `src/polish/summaryScreen.ts`,
`src/scoring/hud.ts`, `src/polish/titleScreen.ts`, and their tests.

**Build:** a `layout(width, height)` in each screen that returns positions,
with a narrow layout under 520 px wide: the venue button under the venue
details, two-line firework rows, and "New game" kept away from "Start show".
Use the same layout for drawing and for clicking.

**Tests:** at 390×700 and 1280×720 no two shop buttons overlap, every
button is on screen, and the venue button doesn't cover the venue text.

**Done when:** screenshots at 390×700 show nothing overlapping or cut off,
and the desktop layout looks the same as before.

---

## Wave 3

### T9. Venue stars and personal bests

**Files:** new `src/game/records.ts` and its test, `src/game/state.ts`,
`src/game/save.ts`, `src/game/venues.ts`, `src/game/shop.ts`,
`src/shopScreen.ts`, `src/polish/summaryScreen.ts`, `src/main.ts`, and
their tests.

**Build:**
- `records.ts`: `starsFor(summary)` (default: 1 star at 50%, 2 at 80%,
  3 at 100%) and `recordShow(records, venueId, summary)`, which returns what
  was beaten.
- `state.ts`: `records: Record<venueId, { stars, bestMoney, bestCombo }>`.
- `venues.ts`: `starsToLeave` (default 2).
- `shop.ts`: `canUpgradeVenue` returns `"needs-stars"` when you don't
  have enough stars at your current venue.
- `save.ts`: parse `records`. In old saves, venues below the current one
  count as passed.
- `shopScreen.ts`: show the stars and bests, and why the move button is
  off.
- `summaryScreen.ts`: show the stars and "New best!".
- `main.ts`: call `recordShow` once, when the summary opens, and save.

**Tests:** the star limits; records only go up; the upgrade is blocked
without enough stars and allowed with them; old saves aren't stuck.

**Done when:** a weak show can't buy its way up, a good one can, and the
summary celebrates new bests.

### T10. Sky lanterns

**Files:** new `src/fireworks/skyLantern.ts` and its test,
`src/fireworks/types.ts`, `src/game/show.ts`, `src/scoring/score.ts`,
`src/scoring/scoring.ts`, `src/scoring/tuning.ts`, `src/polish/stats.ts`,
and their tests.

**Build:**
- `types.ts`: optional `avoid?: boolean`.
- `skyLantern.ts`: a slow lantern that drifts across, with `avoid: true`.
  It isn't in the registry.
- `show.ts`: spawn a lantern every `LANTERN_INTERVAL` seconds (with an
  injected `random`) while there are still fireworks to launch. Lanterns
  that reach the top or the side leave with no event.
- `score.ts`: popping an `avoid` type pays nothing, costs
  `LANTERN_CROWD_LOSS`, ends the combo and returns combo 0.
- `scoring.ts`: a "Boo!" pop-up for it.
- `stats.ts`: lanterns don't count as launched, popped or fizzled; they get
  their own count.

**Tests:** lanterns spawn on time and never from the queue; popping one
costs crowd and pays £0; leaving one costs nothing; a show with lanterns
can still be "Perfect".

**Done when:** lanterns show up a few times a show, popping one clearly
hurts, and ignoring them is free.

---

## Open questions (all decided)

**Approved 2026-11-03 by Cody: all open-question defaults accepted; idea 11 (set list) skipped. Venue prices are not retuned yet.**

1. **Which ideas go first?** Decided (default accepted): wave 1 (T1 to T4), four agents at
   once.
2. **How harsh should a missed click be?** Decided (default accepted): lose 0.03 crowd and
   end the combo, with no money lost.
3. **Should the economy be retuned?** One good Village green show pays for
   the City stadium. Decided (default accepted): no price changes now; T9's star gate fixes
   the worst of it. Look again after wave 1 with Requests' rewards in.
4. **Do we care about phones?** Decided (default accepted): yes, a bit. T5's tap-to-mute is in
   wave 2 either way; T8's full phone layout stays "maybe" until Cody says.
5. **Should sound and flash settings be remembered?** Decided (default accepted): yes, in
   their own localStorage key (not in `GameState`), so the save format
   doesn't change.
6. **Should there be a setting to turn off the flash (T6)?** Decided (default accepted): no
   setting; keep the flash soft (alpha ≤ 0.25, no strobing).
7. **Lanterns or something else as the "don't pop" target (T10)?**
   Decided (default accepted): sky lanterns, with the line "Don't pop the lanterns!" on the
   title screen the first time.
8. **Can the Crossette's stars be popped for money, or only for combo?**
   Decided (default accepted): for money, at 1× a basic rocket each, plus the combo.
9. **Should missing a Crossette star or leaving a lantern count against a
   "Perfect show"?** Decided (default accepted): no. Perfect means every launched firework
   from your stock was popped.
10. **The set list (idea 11)?** Decided (default accepted): not planned.
