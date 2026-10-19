# PRD: item level and armor from Wowhead's Forever data, and Spell Power before Healing

## Introduction

Tom asked on 18 Oct for the items page to show, after the name, *"level (that item can be used),
item level, AC, Int, Spr, SP, HP, MP5, Equip, where to get it"*. Run 003 built every column but item
level and armor (AC), because the spec had neither. On 19 Oct he ruled: *"item level and armor
columns should be cached from wowhead forever, it can be trusted"*.

The delivering session cached both into **spec section 14.6** from Wowhead's Forever tooltip data
(the same source and IDs as section 14.5), with `scripts/wowhead-icons.mjs --levels`.

Tom, 19 Oct, on the priority line: *"point for point spell power probably is on the left side and
hp on the right, while they are = to each other SP does influence dmg as well if they are equal, but
it should keep the = sign between them"*. Recorded as **spec section 14.7**.

**What a player can do after this that they cannot now:** compare items by item level and armor
on the items page, and see both in every item popup and on every item page, the way the game's own
tooltip shows them; and read a priority line that lists Spell Power before Healing, since a point of
Spell Power is worth the same healing and also adds damage.

**Branch:** `claude/sweet-hypatia-53cceb`, restarted from `main` after PR #2 merged. A new PR.

## Research findings

- **Section 14.6** is a JSON object, item name to `{ "ilvl": n }` or `{ "ilvl": n, "armor": n }`,
  for every item that has a Wowhead ID in section 14.5. Armor is present exactly for items whose
  section 12 `armor` type is Cloth, Leather or Shield; rings, necks, trinkets, weapons and held
  off-hand items have none. Holy Shroud is item level 32 with 40 armor; Forcestone Buckler (a
  shield) is item level 40 with 1078 armor; Reedknot Ring is item level 35 with no armor.
- **Items with no 14.5 entry have no item level or armor.** Their cells stay blank and their popup
  and page simply leave those lines out. Never fill them from anywhere else.
- **Display only.** Item level and armor change no score, weight or pick. The model, section 7,
  section 14.3 and the reference comparison (26 of 26) are untouched.
- **Section 14.7, the priority line.** Healing and Spell Power always weigh the same, so they always
  sit side by side joined by "=". Section 5 sorts from the base order mp5, int, spi, heal, sp; 14.7
  changes the base order to **mp5, int, spi, sp, heal** (Stamina last, as now), so ties list Spell
  Power first. The "=" rule (within max(0.03, 3% of the larger)) is unchanged. The Dungeon boss line
  at the defaults becomes "MP5 > Intellect > Spell Power = Healing = Spirit", and on the original
  section 7 character "MP5 > Intellect > Spell Power = Healing > Spirit". Only the priority line
  changes: the weight bars keep their fixed order (MP5, Intellect, Spirit, Healing, Spell Power) and
  no number changes. Section 14.7 supersedes the tie order of section 5 and the priority line strings
  quoted in sections 1, 7 and 14.3; the tests that pin those strings follow 14.7.
- **The reference comparison** (`test/reference-diff.mjs`) compares the priority line with the
  spec's section 13 implementation, which still uses the old tie order. Normalise the reference's
  line by swapping "Healing=Spell Power" for "Spell Power=Healing" (the diff already strips the
  spaces around ">" and "="), with a comment citing 14.7. It must stay 26 of 26; nothing else in the
  diff changes.
- **WoW's tooltip order**, which the popup follows: name, then "Item Level N", then the slot line
  (slot left, armor type right), then "N Armor", then the stats.

## User Stories

### US-001: Item level and armor in the app's data
**Description:** As a developer, I want each item's item level and armor available beside its other data, so pages and the popup can show them.

**Acceptance Criteria:**
- [ ] Read `docs/spec.md` sections 14.5 and 14.6 first
- [ ] `scripts/extract-spec-data.mjs` also extracts the 14.6 JSON block (heading "### 14.6 Item level and armor (cached from Wowhead's Forever data)") to `src/data/itemLevels.json`; update `scripts/extract-spec-data.d.mts`; the existing test that the data files equal the spec covers it
- [ ] A small helper beside `itemIconSrc` (so the popup script can import it without pulling in `data/index.ts`), for example `itemLevel(item)` and `itemArmor(item)`, each returning a number or `undefined`
- [ ] Tests: every key in `itemLevels.json` is an item name in `items.json` and in `wowhead.json`, and every `wowhead.json` item has an entry; Holy Shroud is `{ ilvl: 32, armor: 40 }`; Forcestone Buckler's armor is 1078; Reedknot Ring has item level 35 and no armor; an item has armor exactly when its section 12 `armor` type is Cloth, Leather or Shield; no item level is below the item's `req`; an item with no 14.5 entry (Red Wool Cloak, unless 14.5 gains it) returns `undefined` for both
- [ ] `npm run typecheck`, `npm test` and `npm run build` pass

### US-002: Item level and AC columns on the items page
**Description:** As a player, I want item level and armor in the items table, so I can compare gear the way Tom asked.

**Acceptance Criteria:**
- [ ] Every `/items` table's columns become: **Item**, **Lvl**, **iLvl**, **AC**, **Int**, **Spr**, **SP**, **Heal**, **MP5**, **Equip**, **Where**, **Score**, with `abbr` titles "Item level" and "Armor" on the new two; numbers right-aligned in the mono font like the other stat columns; blank when the item has none
- [ ] The lead paragraph names the two new columns and says item level and armor come from Wowhead's Forever database, and that a blank means none or not yet known
- [ ] Phone: the page still never scrolls sideways at 400 px (the table scrolls inside its box, Item column sticky)
- [ ] Smoke (update the existing `/items` checks in place): the Head table's header row reads the twelve columns in order; Holy Shroud's row reads Lvl 27, iLvl 32, AC 40, Heal 33, Spr 6, Where "World drop", Score 38.9; a neck item with an entry shows an iLvl and a blank AC
- [ ] `npm run typecheck`, `npm test`, `npm run build` and `CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run smoke` pass

### US-003: Item level and armor in the popup and on the item page
**Description:** As a player, I want the popup and the item page to show item level and armor, so they read like the game's own tooltip.

**Acceptance Criteria:**
- [ ] The popup, in WoW's order: "Item Level 32" under the name (in a muted gold), then the slot line, then "40 Armor" (plain) before the stats; each line only when the item has that value. The popup script stays under its 12 KB gzipped build limit
- [ ] The item page's Stats table starts with "Item level" and "Armor" rows when the item has them; the lead sentence is unchanged
- [ ] About page sources: the Wowhead line also says item level and armor are cached from Wowhead's Forever database (section 14.6); its other stats are not used
- [ ] Smoke (beside the existing popup and item page checks): the Holy Shroud popup contains "Item Level 32" and "40 Armor"; `/items/holy-shroud`'s Stats table has Item level 32 and Armor 40; `/items/reedknot-ring` has an Item level row and no Armor row
- [ ] `npm run typecheck`, `npm test`, `npm run build`, `npm run smoke` and `npm run reference` (26 of 26) pass

### US-004: Spell Power before Healing in the priority line
**Description:** As a player, I want the priority line to list Spell Power before Healing, since they are worth the same for healing and Spell Power also adds damage.

**Acceptance Criteria:**
- [ ] Read `docs/spec.md` section 14.7 and the PRD's research findings on it first
- [ ] `priorityLine` in `src/lib/model.ts` sorts from the base order mp5, int, spi, sp, heal (then sta when its weight is above 0); the "=" rule is unchanged; the weight bars are unchanged
- [ ] Tests follow 14.7: `model.test.ts` pins "MP5 > Intellect > Spell Power = Healing > Spirit" for the section 7 character at Dungeon boss and "MP5 > Intellect > Spell Power = Healing = Spirit" at the defaults; a new test checks that Spell Power comes right before Healing, joined by "=", at all three presets
- [ ] `test/smoke.mjs`: the `#verdict` check reads "MP5 > Intellect > Spell Power = Healing = Spirit"
- [ ] `test/reference-diff.mjs` normalises the reference's priority line as the PRD says, with a comment citing 14.7; 26 of 26
- [ ] Any page copy that quotes the old order follows 14.7 (search `src/` for "Healing = Spell Power")
- [ ] `npm run typecheck`, `npm test`, `npm run build`, `npm run smoke` and `npm run reference` (26 of 26) pass

## Non-Goals

- No item quality colours, durability, binding text or any other Wowhead field.
- No change to any score, weight or pick, and no change to the order of the weight bars.
- No sorting on the items page.

## Open Questions

- Items with no Wowhead ID stay blank in both columns until their ID is added to section 14.5 and
  `scripts/wowhead-icons.mjs --levels` refreshes section 14.6.
