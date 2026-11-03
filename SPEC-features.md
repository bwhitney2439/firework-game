# Bonfire Night Popper: new feature ideas

Spec only. No feature code is in this change. The build tasks are in
[tasks/plan-features.md](tasks/plan-features.md).

## What I saw when I played it

I played master (after PRs #8 to #10) in a headless browser, at 1280×720 and
on a 390 px wide phone screen. Things that shaped the ideas below:

1. **Missed clicks cost nothing.** A bot that clicked every bright pixel
   about 20 times a second got "Perfect show!" with 1,748 missed clicks. The
   summary counts misses, but they change nothing. Mashing the mouse is the
   best way to play.
2. **The show sky is empty.** The title screen has a gradient sky, ground
   and a bonfire. The show itself is a flat `#0b1026` rectangle with small
   sprites on it. Bursts are small too (45 to 70 px across).
3. **There is nothing to aim for between shows except money.** One good
   show at the Village green earned £6,057, which is more than the City
   stadium costs (£5,000). After two or three shows you are at the top venue
   and there is nothing left to work towards.
4. **Every show has the same rhythm**: one launch a second, every time.
5. **Phones are not really supported.** On a 390 px screen the venue button
   covers the venue details, the "Next show" line runs off the right edge,
   and "New game" overlaps "Start show". The only way to mute is the M key,
   so phone players can't mute at all.
6. **There is no pause.** A hidden tab is capped at 0.1 s a frame, but if
   you look away with the tab still showing, the show keeps going.

## Summary

| # | Idea | Size | Pick | Wave |
|---|------|------|------|------|
| 1 | Steady hand: missed clicks have a cost | S | yes | **1** |
| 2 | Bonfire sky: a proper backdrop for the show | M | yes | **1** |
| 3 | Booker's requests: a goal for every show | M | yes | **1** |
| 4 | Crossette: a shell that splits into stars you can pop | M | yes | **1** |
| 5 | Pause and sound menu (with a tap-to-mute button) | S | yes | 2 |
| 6 | Big-pop juice: sky flash and combo banners | S | yes | 2 |
| 7 | Weather nights: wind and drizzle | M | maybe | 2 |
| 8 | Phone layout for the shop, summary and HUD | M | maybe | 2 |
| 9 | Venue stars and personal bests | M | yes | 3 |
| 10 | Sky lanterns: things you must not pop | M | maybe | 3 |
| 11 | Set list: choose the launch order | L | no | none |

**Recommended first wave: 1 to 4.** Together they fix the biggest problem
(mashing wins), give the game a look, give each show a goal, and add a new
way to score. None of their files overlap, so four agents can build them at
the same time.

## How the waves avoid merge conflicts

Ideas in the same wave touch **no common file**. The busy files are
`src/main.ts`, `src/game/show.ts`, `src/game/state.ts`, `src/game/save.ts`,
`src/shopScreen.ts`, `src/scoring/scoring.ts` and `src/scoring/tuning.ts`.
Each of these has one owner per wave. Each wave has only one idea that
changes `src/main.ts`; the others were designed so they don't need it.

| File | Wave 1 | Wave 2 | Wave 3 |
|------|--------|--------|--------|
| `src/main.ts` | 1 Steady hand | 5 Pause | 9 Venue stars |
| `src/render.ts` | 2 Bonfire sky | 7 Weather | |
| `src/polish/titleScreen.ts` | 2 Bonfire sky | 8 Phone layout | |
| `src/polish/summaryScreen.ts` | | 8 Phone layout | 9 Venue stars |
| `src/polish/stats.ts` | 4 Crossette | | 10 Lanterns |
| `src/polish/sound.ts` | | 5 Pause | |
| `src/scoring/score.ts` | 1 Steady hand | | 10 Lanterns |
| `src/scoring/scoring.ts` | 1 Steady hand | 6 Juice | 10 Lanterns |
| `src/scoring/tuning.ts` | 1 Steady hand | 6 Juice | 10 Lanterns |
| `src/scoring/popups.ts` | | 6 Juice | |
| `src/scoring/hud.ts` | | 8 Phone layout | |
| `src/fireworks/types.ts` | 4 Crossette | | 10 Lanterns |
| `src/fireworks/registry.ts` | 4 Crossette | | |
| `src/game/show.ts` | 4 Crossette | 7 Weather | 10 Lanterns |
| `src/game/state.ts` | 3 Requests | | 9 Venue stars |
| `src/game/save.ts` | 3 Requests | | 9 Venue stars |
| `src/game/wallet.ts` | 3 Requests | | |
| `src/game/shop.ts` | | | 9 Venue stars |
| `src/game/venues.ts` | | | 9 Venue stars |
| `src/shopScreen.ts` | 3 Requests | 8 Phone layout | 9 Venue stars |

New files (no conflicts): `src/polish/scenery.ts` (2), `src/game/requests.ts`
(3), `src/fireworks/crossette.ts` (4), `src/polish/pauseScreen.ts` (5),
`src/polish/juice.ts` (6), `src/game/weather.ts` (7), `src/game/records.ts`
(9), `src/fireworks/skyLantern.ts` (10). Each gets its own `*.test.ts` next
to it, like the rest of the repo.

Later waves change files that earlier waves changed, so each wave starts
from master after the wave before it is merged.

---

## Wave 1 (recommended first)

### 1. Steady hand: missed clicks have a cost

**What the player sees:** a click that hits nothing makes a small grey puff
of smoke where you clicked and a "Whiff" pop-up. It ends your combo and
takes a little off the crowd meter (much less than a fizzle). The summary's
"Missed clicks" row now matters.

**Why it's fun:** at the moment the best way to play is to mash. Making a
miss cost something turns it back into a reflex and aim game: you have to
pick your shot. A long combo is now something you've earned.

**Size:** S

**Files:** `src/scoring/score.ts` (new `scoreMiss`), `src/scoring/scoring.ts`
(new `handleMiss` that scores the miss and adds the puff and pop-up),
`src/scoring/tuning.ts` (`MISS_CROWD_LOSS`, and whether a miss ends the
combo), `src/main.ts` (call `handleMiss` where it calls `recordMiss` now).

**Risks:**
- Too harsh, and the Catherine wheel (18 px hit radius) feels unfair.
  Start gentle: lose about 0.03 crowd, and only end the combo.
- On touch, a finger is less precise than a mouse. Idea 8 can widen hit
  areas on touch later.
- Clicks between shows (title, shop, summary) must never count as misses.
  They don't reach this code today; a test should keep it that way.

**Pick:** yes

### 2. Bonfire sky: a proper backdrop for the show

**What the player sees:** the show happens over a night scene instead of a
flat colour: a sky gradient with twinkling stars, a dark treeline, the
bonfire from the title screen glowing at the bottom, and a row of crowd
silhouettes along the ground. While bursts are on screen the crowd jumps
and puts their arms up, and the bonfire lights up the smoke above it.

**Why it's fun:** this is a Bonfire Night game, and a show with nothing in
the sky looks unfinished. A crowd that reacts to every pop makes popping
feel good, and makes the crowd meter feel like real people.

**Size:** M

**Files:** new `src/polish/scenery.ts` (sky, stars, treeline, bonfire,
crowd), `src/render.ts` (draw the scenery before the fireworks; the crowd
reacts to `show.bursts`, which `render` already has), and
`src/polish/titleScreen.ts` (use the bonfire from `scenery.ts` instead of its
own copy). `src/main.ts` is not touched: `render` keeps its signature.

**Risks:**
- Contrast: fireworks must stay easy to see. Keep the scenery dark and in
  the bottom 15% of the screen, and never draw over a rising firework.
- Speed: draw stars as a few hundred `fillRect` calls, or once to an
  offscreen canvas, not hundreds of paths every frame.
- Not changing `render`'s signature means the backdrop can't show the venue
  yet. Venue skylines (garden fence, church, stadium lights) can come with
  idea 9, which already touches `main.ts`.

**Pick:** yes

### 3. Booker's requests: a goal for every show

**What the player sees:** the shop shows a card: "The Village green
committee asks: pop 3 Roman candles in a row. Reward £150." During the show,
when you meet it, a gold "Request done! +£150" pop-up appears and the money
goes in at once. There is one request per show, picked at random from a
list for your venue, and a new one comes after every show, whether you met
it or not.

Example requests (all can be checked from scored pops as they happen):
- Pop N fireworks of one type.
- Reach a combo of N.
- Fill the crowd meter to the top.
- Earn £N in one show.
- Pop N fireworks with an "Aah" (high in the sky).

**Why it's fun:** it gives you something to try for besides money, it makes
you buy fireworks you might skip, and it changes what you're aiming for from
one show to the next. That helps with problem 3 above.

**Size:** M

**Files:** new `src/game/requests.ts` (the request list, picking one, and
checking progress against a `ScoredEvent`), `src/game/wallet.ts` (in
`settleScoredEvents`, check the request after each event, pay the reward and
add the pop-up to `scoring.popups`), `src/game/state.ts` (`request`,
`activeRequest` and its progress in `GameState`), `src/game/save.ts` (parse them, with
defaults for old saves), `src/shopScreen.ts` (draw the request card).

**Risks:**
- Space in the shop: the card has to fit between the firework list and the
  Start button. Idea 4 adds a fifth row to the list, which leaves about
  150 px at 720 px tall. On short screens this is tight (see idea 8).
- A request for a type the player doesn't own and can't afford can't be
  done. Only pick type-based requests for types in stock or affordable, or
  for the free basic rocket.
- When to pick the next request without touching `main.ts`: keep two
  fields. `request` is the one the shop shows. `fireworksForShow` (already
  in `state.ts`, called when a show starts) moves it to `activeRequest`,
  which the wallet checks during the show, and picks the next `request`.
  A new game starts with a fixed easy one ("Pop 5 basic rockets").
- Rewards need tuning so they don't make problem 3 worse. Start with about
  one good pop's worth of money at that venue.

**Pick:** yes

### 4. Crossette: a shell that splits into stars you can pop

**What the player sees:** a new firework in the shop, the Crossette (£80).
It rises slowly and is easy to hit. When you pop it, it splits into 4 small
bright stars that fly out in a cross and fade over about 1.5 seconds. Each
star you pop pays a bonus and carries on the combo. Stars you miss just
fade, with no "Aww" and no crowd loss.

**Why it's fun:** it's the first firework where popping it starts a second,
harder challenge. Four quick follow-up shots are a burst of reflex play and
a natural way to build a big combo.

**Size:** M

**Files:** new `src/fireworks/crossette.ts` (the shell and a star type that
isn't sold), `src/fireworks/registry.ts` (one line),
`src/fireworks/types.ts` (an optional `split` field: which type and how
many), `src/game/show.ts` (`clickAt` adds the stars to `show.active`, with an
`origin` point and their own path; `updateShow` removes stars that run out
without a fizzle event), `src/polish/stats.ts` (so star pops don't push the
hit rate over 100%).

**Risks:**
- The `Firework` model assumes everything rises from the ground. Stars need
  an origin point. Adding an optional `origin` keeps every other type the
  same; `fireworkPosition` uses it if it's there.
- Scoring uses `flightProgress` for the height factor. For a star that
  means "how far through its life", so late pops pay more. That's fine but
  should be a choice, with a test.
- `useFirework` gets the star type, which isn't in stock, so it does
  nothing. That's right, but a test should check it.
- With five sellable types the shop list reaches about y = 490 at 1280×720.
  It still fits.

**Pick:** yes

---

## Wave 2

### 5. Pause and sound menu (with a tap-to-mute button)

**What the player sees:** a small pause button in the top-left corner during
a show, and the Esc or P key does the same. The game stops and a menu shows
Resume, Sound (off / low / high) and Quit to shop. Quitting part-way through
a show works like a reload does now: you keep the money you made and get
back the fireworks you didn't use. A small speaker button on the title
screen mutes sound with one tap.

**Why it's fun:** this one is less about fun and more about comfort, and on
phones it's needed, since there's no way to mute there today.

**Size:** S

**Files:** new `src/polish/pauseScreen.ts` (draw the menu and work out
which button was clicked), `src/main.ts` (a `"paused"` phase, the keys, not
moving the show forward while paused, the buttons), `src/polish/sound.ts`
(volume steps on top of `setMuted`).

**Risks:**
- Quitting part-way must not count as a fizzle for the fireworks left in
  the air. They stay in stock, as with a reload today.
- The pause button sits under the "Popped … Fizzled … Left …" line, so
  move it or move the line, and keep `COUNTS_LINE_BOTTOM` right.
- Remember the sound setting? That's an open question.

**Pick:** yes

### 6. Big-pop juice: sky flash and combo banners

**What the player sees:** a Golden rain or Chrysanthemum pop lights up the
whole sky in a short warm flash. Combo milestones (5, 10, 15) show a big
banner across the middle: "Sizzling! x5", "Blazing! x10", "Inferno! x15".
Pop-ups for big money are a bit bigger.

**Why it's fun:** the expensive fireworks should feel expensive, and combos
are the main skill in the game, so reaching one should feel like an event.

**Size:** S

**Files:** new `src/polish/juice.ts` (flash and banner state, and how they
fade), `src/scoring/scoring.ts` (start a flash or banner in
`handleShowEvents` and draw them in `drawScoring`), `src/scoring/popups.ts`
(a `"banner"` style), `src/scoring/tuning.ts` (milestones and how long
things last).

**Risks:**
- Flashing light. Keep it soft (alpha 0.25 or less, no quick strobing) and
  let it be turned off. Open question about a setting for it.
- Banners must not cover rising fireworks for long: draw them half
  transparent and keep them up for under a second.

**Pick:** yes

### 7. Weather nights: wind and drizzle

**What the player sees:** each show picks a night: Clear (most of the
time), Windy (fireworks drift sideways as they climb, and the counts line
says "Windy"), or Drizzle (light rain lines, fireworks climb a bit slower
and pop for 25% more, because the crowd are glad you kept going).

**Why it's fun:** it breaks up the one-a-second rhythm and makes you look
again at each launch. It's very British, too.

**Size:** M

**Files:** new `src/game/weather.ts` (the kinds of weather, picking one,
and what each does), `src/game/show.ts` (`Show` gets a `weather`;
`createShow` picks it from an injected `random`; `fireworkPosition` adds
the wind drift), `src/render.ts` (rain and the label).

**Risks:**
- The extra pay for drizzle needs a hook in scoring, which would add a
  file to this wave's file list. Version one can just change the climb speed
  and leave the money alone.
- Wind can push fireworks off screen. Clamp the drift to the side margin.
- `fireworkPosition` is also used by `clickAt`, so the click areas follow
  the drift, which is right. Tests should check both.

**Pick:** maybe. It's fun, but ideas 1 to 6 matter more.

### 8. Phone layout for the shop, summary and HUD

**What the player sees:** on a narrow screen the shop stacks: venue details
over the move button, firework rows over two lines, "New game" in the
corner well away from "Start show". The summary and HUD get smaller to fit,
and the title text wraps.

**Why it's fun:** it isn't fun in itself, but the game is put on GitHub
Pages, and a link is very likely to get opened on a phone.

**Size:** M

**Files:** `src/shopScreen.ts` (layout from the width), `src/polish/summaryScreen.ts`,
`src/scoring/hud.ts`, `src/polish/titleScreen.ts`.

**Risks:**
- Canvas UI isn't responsive by itself: every position is worked out by
  hand. Keep a single `layout(width, height)` function so drawing and
  clicking agree, as `shopButtons` already does.
- Making hit areas bigger for touch needs `pointerType` from `main.ts`,
  which idea 5 owns in this wave. That part waits until later.

**Pick:** maybe. Yes if Cody wants phone players.

---

## Wave 3

### 9. Venue stars and personal bests

**What the player sees:** every show earns 0 to 3 stars from its hit rate,
shown big on the summary, with "New best!" when you beat a record. The shop
shows the best stars and best show money for each venue. To move to the
next venue you need the money **and** at least 2 stars at your current one.
The title screen shows your best show.

**Why it's fun:** it gives a reason to replay a venue and a goal beyond
money, and it fixes problem 3 (buying your way to the top in two shows).

**Size:** M

**Files:** new `src/game/records.ts` (stars from a summary, the best for
each venue), `src/game/state.ts` (`records` in `GameState`), `src/game/save.ts`
(parse them), `src/game/venues.ts` (`starsToLeave`), `src/game/shop.ts`
(`canUpgradeVenue` returns a new `"needs-stars"`), `src/shopScreen.ts` (the
stars and the reason the button is disabled), `src/polish/summaryScreen.ts`
(the stars and "New best!"), `src/main.ts` (save the record when the summary
opens).

**Risks:**
- Saves from before this change have no stars and could get stuck. Treat
  any venue you are already at or past as passed.
- If idea 1 isn't in, a bot or a masher gets 3 stars every time. Build this
  after idea 1.
- Venue prices might also need raising. That's an open question.

**Pick:** yes

### 10. Sky lanterns: things you must not pop

**What the player sees:** now and then a paper sky lantern drifts slowly
across the sky, with a soft orange glow. If you pop it, the crowd boos, the
crowd meter drops and your combo ends. If you leave it, it floats away.

**Why it's fun:** a "don't click" target makes a reflex game much more
interesting. You have to look before you click, which works well with
idea 1.

**Size:** M

**Files:** new `src/fireworks/skyLantern.ts` (not in the registry, so it's
never sold), `src/fireworks/types.ts` (an optional `avoid` flag),
`src/game/show.ts` (`updateShow` spawns a lantern on a timer, and lanterns
leave with no event), `src/scoring/score.ts` (popping an `avoid` type costs
crowd, pays nothing and has combo 0, so `popCheer` stays quiet),
`src/scoring/scoring.ts` (a "Boo!" pop-up), `src/scoring/tuning.ts`,
`src/polish/stats.ts` (lanterns aren't counted as launched, popped or
fizzled).

**Risks:**
- `main.ts` plays a burst sound for every pop. For a lantern that's
  acceptable (a pop is still a pop), and the cheer stays quiet. A proper
  "boo" sound would need `main.ts` and `sound.ts`, which can come later.
- Real sky lanterns are a fire risk and banned in some places. The game
  could treat that as the reason ("Don't pop the lanterns, they'll set the
  trees alight!"), or use something else (a bird, a drone). That's an open
  question.
- Lanterns must not count as part of a "Perfect show".

**Pick:** maybe. It's a good idea, but it changes many shared files, so it's
best after the others.

---

## Not planned

### 11. Set list: choose the launch order

**What the player sees:** in the shop you drag fireworks into a timeline to
set the launch order, and you get a "Finale" bonus if the show ends with
your biggest shells.

**Why it's fun:** it adds a planning layer, like making your own show.

**Size:** L

**Files:** `src/shopScreen.ts`, `src/game/state.ts`, `src/game/save.ts`,
`src/game/show.ts`, `src/main.ts` (dragging), new `src/game/setList.ts`.

**Risks:** dragging on a hand-drawn canvas UI is a lot of work, it touches
every busy file, and it takes the player away from the reflex game, which is
the point of the game.

**Pick:** no. Idea 3 (Requests) gives some planning for much less work.
