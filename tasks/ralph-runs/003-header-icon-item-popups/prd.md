# PRD: a header with art, a totem icon, item popups everywhere, a fuller items table

## Introduction

Tom, 18 Oct 2026, after merging run 002 with the domain live:

- *"i need a sweet shaman wow based BG ... i need a SWEET gaming background behind the header. and
  some good styling to the tidecaller, if you need to make the header universal and nice with custom
  text under the nav menu that is fine"*
- *"i also need every item link in the game to use wowhead or another popup library"*
- *"also tidecaller needs an ico, maybe a stylized totem or the shaman logo"* (he attached a Shaman
  class crest and an in-game totem as inspiration only: Blizzard's art is copyrighted, so ours is
  original)
- *"on the items page i want there to be multiple columns not just score, after the name, level
  (that item can be used), item level, AC, Int, Spr, SP, HP, MP5, Equip, where to get it (just zone,
  or crafted, or world drop, etc)"*
- *"why does watershield have a text box next to it? right now it is 5?"* (it is the heal crit
  chance, but nothing on screen says so)

**What a player can do after this that they cannot now:** hover (or tab to) any item name anywhere
on the site and read its stats, level, effect and source in a WoW-style popup without leaving the
page; scan every item's stats and where it drops in one table; jump to the item on Wowhead; and see
what the box beside Water Shield means. And the site looks like a WoW site: a storm-and-totems
banner behind a branded header, and a totem icon in the browser tab and on phones.

**Branch:** `claude/sweet-hypatia-53cceb`, freshly cut from `main` after PR #1 merged. A new PR.

## Design inputs (made in the delivering session, in `design/` beside this file)

- `design/header-tide.svg`: the header art. Original procedural art: a storm over the sea at night,
  moon, lightning, and a sea cliff on the right with four glowing totems (earth, fire, water, air)
  while a stream of sea water rises to the tallest: the tide being called. 3200 x 360, about 74 KB,
  14 KB gzipped. Its focal point sits in the rightmost ~900 units, low in the frame, so it is meant to
  be anchored **right bottom** behind a header whose nav runs along the top.
- `design/header-scene.mjs`: the generator that wrote it (seeded, deterministic). It goes into the
  repo so the art can be tweaked and rewritten later.
- `design/totem.svg`: the new icon. An original carved totem in a gold-rimmed teal badge: horned,
  winged mask with glowing eyes and a toothed mouth, a gold band, a second carved face lower down,
  waves at the foot, and a water drop sigil above. 64 x 64 viewBox, 3 KB.
- `design/header-mock.html`: the reference header (markup and CSS) the screenshots were taken from.
  Its fonts point at local copies; in the site use the self-hosted @fontsource faces already loaded.
- `design/mock-desktop.png` (1440 wide), `design/mock-phone.png` (400 wide, dark theme),
  `design/mock-totems-2x.png`, `design/icon-sizes.png` (16 to 256 px, light and dark): how it should
  look. Match them.

## Research findings

- **Item level and armor (AC) are not in the spec.** Section 12's `armor` field is the armor
  *type* (Cloth, Leather, Shield, "-"), not an armor value, and there is no item level. Under THE ONE
  RULE those two columns are left out of this run (Open Questions). Do not add them, not even empty.
- **"HP" in Tom's list is Healing (the `heal` field).** The column header reads **Heal** with an
  `abbr` title "Healing", because "HP" reads as health to most players.
- **Equip text.** Section 12's `other` field mixes equip effects with notes. Rule: `other` is an
  **equip** text when it starts with `+`, `Use:` or `Proc`; otherwise it is a **note** (for example
  "Nerfed Oct 8", "Unique", "Elite quest", "Source unconfirmed in Forever", "Violet Sorcerer's set
  piece"). Use and proc texts go in the Equip column as written ("Use: random potion").
- **Where it comes from, short.** Derived from `source` only, never from memory. Each short label
  is a kind, a place, or "kind, place", where the place is text copied verbatim from that item's
  `source`. Examples (they become tests):

  | source | where |
  |---|---|
  | World drop / auction house | World drop |
  | Crafted: Tailoring 125 (pattern drops in RFK) | Crafted, Tailoring |
  | Crafted: Tailoring (bind on equip) | Crafted, Tailoring |
  | Quest: Wanted! Marez Cowl (Arathi) | Quest, Arathi |
  | Quest: A Vengeful Fate (RFK, from 29) | Quest, RFK |
  | Quest: Solution to Doom (from 30) | Quest |
  | Quest: Rig Wars (Gnomeregan final boss) | Quest, Gnomeregan |
  | Quest: Greater Friend of the Library (20 books) | Quest |
  | Quest: Elder Knowledge, Excavation Site: Wetlands | Quest, Excavation Site: Wetlands |
  | Quest: Data Rescue | Quest |
  | Shaman quest: The Tempest's Weapons (from 30) | Shaman quest |
  | Myzrael quest chain, Arathi | Quest, Arathi |
  | Fallen Champion (rare), SM Graveyard | SM Graveyard |
  | Scorn, SM Graveyard (Classic event boss) | SM Graveyard |
  | Scarlet Monastery trash | Scarlet Monastery |
  | Gnomeregan trash (rare) | Gnomeregan |
  | City of Dalaran drop | City of Dalaran |
  | Vendor: Gezzy Gunkgear, Booty Bay | Vendor, Booty Bay |
  | Defilers vendor (Arathi Basin) | Vendor, Arathi Basin |
  | Darkspear Raiders vendor | Vendor, Darkspear Raiders |
  | Warsong Outriders reputation (Classic) | Reputation, Warsong Outriders |
  | Unknown (bind on equip) | Unknown |

- **Popups are Tidecaller's own, not Wowhead's.** Wowhead's tooltip script shows Wowhead's datamined
  numbers, which can differ from the spec (section 12's values reflect the 8 Oct beta changes and
  Tom's client), it covers only the items with a known ID, and it is a third-party script on every
  page. Our popup shows section 12's facts for all 155 items. Wowhead gets a "View on Wowhead" link
  on item pages, from spec **section 14.5** (111 IDs; 44 items have none yet and get no link).
- **JavaScript on content pages.** Content pages ship no *app* JavaScript today and the SEO test
  enforces it (`script[type="module"]` count is 1 on `/`, 0 elsewhere). The popup needs a small
  script on every page. That is allowed for this one script: no framework, no third-party request,
  its own Vite entry, under 12 KB gzipped including the item data. The test changes to: the app
  script only on pages that hydrate, and exactly one popup script on every page.
- **Theme colour.** The header is dark in both themes, so `theme-color` becomes `#03060d` for both
  (phone browser chrome then runs into the header). The manifest's `theme_color` too.

## User Stories

### US-001: The totem icon in the tab, on phones and in the manifest
**Description:** As a visitor, I want Tidecaller to have its own icon, so I can spot it among my tabs and on my home screen.

**Acceptance Criteria:**
- [ ] `public/favicon.svg` is `design/totem.svg` (byte for byte, or minified without changing a shape)
- [ ] `scripts/og.mjs` renders the PNG icons from `public/favicon.svg` instead of the old wave mark: `public/apple-touch-icon.png` 180 x 180 (the badge at about 84% on a full-bleed `#03060d` square: iOS does not keep transparency), `public/icon-192.png` and `public/icon-512.png` (the badge on transparent), and a new `public/icon-maskable-512.png` (the badge at 72% on full-bleed `#0a2a36`, inside the maskable safe zone)
- [ ] A new `public/favicon.ico` holding 16, 32 and 48 px PNG images of the badge, written by `scripts/og.mjs` (a small ICO writer in the script; no new dependency)
- [ ] `site.webmanifest`: the three icons, the maskable one with `"purpose": "maskable"`, `theme_color` `#03060d`
- [ ] `src/seo/head.ts`: `<link rel="icon" href="/favicon.ico" sizes="48x48">` before the SVG icon link; both `theme-color` metas become `#03060d`
- [ ] Tests (Vitest): each PNG's width and height read from its IHDR chunk match the sizes above; the ICO header says 3 images of 16, 32 and 48; the manifest parses and lists the icons; every prerendered page's head has the ico, svg, apple-touch and manifest links
- [ ] Run `node scripts/og.mjs` and commit what it writes. The social cards are redone in US-003; leave them as they render now
- [ ] `npm run typecheck`, `npm test`, `npm run build` and `CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run smoke` pass

### US-002: A universal header with the storm-and-totems art
**Description:** As a visitor, I want a header that looks like a WoW site, with the Tidecaller name styled and a line about what the site is, on every page.

**Acceptance Criteria:**
- [ ] Look at `design/mock-desktop.png`, `design/mock-phone.png` and `design/header-mock.html` first; match them
- [ ] `design/header-scene.mjs` becomes `scripts/header-art.mjs` (comment at the top: run by hand, writes `public/art/header-tide.svg`, commit the result); running it reproduces `design/header-tide.svg` byte for byte at `public/art/header-tide.svg`
- [ ] `SiteHeader.tsx`: the wordmark link holds `<img src="/favicon.svg" width="46" height="46" alt="">`, the word **Tidecaller** and a small kicker **Restoration Shaman**, its accessible name being that visible text; the nav is unchanged (same links, same `aria-current`); under the nav row, a tagline block: a display-font line **"Resto Shaman stat weights and best in slot"** and a smaller line built from `src/site.ts` (add `SITE_TAGLINE` there): **"WoW Forever beta 1.60.1, level 30. Every number is in points of Healing."**. No heading elements in the header (each page keeps exactly one `h1`)
- [ ] CSS (port from the mock into `src/styles/app.css`, replacing the old `header.site` rules): the art as the header's background, `right bottom`, `background-size: max(100%, 2400px) auto` with `#03060d` behind it and `min-height: 270px` on desktop; at `max-width: 640px` the art is `auto 210px`, the tagline's second line hides and the nav fits one row at 400 px; a left-to-right dark overlay keeps the text readable; the wordmark in the display font with the pale-cyan gradient fill and soft glow; nav links light on dark, the current page underlined in cyan; a wave-shaped bottom edge filled with `var(--bg)` so the page flows out of the header in both themes; in print the header loses the art and prints as plain text
- [ ] The header looks the same in the light and dark themes (only the wave edge follows `--bg`); focus outlines on the header links stay visible on the dark art
- [ ] Smoke (beside the existing header checks): on `/`, `/bis` and an item page the header's computed `background-image` contains `header-tide.svg` and `GET /art/header-tide.svg` answers 200 with `image/svg+xml`; the tagline text is in the header; the wordmark image loads (`naturalWidth > 0`); at 400 px wide there is no sideways scroll and every nav link is inside the viewport; the page still has exactly one `h1`
- [ ] `npm run typecheck`, `npm test`, `npm run build` and `npm run smoke` pass

### US-003: Social cards with the art and the totem
**Description:** As someone sharing a Tidecaller link, I want the preview card to carry the same art and icon, so the link looks like the site.

**Acceptance Criteria:**
- [ ] `scripts/og.mjs`: the five 1200 x 630 cards keep their text (kind, line, foot) and layout, and gain the header art along the bottom (anchored right bottom, about the lower 40% of the card, the text kept clear of the totems) and the totem badge (about 96 px) beside the wordmark; the old left bar goes
- [ ] Run it and commit `public/og/*.png`; each stays 1200 x 630 (the IHDR test from US-001 covers them too) and under 300 KB
- [ ] `npm run typecheck`, `npm test` and `npm run build` pass

### US-004: Item facts: equip text, notes and where it comes from
**Description:** As a developer, I want one place that splits an item's extra text into equip effect and note, and shortens its source to a place, so the table and the popup say the same thing.

**Acceptance Criteria:**
- [ ] New `src/lib/itemFacts.ts` exporting `equipText(item)`, `noteText(item)` and `whereShort(item)`, following the PRD's research findings (the rule for equip and note; the "where" labels)
- [ ] Tests: every row of the PRD's "where" table, by item; for every one of the 155 items `whereShort` is one of: a kind alone (`World drop`, `Quest`, `Shaman quest`, `Vendor`, `Reputation`, `Unknown`), `Crafted, <profession>`, `<kind>, <place>`, or `<place>`, and every `<place>` appears verbatim in that item's `source` (the guard that nothing is invented)
- [ ] Tests: every item with `other` gets exactly one of equip or note; Tidebringer's Claw's equip is "+2% crit on Healing Wave and Lesser Healing Wave"; Satchel of Potions's equip is "Use: random potion"; Painwalker Buckler's equip is "Proc when struck: 12 mp5 for 10 sec"; Ghostly Mantle's note is "Nerfed Oct 8"; Runemender's Seal's note is "Unique"
- [ ] `npm run typecheck`, `npm test` and `npm run build` pass

### US-005: The items page shows every stat in columns
**Description:** As a player, I want the items page to show each item's level, stats, equip effect and where it drops beside its score, so I can compare gear at a glance.

**Acceptance Criteria:**
- [ ] `/items` keeps one table per slot, in slot order, and each table's columns are: **Item**, **Lvl**, **Int**, **Spr**, **SP**, **Heal**, **MP5**, **Equip**, **Where**, **Score**. Headers use `abbr` titles (Required level, Intellect, Spirit, Spell Power, Healing, Mana per 5 seconds, Dungeon boss score in points of Healing)
- [ ] Item: the name links to the item page; a small Horde or Alliance tag follows the name when the item is not for both factions (the Faction column goes)
- [ ] Lvl is `req`, blank when 0; the five stats are the spec's numbers, blank when 0; Equip is `equipText`; Where is `whereShort`, with the full `source` as the cell's `title`; Score is the Dungeon boss score as now (one decimal)
- [ ] Numbers right-aligned in the mono font; Equip and Where in smaller text that wraps; on narrow screens the table scrolls sideways inside its box with the Item column sticky, and the page itself never scrolls sideways at 400 px
- [ ] The lead paragraph says what the columns are, that blank means none, and that scores are for a Dungeon boss fight at the calculator defaults
- [ ] Smoke (beside the existing `/items` checks): the Head table's header row reads the ten columns in order; Holy Shroud's row reads Lvl 27, Heal 33, Spr 6, Where "World drop", Score 38.9; Tidebringer's Claw's Equip shows "+2% crit on Healing Wave and Lesser Healing Wave"; at 400 px there is no page-level sideways scroll
- [ ] `npm run typecheck`, `npm test`, `npm run build` and `npm run smoke` pass

### US-006: Item popups on every item link
**Description:** As a player, I want to hover or tab to any item name on the site and see its stats in a popup, like Wowhead's, without leaving the page.

**Acceptance Criteria:**
- [ ] A small script, its own Vite entry (for example `src/tips/tips.ts`), built, hashed and loaded with `<script type="module">` on **every** page including `/`; the prerender writes the tag with the hashed path. No framework, no third-party request; the item data it needs is bundled in. Under 12 KB gzipped (a test or build check reads the built file's gzip size)
- [ ] It works by event delegation on `document` for `a[href^="/items/"]`, so links React renders later on `/` get popups too. On devices with hover: show after about 80 ms of hovering, place it beside the pointer, keep it inside the viewport (flip left or up near an edge), hide on leave. On keyboard focus: show beside the link, hide on blur or Escape. On touch: no popup (a tap opens the item page as now)
- [ ] The popup (`role="tooltip"`, the link gets `aria-describedby` while it shows) reads like a WoW tooltip, from spec section 12 and `itemFacts` only: the name; the slot, with the armor type on the right when not "-"; the stats that are not 0 (`+6 Spirit`, `+33 Healing`, `+12 Spell Power`, `+3 MP5`, `+11 Intellect`, `+4 Stamina`), Healing, Spell Power and MP5 in green; the equip text in green; "Requires level N" when `req` > 0; the note in muted text; "Source: ..." with the full source; "Horde only" or "Alliance only"; "Only a Tailoring crafter can wear it" style text for `prof` (Engineering: "Needs Engineering to use"). No score in the popup (the calculator's scores follow the visitor's own settings)
- [ ] Styled dark navy with a thin blue-grey border and soft shadow in both themes, the name in the display font, max width about 320 px, never covering the pointer; no animation when `prefers-reduced-motion` is set
- [ ] SEO test: `script[type="module"]` count is the app script only where `hydrate` is true plus exactly one popup script on every page; update the root `CLAUDE.md` SEO rule sentence "Only the calculator page hydrates; content pages ship no app JavaScript." to add that every page also loads the small item popup script, and nothing else in that file
- [ ] Smoke (beside the item link checks of each page): on `/items` hovering "Holy Shroud" shows a popup containing "+33 Healing", "+6 Spirit", "Requires level 27" and "World drop / auction house" and hides on mouse out; focusing the link with the keyboard shows it and Escape hides it; on `/` hovering an item name in the best set shows a popup; at 400 px a popup near the right edge stays inside the viewport
- [ ] `npm run typecheck`, `npm test`, `npm run build` and `npm run smoke` pass; `npm run reference` still 26 of 26 (the calculator page now loads a second script)

### US-007: View on Wowhead from each item page
**Description:** As a player, I want a link from an item's page to the same item on Wowhead, so I can see its model, icon and comments there.

**Acceptance Criteria:**
- [ ] Read `docs/spec.md` section 14.5 first. `scripts/extract-spec-data.mjs` also extracts its JSON block to `src/data/wowhead.json`; the existing test that the data files equal the spec covers it
- [ ] Tests: every key in `wowhead.json` is an item name in `items.json`; every value is a positive integer; no two items share an ID; Holy Shroud is 2721 and Tidebringer's Claw is 280605; Invoker's Mantle has none
- [ ] Item page, in "Where it comes from": when the item has an ID, a link **"View <item name> on Wowhead"** to `https://www.wowhead.com/forever/item=<ID>` (opens in a new tab, `rel="noopener noreferrer"`), followed by one sentence: Wowhead's numbers can differ from Tidecaller's, which come from the Forever beta client, build 1.60.1. No link when there is no ID. The internal-link checks still pass (external `https://` links are allowed)
- [ ] About page sources list: Wowhead's Forever database, used only for the "View on Wowhead" links; its stats are not used
- [ ] Smoke: `/items/holy-shroud` links to `https://www.wowhead.com/forever/item=2721`; `/items/invokers-mantle` has no Wowhead link
- [ ] `npm run typecheck`, `npm test`, `npm run build` and `npm run smoke` pass

### US-008: Say what the boxes beside Water Shield and the talent are
**Description:** As a player, I want the number boxes beside Water Shield and the Spirit regen talent to say what they are, so I know Water Shield's 5 is my crit chance.

**Acceptance Criteria:**
- [ ] The box beside Water Shield shows a visible label **"Crit %"** (small, above or beside the box) and the box beside the Spirit regen talent shows **"Kept %"**; their accessible names stay "Heal crit chance, percent" and "Share kept while casting, percent"
- [ ] Water Shield's description reads: "Each heal crit returns 2% of max mana. Enter your heal crit chance; 5% is the default."
- [ ] Layout holds at 400 px and in both themes; disabled states still grey the label with the box
- [ ] Smoke (beside the regen panel checks): the visible text "Crit %" sits within 60 px of `#crit`; "Kept %" within 60 px of `#pct`
- [ ] `npm run typecheck`, `npm test`, `npm run build`, `npm run smoke` and `npm run reference` (26 of 26) pass

## Non-Goals

- No item level or armor value columns (not in the spec; Open Questions).
- No Wowhead tooltip script and no Wowhead data on the site beyond the link.
- No sorting or filtering on the items page (it stays a content page).
- No animation in the header art.
- No change to any game number, to the model, or to the item list.

## Open Questions

- **Item level and armor (AC):** Tom asked for both columns. The spec has neither. He can send the
  values from his client, or rule that Wowhead's Forever pages may be the source for these two
  fields; either way they go into the spec first, then a small follow-up adds the columns.
- **The 44 items with no Wowhead ID:** the lookup hit the session's search limit. A later turn can
  fill most of them into spec section 14.5; the link then appears with no code change.
