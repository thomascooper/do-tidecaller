# PRD: crit as a worked-out stat, rarity colours, and a character sheet for the best set

## Introduction

Tom, 19 Oct 2026:

- *"create the exact formula for calculating crit % with the specific gear so that water shield can
  be calculated and that stat should go into giving items weight as well, even if its small. think
  about 2 items, both 10 int, 5 mp5, one has 33 armor the other has 1% crit, the 1% crit item
  should have more points"*
- *"i want something setup like this with the items on the left and right sides and coloring for
  white/green/blue/purple etc based on rarity. then put weapons and range/relic on the bottom like
  the actual armory"* (about sixtysim.com's gear tab and the Blizzard Classic Armory)
- His level 25 reading: +44 mana at the level-up, which confirms base mana at level 25.

The 3D character models those sites show come from Wowhead's model viewer, whose files Wowhead
serves only to wowhead.com (any other site gets 403); the delivering session advised against working
around that. The character sheet's centre therefore shows Tidecaller's own totem art; it is one
image and can be swapped later.

**What a player can do after this that they cannot now:** see their crit chance worked out from
level and Intellect, see what 1% crit is worth, have crit gear (Tidebringer's Claw) and Intellect
valued for the crit they give, and see the best set as a WoW character sheet: gear down both sides,
weapons and relic along the bottom, every item in its rarity colour.

**Branch:** `claude/sweet-hypatia-53cceb`. PR #3 (run 004) is still open; this run adds to it, so
Tom tests both together.

## Design inputs (`design/` beside this file)

- `design/sheet-desktop.png` (1280 wide) and `design/sheet-phone.png` (400 wide): how the
  character sheet should look, made from the real default best set. Match them.
- `design/sheet-mock.html`: the markup and CSS of those screenshots (its fonts point at local copies;
  use the site's own faces). Read its CSS for sizes, colours, glows and the phone layout.
- `design/totem-figure.svg`: the centre art (original; the header's four totems on a rune-lit stone),
  360 x 440, 16 KB. `design/totem-figure.mjs` regenerates it from `scripts/header-art.mjs`.

## Research findings

- **Spec section 14.8 is the crit model: read all of it before US-001.** It gives the formula, the
  crit-per-Intellect table and its interpolation, the new state keys, the weight formulas, the item
  crit list, the page text, and every number the tests pin. Where it and sections 4, 5 or 7
  differ, 14.8 wins.
- **The oracle stays.** Section 7's tests run on `{ ...DEFAULTS, manaAuto: false, pool: 2223,
  critAuto: false, crit: 5, critStat: false }` and section 14.3's on `{ ...DEFAULTS, critAuto:
  false, crit: 5, critStat: false }`, with their expected values unchanged. New tests pin 14.8 at
  the new defaults.
- **The reference comparison** (`test/reference-diff.mjs`) adds `critAuto: false, critStat: false`
  to every scenario's app state (keep `crit` as the scenario sets it, 5 by default), with a comment
  citing 14.8. It must stay 26 of 26.
- **Ripple:** smoke checks and unit tests that pin a default number move to 14.8 where it changed:
  Intellect 1.95 (was 1.81), Water Shield 2.7 per cast (was 2.1), the best set total 448.1 (was
  428.4), Tidebringer's Claw 93.8 (was 86.0), the weapon margin 34.0 (was 26.2), casts 18.4 (still
  18.4). MP5 2.84, Spirit 0.98, E 3,637 and the priority line do not change. A difference from 14.8
  means the code is wrong.
- **Section 14.9** holds each item's rarity (2 uncommon, 3 rare) and the relic (Polished Driftwood
  Icon, icon `spell_shaman_totemrecall`, already in `public/icons/`). Colours on dark backgrounds:
  uncommon #1eff00, rare #0070dd for borders and a lighter #3d9cff for rare text (the game's blue is
  too dark to read as text on our dark panel), epic #a335ee (text #b86bff), common #ffffff, poor
  #9d9d9d, legendary #ff8000; an item with no quality uses a neutral #d8e4e8 text and a grey border.
- **The WoW character sheet layout:** left column Head, Neck, Shoulder, Back, Chest, Shirt, Tabard,
  Wrist; right column Hands, Waist, Legs, Feet, Finger, Finger, Trinket, Trinket; bottom row Main
  hand, Off hand, Relic. Shirt and Tabard have no items in the data and show as empty slots.
- **Base mana at level 25 is confirmed** (spec 14.2 and 14.4). Site copy that says only level 24
  matches now says levels 24 and 25.

## User Stories

### US-001: Crit chance and the crit stat in the model
**Description:** As a player, I want my crit chance worked out from my level and Intellect and crit valued as a stat, so Water Shield, Intellect and crit gear are scored properly.

**Acceptance Criteria:**
- [ ] Read `docs/spec.md` section 14.8 and this PRD's research findings first
- [ ] `model.ts`: `State` gains `critAuto` (true), `critExtra` (0) and `critStat` (true); `crit` stays (default 5, used only while `critAuto` is false). Export `INT_PER_CRIT` (the documented table, with a comment naming the wowsims source and that Forever has not confirmed it), `intPerCrit(level)` returning `{ value, estimated }` per 14.8, `calcCrit(state)` returning `{ base, fromInt, extra, total, estimated }`, and `effectiveCrit(state)`. `compute()` uses the effective crit for Water Shield and returns `weights.crit` and its two parts (`critHeal`, `critWS`); `weights.int` gains the crit term, all as 14.8 writes them
- [ ] Item crit: `scripts/extract-spec-data.mjs` extracts 14.8's JSON block to `src/data/itemCrit.json` (update the `.d.mts`; the data-equals-spec test covers it); `score()` adds `crit * weights.crit`; Tidebringer's Claw is the only item with crit
- [ ] Tests pin 14.8: `intPerCrit` exact at 25, 40, 50 and 60 (not estimated), 30 is 28.520 and 24 is 22.749 (both estimated); the defaults' crit is 6.332; level 24 with 40 Intellect is 4.058; for all three presets E, X, MP5, Int, Spirit, Crit (3 places), Water Shield per cast, casts and both faction totals (2 places); `critHeal` 2.979 and `critWS` 1.315; the Dungeon boss best set pick by pick (2 places), 119.62 against 85.64; the three priority lines; Tom's example (33.73 and 37.63); Water Shield off, typed crit 10 and `critExtra` 5 as 14.8 lists them
- [ ] Section 7 and section 14.3 tests run on the states the research findings give, values unchanged; `bis.test.ts` and any other test that pins old defaults follows the same rule
- [ ] `storage.ts` migration per 14.8 (no `critAuto` and a crit other than 5 keeps it typed; 5 or none becomes calculated), with tests; `share.ts` carries `critAuto` and `critExtra`
- [ ] `test/reference-diff.mjs` per the research findings; 26 of 26
- [ ] Until US-002 moves the crit box, typing in the existing Water Shield box sets `crit` and `critAuto: false`, so it still works
- [ ] Re-pin every smoke check and unit test that asserts a changed default (research findings' ripple list) to 14.8
- [ ] `npm run typecheck`, `npm test`, `npm run build`, `CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run smoke` and `npm run reference` (26 of 26) pass

### US-002: Crit chance in the Character panel and crit in the stat weights
**Description:** As a player, I want to see my crit chance worked out with its working, type my own if I prefer, and see what 1% crit is worth.

**Acceptance Criteria:**
- [ ] Character panel: a **Crit chance, %** field showing the effective crit (one decimal), and under it one line of working while calculated, for example "Base 2.3% + 4.03% from 115 Intellect (28.5 per 1%) + 0% from gear and talents = 6.33%.", with the existing Check tag when `intPerCrit` is estimated. Typing a number sets `crit` and `critAuto: false`; the line then reads "Using your number." with a **Use calculated (6.3%)** button (live value), exactly like Max mana
- [ ] A **Crit from gear and talents, %** input (`critExtra`) beside it, with a hint: for example Tidebringer's Claw adds 2% to Healing Wave and Lesser Healing Wave
- [ ] The Water Shield row loses its "Crit %" box; its description reads "Each heal crit returns 2% of max mana. Uses your crit chance from the Character panel." The talent row keeps its "Kept %" box
- [ ] Stat weights: crit stays out of the priority line; a readout under the readouts already there reads, for example, "1% crit 3.90 points of Healing (heals 2.98, Water Shield 0.92)"; the Intellect bar's note reads "pool, Water Shield and crit"
- [ ] Every new control has an accessible name and works at 400 px with no sideways scroll
- [ ] Smoke (beside the Character panel and weights checks): defaults show crit 6.3 and the working line with the Check tag; Intellect 40 changes the crit and the Intellect weight; typing 10 shows "Using your number." and the crit readout reads 3.85; "Use calculated" returns to 6.3; `critExtra` 2 makes it 8.3; the choice survives reload; the Water Shield row has no number box
- [ ] `npm run typecheck`, `npm test`, `npm run build`, `npm run smoke` and `npm run reference` (26 of 26) pass

### US-003: Say how crit is worked out, and that levels 24 and 25 match
**Description:** As a player reading the site, I want to know where the crit numbers come from and what is unconfirmed.

**Acceptance Criteria:**
- [ ] The calculator's "Unconfirmed" paragraph and the About page's unconfirmed list add: the 2.3% base crit, the Intellect-per-crit table (and that levels between its rows are estimated), and that a crit heals for 150%, all Classic values not yet checked in Forever
- [ ] About sources: the wowsims Season of Discovery simulator's base stats (its `base_stats.go`), named as plain text, for base crit and crit per Intellect
- [ ] `/guides/stat-weights` adds a short section on crit: what 1% crit is worth and its two parts (more healing, more Water Shield mana), that Intellect also buys crit, and that Tidebringer's Claw's +2% now counts; numbers from 14.8
- [ ] Every page sentence that says base mana matches at level 24 now says levels 24 and 25 (search `src/` for "level 24")
- [ ] No em dashes; no game facts beyond `docs/spec.md`
- [ ] `npm run typecheck`, `npm test`, `npm run build` and `npm run smoke` pass

### US-004: Rarity colours on every item icon and in the popup
**Description:** As a player, I want items shown in their rarity colour, so I can tell green and blue gear apart at a glance like in the game.

**Acceptance Criteria:**
- [ ] Read `docs/spec.md` section 14.9 first. `scripts/extract-spec-data.mjs` extracts its JSON block to `src/data/quality.json` (items and relic); the data-equals-spec test covers it
- [ ] A helper beside `itemIconSrc` (so the popup script can use it without `data/index.ts`), for example `itemQuality(item)` returning 0 to 5 or `undefined`. Tests: Holy Shroud 3, Sea Giant's Toe Ring 2, Red Wool Cloak `undefined`; 152 entries, all 2 or 3
- [ ] CSS tokens for the qualities per the research findings; every item icon (tables, item page, popup) gets a 1 px border in its quality colour (neutral grey without a quality); the popup's item name takes its quality's text colour (the popup is dark in both themes)
- [ ] Table item links on light backgrounds keep the site's link colour (a bright green or blue would be unreadable there)
- [ ] Smoke: the Holy Shroud popup's name colour is the rare text colour; Sea Giant's Toe Ring's icon border on `/items` is the uncommon colour; Red Wool Cloak's is the neutral grey
- [ ] `npm run typecheck`, `npm test`, `npm run build`, `npm run smoke` and `npm run reference` (26 of 26) pass

### US-005: The best set as a character sheet on the calculator
**Description:** As a player, I want the calculator's best set laid out like the game's character sheet, gear down both sides and weapons along the bottom, each item in its rarity colour.

**Acceptance Criteria:**
- [ ] Look at `design/sheet-desktop.png`, `design/sheet-phone.png` and `design/sheet-mock.html` first; match them. Copy `design/totem-figure.svg` to `public/art/totem-figure.svg`
- [ ] A `CharacterSheet` component at the top of the calculator's Best set box, above the existing table (which stays). Slots in the WoW order of the research findings; each filled slot shows the 40 px icon with a quality-coloured border and glow, the item name in its quality text colour (a link to the item page, so the popup works), and under it the slot name and the item's score. The right column mirrors the left (icon on the outside, text right-aligned)
- [ ] Shirt and Tabard show as empty slots. When the best set uses a two-hander, Main hand shows it and Off hand reads "Two-hand". A slot with no usable item reads "Empty". The relic slot shows Polished Driftwood Icon (its icon and rare colour, no score) while the Icon toggle is on, and otherwise "Relic: turn on Polished Driftwood Icon"
- [ ] The centre shows `/art/totem-figure.svg` (`alt=""`), under it "Level 30 Shaman, Horde" (live level and faction), a line with Healing power, Max mana and Crit chance, and "Set score" with the best set total; the sheet follows the faction, level, profession and "Show gear you can't use" filters exactly as the table does
- [ ] The sheet is always dark (like the game's frame) in both themes; at 760 px and narrower the centre art hides, the two columns sit side by side with names cut short with an ellipsis, the set score moves to the top, and the page never scrolls sideways at 400 px
- [ ] Smoke (beside the best set checks): the sheet shows 19 slots in the order above; Head shows Holy Shroud with its icon and 38.9; the right column's first slot is Hands; Main hand shows Tidebringer's Claw 93.8 and Off hand Forcestone Buckler; the relic slot shows Polished Driftwood Icon only after the Icon toggle is turned on; the set score reads 448.1; hovering an item in the sheet shows its popup; at 400 px no sideways scroll
- [ ] `npm run typecheck`, `npm test`, `npm run build`, `npm run smoke` and `npm run reference` (26 of 26) pass

### US-006: The character sheet on the best-in-slot page
**Description:** As a visitor to the best-in-slot page, I want the same character sheet for the default set, so the page shows the gear the way the game does.

**Acceptance Criteria:**
- [ ] `/bis` shows the same `CharacterSheet` (prerendered HTML, no app JavaScript; the popup script already runs on every page) for the default Horde set at the Dungeon boss settings, above its tables, with the relic slot showing "Relic" and no item (the default character does not have the Icon on)
- [ ] The page keeps exactly one `h1`, its title, description and structured data unchanged, and passes the SEO tests
- [ ] Smoke (beside the `/bis` checks): the sheet's Head is Holy Shroud and Main hand Tidebringer's Claw; the set score matches the Horde table's total; at 400 px no sideways scroll
- [ ] `npm run typecheck`, `npm test`, `npm run build` and `npm run smoke` pass

## Non-Goals

- No 3D character model (Wowhead serves its model files only to wowhead.com).
- No ranged weapon slot (Shamans use the relic slot), no enchants, no gems.
- No change to the item list, and no score for the relic (its effect is the Icon toggle).

## Open Questions

- Tom's in-game check of the crit formula: naked at level 25 with 41 Intellect the sheet's spell crit
  should read 4.03%. If it differs, section 14.8's table or base is corrected and the tests follow.
- Whether Tom has a talent that adds healing crit (for example Tidal Mastery): it goes in "Crit from
  gear and talents" for now.
