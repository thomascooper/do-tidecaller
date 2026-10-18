# PRD: one level for character and gear, and max mana worked out from level and Intellect

## Introduction

Tom, 18 Oct 2026, testing the first build: *"the level that you put at the top for your character
should be the same level for gear. Also your mana is way off, I think I only have 900 and some, can
we do looking online they should be highly documented for what the naked and gear based mana is."*

His rulings, recorded in `docs/spec.md` **section 14** (read all of it before any story; it
supersedes sections 4, 5 and 7 where they differ):

- **One level.** The "Usable up to level" filter goes. Gear is usable when `req <= Level`.
- **Max mana is calculated, and stays editable.** Base mana for the level (Classic's documented
  Shaman table, section 14.2) plus mana from Intellect (`min(20, Int) + 15 * max(0, Int - 20)`).
  A new Intellect input, default 115. Typing a max mana overrides the calculation; "Use calculated"
  goes back.
- **The defaults move** to a fully geared level 30 with 115 Intellect: max mana 2,110, so every
  default number on the site changes (section 14.3 has them all).

**What a player can do after this that they cannot now:** type the Intellect and level from their
own character sheet and get their real max mana (a level 30 Shaman with 40 Intellect reads 985,
which is the "900 and some" Tom sees), and change one level that drives both the heal ranks and the
gear they can wear.

**Branch:** this run continues on `claude/sweet-hypatia-53cceb`, whose PR (#1) Tom has not merged
yet, so he tests both runs together.

## Research findings

- **Base mana, from Wowpedia and the Vanilla WoW Archive "Base mana" pages (vanilla table), found by
  web search on 18 Oct.** Documented Shaman values: 1: 55, 7: 121, 10: 175, 14: 241, 15: 260,
  20: 370, 21: 395, 22: 421, 23: 448, 24: 476, 25: 505, 26: 535, 27: 566, 28: 598, 29: 631, 30: 665,
  60: 1520. Both pages say base mana depends on class only, not race, and define it as max mana
  minus mana from Intellect. The wiki pages themselves are blocked from this container, so the
  values came through search results; two independent results agreed on every value they shared.
- **Intellect:** the wiki's formula counts the first 20 Intellect at 1 mana each and every point
  after at 15. Section 3's "15 mana per point" is the marginal rate, so the Intellect weight's
  `75 / T` term is unchanged.
- **Interpolated levels** (linear between documented neighbours, rounded): 2 is 66, 8 is 139,
  11 is 192, 12 is 208, 13 is 224, 16 is 282, 17 is 304, 18 is 326, 19 is 348, 31 is 694,
  45 is 1092, 59 is 1492. Each is shown as estimated.
- **The new defaults were computed with an independent port of the model (Python) on 18 Oct** and
  are the numbers in spec section 14.3. Two picks change at Dungeon boss: Wrist goes Spidertank
  Oilrag to **Mindthrust Bracers** (17.56) and Hands goes Truefaith Gloves to **Gloves of Old**
  (20.77). The weapon note becomes "Main hand and off hand beat the best two-hander by 26.2"
  (111.82 against 85.64). Holy Shroud scores 38.87 (shows 38.9). Mana for the fight reads 3,637.
- **Section 7 stays the check of the math.** The section 7 tests must keep passing, run on the
  spec's original character: `{ ...DEFAULTS, manaAuto: false, pool: 2223 }`. Do not delete them and
  do not change their expected values.
- **The reference comparison** (`test/reference-diff.mjs`) loads the spec's reference
  implementation, which has no `manaAuto` and still has `maxlvl`. Every scenario's saved state
  therefore gets `pool: 2223, manaAuto: false` on the app side (the reference ignores the extra
  key and uses 2223 by default), and the "usable up to 25" scenario is removed, since that control
  no longer exists. It must then report every remaining scenario identical (26 of 26).
- **Ripple:** smoke checks and unit tests that pin default numbers (2.75, 4.49, 422.6, 3,750,
  26.4, 38.7, Spidertank Oilrag, Truefaith Gloves and the like) must be re-measured against the new
  defaults and pinned to what section 14.3 says. A difference from section 14.3 means the code is
  wrong.

## User Stories

### US-001: One level for the character and the gear
**Description:** As a player, I want the level I enter for my character to decide what gear I can use, so there is one level to set.

**Acceptance Criteria:**
- [ ] Read `docs/spec.md` section 14.1 first
- [ ] `maxlvl` leaves `State`, `DEFAULTS`, `maxLevel()` and every caller; `whyNot` checks `req` against `state.level` ("Needs level N" unchanged)
- [ ] The "Usable up to level" input is removed from the Best set filters; the filters keep Faction, professions and "Show gear you can't use"
- [ ] `loadSaved` and `decodeShare` drop a saved `maxlvl` without error; a test covers both
- [ ] `test/reference-diff.mjs`: the "usable up to 25" scenario is removed (the reference still has that control; the app no longer does); update the scenario count wherever it is written (`CLAUDE.md`, `README.md`, `scripts/ralph/CLAUDE.md`: 26 scenarios) and nothing else in those files
- [ ] Smoke: there is no `#maxlvl` input; at level 25 the best set shows no item with a level requirement above 25 and Holy Shroud (req 27) is not the Head pick
- [ ] `npm run typecheck`, `npm test`, `npm run build`, `CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run smoke` and `npm run reference` (26 of 26) pass

### US-002: Max mana worked out from level and Intellect, in the model
**Description:** As a player, I want max mana calculated from my level and Intellect, so the weights start from a real mana pool.

**Acceptance Criteria:**
- [ ] Read `docs/spec.md` sections 14.2 and 14.3 first
- [ ] `model.ts`: `State` gains `int` (default 115) and `manaAuto` (default true); `pool` stays and is used only while `manaAuto` is false. Exports `SHAMAN_BASE_MANA` (the documented table from section 14.2, a comment naming its sources and that Forever has not confirmed it), `baseMana(level)` returning `{ value, estimated }` (documented value, else linear interpolation between documented neighbours, rounded; level clamped to 1..60), `manaFromInt(int)`, `calcPool(state)` returning `{ base, fromInt, total, estimated }`, and `effectivePool(state)`. `compute()` uses `effectivePool` everywhere it used `pool` (E and Water Shield)
- [ ] Tests: `baseMana` exact at every documented level (1 55, 20 370, 25 505, 30 665, 60 1520 among them, each `estimated: false`); 18 is 326 and 2 is 66, both estimated; `manaFromInt` 10 is 10, 20 is 20, 40 is 320, 115 is 1445; the defaults' pool is 2110; level 30 with 40 Intellect is 985; level 22 with 54 Intellect is 951
- [ ] The section 7 tests in `model.test.ts`, `src/lib/bis.test.ts` and anywhere else now run on `{ ...DEFAULTS, manaAuto: false, pool: 2223 }` with their expected values unchanged
- [ ] New tests pin spec section 14.3 at the defaults: for all three presets E, X, MP5, Int, Spirit (3 places), Water Shield 2.110, casts and the Horde best set total (2 places); the Dungeon boss best set pick by pick to 2 places, 111.82 against 85.64, total 428.41, Alliance 429.74; the priority line "MP5 > Intellect > Healing = Spell Power = Spirit"
- [ ] `storage.ts` migration per section 14.2: a saved state without `manaAuto` and a pool other than 2223 loads with `manaAuto: false` and that pool; one with 2223 (or no pool) loads with `manaAuto: true`. Tests for both. `share.ts` encodes and decodes `int` and `manaAuto`
- [ ] Until US-003 adds the controls, typing in the existing Max mana field sets `pool` and `manaAuto: false`, so it still works
- [ ] `test/reference-diff.mjs`: every scenario's state gets `pool: 2223, manaAuto: false` on the app side, with a comment saying why; still 26 of 26
- [ ] Re-measure and re-pin every smoke check and unit test that asserts a default number or default pick (see the research findings' ripple list); each new expectation matches section 14.3
- [ ] `npm run typecheck`, `npm test`, `npm run build`, `npm run smoke` and `npm run reference` (26 of 26) pass

### US-003: The Character panel: Intellect, and max mana with its working
**Description:** As a player, I want to type my Intellect and see my max mana worked out with its breakdown, and still be able to type my own number.

**Acceptance Criteria:**
- [ ] An **Intellect** number input in the Character panel, labelled, beside Max mana ("Intellect, total from your character sheet" as its hint or label text)
- [ ] **Max mana** shows `effectivePool`. Under it one line of working while calculated, for example "Base 665 at level 30 + 1,445 from 115 Intellect = 2,110." When the level's base mana is interpolated the line says the base is estimated (use the existing `Check` tag style)
- [ ] Typing a number into Max mana sets `pool` and `manaAuto: false`; the working line then reads "Using your number." with a **Use calculated (2,110)** button (live value) that sets `manaAuto: true`. Changing Level or Intellect while overridden does not move the typed number
- [ ] The Character panel hint still says Healing power excludes Spell Damage, and adds one sentence: max mana is base mana for your level (Classic's documented Shaman values, not yet confirmed in Forever) plus Intellect, first 20 points 1 mana each, then 15
- [ ] Every new control has an accessible name and works at 400px with no sideways scroll
- [ ] Smoke: defaults show Max mana 2110 and the working line; Intellect 40 makes Max mana 985 and changes the MP5 weight; Level 22 with Intellect 54 reads 951; Level 18 shows the estimated tag; typing 1000 into Max mana shows "Using your number." and the weights change; "Use calculated" returns to the calculated value; the choice survives reload
- [ ] `npm run typecheck`, `npm test`, `npm run build`, `npm run smoke` and `npm run reference` (26 of 26) pass

### US-004: Say where the mana comes from, on every page that explains the numbers
**Description:** As a player reading the site, I want to know how max mana is worked out and what is unconfirmed about it.

**Acceptance Criteria:**
- [ ] The calculator's "Unconfirmed" paragraph and the About page's unconfirmed list add: base mana uses Classic's documented Shaman values, not yet confirmed in Forever, and levels between documented values are estimated
- [ ] The About page's sources list adds the Wowpedia and Vanilla WoW Archive "Base mana" pages as plain text naming them (no link: their URLs were not verified from here)
- [ ] `/bis`'s intro names the default character as level 30 with 115 Intellect (2,110 mana) and links to the calculator to change it; item and slot pages' "default settings" sentences stay accurate
- [ ] `/guides/stat-weights` adds a short paragraph: the mana pool comes from base mana plus Intellect (section 14.2), and a smaller pool makes mana stats worth more
- [ ] No em dashes; no game facts beyond `docs/spec.md`
- [ ] `npm run typecheck`, `npm test`, `npm run build`, `npm run smoke` and `npm run reference` pass

## Non-Goals

- No race selector (base mana does not depend on race) and no naked-stat calculator.
- No talent that adds mana is modelled.
- No change to the item list. (ForeverChanges' latest Resto list, beta build 70425 of 15 Oct, names
  items the spec does not have; updating the data is Tom's call and a separate run.)

## Open Questions

- Forever's own base mana is unconfirmed. Tom can check it from his sheet: max mana minus mana from
  Intellect. If it differs from the table, the table in spec section 14.2 is updated and the tests
  follow.
