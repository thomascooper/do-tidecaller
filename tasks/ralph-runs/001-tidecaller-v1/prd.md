# PRD: Tidecaller v1, the calculator and the site around it

## Introduction

Tom, 18 Oct 2026: *"this is a BIS finder for restoration shaman in wow forever i have provided a
spec ... build this from the ground up so that if i decide to turn this into a real website with
traffic that as a site it functional well for discovery and organic traffic etc"*, and *"this is a
module in a bigger web app, each will stand on their own"*. It goes live at
**https://tidecaller.drunkenoath.com**.

`docs/spec.md` is the build spec. It describes a single-page calculator (inputs, stat weights, heal
rank table, best set and item scorer) and includes a working single-file reference implementation
(section 13). **The calculator must match that reference's behaviour and the section 7 numbers
exactly.** This PRD adds what the spec leaves to the builder: a site around the calculator that
search engines can crawl, index and rank, so a Resto Shaman searching for their best gear, their
stat weights, or how Spirit and downranking work in Forever lands on Tidecaller.

**What a player can do after this that they cannot now:** open one link, see their best level 30
Resto Shaman gear for every slot and why, tune the stat weights to their own character and fight,
and find each item, slot ranking and mechanic as its own page from a search engine.

## Goals

- The calculator at `/` reproduces the reference implementation and every spec section 7 value.
- Every page is prerendered, crawlable HTML: a best-in-slot page, a page per slot, a page per item,
  three mechanics guides, an about page, a sitemap and robots file.
- Every page carries complete, unique metadata and structured data, enforced by tests.
- Fast on a phone: content pages ship no app JavaScript; the calculator ships one small bundle.
- Works at 400px wide with no horizontal page scroll, in light and dark themes.
- Deploys to Vercel as a static build with no environment variables required.

## Research findings the spec leaves implicit (read before the stories they touch)

**All section 7 numbers reproduce.** A Python port of section 5 was run on the spec's data on
18 Oct: Dungeon boss weights MP5 2.754, Int 1.754, Spirit 0.948, k 0.550, E 3749.8, h 526.929,
X 3.935, Water Shield 2.223 per cast, 18.96 casts, and the full best set to the cent (total 422.62,
main hand + off hand 111.59 against Wind Spirit Staff 85.17). If a test disagrees, the code is wrong.

**The curve fit in the calibration panel is NOT the curve default, and both are right.** The spec's
curve defaults (cap 114.0, B 2666) are the least-squares fit to **all twelve** readings, including
the 43 Spirit one. The calibration textarea is prefilled with the 43 reading commented out, so the
panel's own fit of the **eleven** active readings is cap **115.1**, B **2750**, worst miss **2.4**
MP5, and its line fit is base **30.5**, **0.626** per Spirit, worst miss **0.6** (0.563). Pin both in
tests: fitting the eleven gives 115.1 / 2750 / 30.5 / 0.626; fitting all twelve gives
113.95 / 2666 (worst miss 2.67). Do not change `DEFAULTS` to the eleven-reading curve fit.

**Reference behaviours that are easy to miss** (from spec section 13's script):
- `imphw` (Improved Healing Wave) shortens the cast only for Healing Wave ranks: ids starting with
  `hw`. `lhw1` and `lhw2` do not start with `hw`. It changes heal per second only.
- Heal per second uses `max(castTime, 1.5)` (the global cooldown floor).
- When the chosen rank is not known at the chosen level (`lvl > level`), the selection falls back
  to the highest Healing Wave rank known at that level.
- An input only commits a finite number; a field being typed in is not overwritten. Level is
  rounded and clamped to 1..60. `maxlvl` shows the effective level (`maxlvl > 0 ? maxlvl : level`)
  when not focused; typing commits `v > 0 ? clamp(round(v), 1, 60) : 0`.
- Rank edits (`eb`, `ec`, `et`) only commit values that are finite and greater than 0.
- The priority line includes Stamina only when its weight is above 0. Neighbours are joined with
  `=` when they differ by at most `max(0.03, 3% of the larger)`, else `>`.
- Weight bar width is `weight / max weight`; non-finite weights display as 0 and format as `–`.
- `fmt` uses `toLocaleString("en-US")` with fixed decimals, so output is the same in Node and every
  browser. Keep that: the prerendered HTML and the hydrated page must agree.
- Best set: the same item name is never used twice (two identical ring names cannot both fill the
  two Finger slots). The weapon note reads "Main hand and off hand beat the best two-hander by X"
  or "Two-hander beats the best main hand and off hand by X" (one decimal), and is empty when there
  is no two-hander or no one-handed option.
- `srcCell`: `source · <prof>, maker only[ to use, for Engineering] · <other> · <faction if not Both>`.
- User items: id `"u" + Date.now()`, `custom: true`, `faction: "Both"`, `req: 0`,
  `source: "Added by you"`. Only items whose id starts with `u` are saved and loaded.

**Data checks, run 18 Oct:** 12 spells and 155 items. Slots: Hands 13; Neck, Shoulder, Feet, Off
hand 12 each; Head, Back, Chest, Waist, Legs, Finger 11 each; Wrist 9; Trinket 9; Two-hand 5; Main
hand 5. Factions: Both 117, Alliance 19, Horde 19. Professions: Leatherworking 13, Tailoring 9,
Engineering 1, Enchanting 1. Armor values: `-`, `Cloth`, `Leather`, `Shield`. All 155 names are
unique and slugify to 155 unique slugs. The longest name is 30 characters.

**Known spells at level 30** are hw1 to hw5, lhw1 and lhw2: seven rows in the rank table.

## Architecture (the stories build toward this; keep to it)

**Static, prerendered, multi-page.** Each URL is its own HTML file written at build time by
rendering React to a string. Only the calculator page hydrates. Content pages are plain HTML and
CSS: navigation between pages is ordinary links, which is what crawlers and phones handle best.

```
index.html               Vite template: <!--app-head--> in <head>, <div id="root"><!--app-html--></div>,
                         and <script type="module" src="/src/entry-client.tsx">
src/site.ts              SITE_URL "https://tidecaller.drunkenoath.com", SITE_NAME "Tidecaller",
                         DATA_VERSION "World of Warcraft: Forever beta, build 1.60.1",
                         DATA_UPDATED "2026-10-18", PARENT_SITE {name "Drunken Oath",
                         url "https://drunkenoath.com", link false}
src/data/                items.json, spells.json (verbatim from the spec), index.ts (typed, ids, slugs)
src/lib/                 types.ts, model.ts (all math, pure), storage.ts, share.ts, format.ts, slug.ts,
                         and their *.test.ts files
src/calculator/          the calculator: state hook and panels
src/pages/               one component per page type
src/components/          Layout, SiteHeader, SiteFooter, Breadcrumbs, shared tables
src/seo/                 head tag and JSON-LD builders
src/routes.tsx           THE route table: path, title, description, ogImage, hydrate, noindex,
                         breadcrumbs, jsonLd, render(). Feeds the prerender, sitemap and SEO tests.
src/entry-client.tsx     production: hydrateRoot the calculator into #root on "/" only.
                         dev (import.meta.env.DEV): client-render whatever route matches
                         location.pathname via a dynamic import, so every page works in npm run dev
                         and none of the content pages land in the production bundle
src/entry-server.tsx     exports routes and renderDocument(route, template) -> full HTML string
scripts/prerender.mjs    reads dist/index.html as the template, imports dist-ssr/entry-server.js,
                         writes dist/<path>/index.html for every route, dist/404.html,
                         dist/sitemap.xml, dist/robots.txt
scripts/serve-dist.mjs   a tiny static server that behaves like Vercel with this vercel.json:
                         /x serves dist/x/index.html, /x/ redirects 308 to /x, unknown paths serve
                         dist/404.html with status 404
test/smoke.mjs           Playwright (playwright-core, executablePath from CHROMIUM_PATH) against
                         serve-dist on a fixed port
vercel.json              cleanUrls, trailingSlash false, headers
```

`package.json` scripts once complete: `dev` (vite), `build` (vite build, then
`vite build --ssr src/entry-server.tsx --outDir dist-ssr`, then `node scripts/prerender.mjs`),
`preview` (`node scripts/serve-dist.mjs`), `typecheck` (`tsc --noEmit`), `test` (`vitest run`),
`smoke` (`npm run build && node test/smoke.mjs`). Node 22 or later (`engines`).

**Styling:** plain CSS ported from the reference (`src/styles/`), the same tokens, class names and
look, light and dark via `prefers-color-scheme` (keep the `data-theme` overrides from the reference).
Fonts are self-hosted with `@fontsource` (Marcellus SC 400, IBM Plex Sans 400/500/600, IBM Plex Mono
400/500), never Google Fonts at runtime: no third-party requests, better Core Web Vitals.

**Hydration rule:** the server render uses `DEFAULTS` and no user items. Anything that reads
`localStorage` or the URL runs in an effect after hydration, so the first client render matches the
HTML exactly and React reports no hydration mismatch.

**Default scores on static pages** are computed at build time with `DEFAULTS` (level 30, Horde, no
professions) under each fight preset: Trash pull (t 90, f 70), Dungeon boss (t 120, f 90, the
default) and Raid boss (t 300, f 100). Dungeon boss is the headline number everywhere.

## Pages, titles and descriptions

Titles are exact. Descriptions are templates; every one must be 70 to 160 characters after
filling in (the SEO tests enforce it).

| Path | Title | h1 |
|---|---|---|
| `/` | Resto Shaman Stat Weights & BiS (WoW Forever) \| Tidecaller | Tidecaller Stat Weights |
| `/bis` | Resto Shaman BiS, Level 30 WoW Forever \| Tidecaller | Resto Shaman best in slot, level 30 |
| `/bis/<slot>` (15) | Best Resto Shaman {Slot}, Level 30 WoW Forever \| Tidecaller | Best Resto Shaman {slot} gear, level 30 |
| `/items` | Resto Shaman Gear List, Level 30 WoW Forever \| Tidecaller | Every Resto Shaman item, level 30 |
| `/items/<slug>` (155) | {Item name}, Resto Shaman Value \| Tidecaller | {Item name} |
| `/guides` | Resto Shaman Guides for WoW Forever \| Tidecaller | Resto Shaman guides |
| `/guides/stat-weights` | Resto Shaman Stat Weights Explained, WoW Forever \| Tidecaller | How Resto Shaman stat weights work |
| `/guides/spirit-regen` | Spirit and Mana Regen in WoW Forever \| Tidecaller | Spirit and mana regen in Forever |
| `/guides/downranking` | Healing Wave Downranking in WoW Forever \| Tidecaller | Healing Wave downranking |
| `/about` | About Tidecaller: Sources and Data Version | About Tidecaller |
| 404 | Page not found \| Tidecaller (noindex) | Page not found |

Slot slugs: `head neck shoulder back chest wrist hands waist legs feet finger trinket main-hand
off-hand two-hand`; title-case slot names in titles ("Main Hand"). Item slugs: lowercase, remove
apostrophes, every other run of non-alphanumerics becomes `-`, trimmed (`Scorn's Icy Choker` ->
`scorns-icy-choker`).

Head tags on every page: `<html lang="en">`, charset, viewport, title, meta description, canonical
(`SITE_URL + path`, home is `SITE_URL + "/"`, no other trailing slashes), `og:type` (website for
home, article otherwise), `og:site_name`, `og:title`, `og:description`, `og:url` (= canonical),
`og:image` (absolute, 1200x630), `twitter:card` summary_large_image, `theme-color` for light and
dark, icons and manifest, and JSON-LD in `<script type="application/ld+json">` with `<` escaped as
`<`. Structured data: WebSite + WebApplication on home; BreadcrumbList on every other page;
Article (headline, description, dateModified DATA_UPDATED, publisher Tidecaller) on `/bis`, slot
pages and guides. No Product, Offer or Review markup on item pages: they are not products for sale.

Every page has the site header (wordmark "Tidecaller" linking `/`, nav: Calculator `/`, Best in
slot `/bis`, Items `/items`, Guides `/guides`, About `/about`), a skip link to main content, and the
site footer: the data version, "Not affiliated with Blizzard Entertainment. World of Warcraft is a
trademark of Blizzard Entertainment.", links to the main sections, and "Part of Drunken Oath"
(plain text while `PARENT_SITE.link` is false, a link when true).

## User Stories

Runs: **Run 1** US-001 to US-005 (scaffold, data, model). **Run 2** US-006 to US-012 (calculator
UI). **Run 3** US-013 to US-017 (prerender, SEO framework, BiS, slot and item pages). **Run 4**
US-018 to US-023 (guides, sitemap, icons, share links, analytics, CI, docs).

### US-001: Scaffold the Vite + React + TypeScript project
**Description:** As the builder, I need a working project skeleton so every later story has the same
commands, styles and fonts.

**Acceptance Criteria:**
- [ ] `package.json` (name `tidecaller`, private, `"type": "module"`, `engines.node` ">=22") with React 19, Vite, `@vitejs/plugin-react`, TypeScript, Vitest; scripts `dev`, `build` (for now `vite build`), `preview`, `typecheck` (`tsc --noEmit`), `test` (`vitest run`). A committed `package-lock.json`
- [ ] `tsconfig.json` strict, `jsx: react-jsx`, `resolveJsonModule`, Vite client types; `vite.config.ts` with the React plugin and Vitest config (environment node)
- [ ] `index.html` template with `<html lang="en">`, `<!--app-head-->` inside `<head>`, `<div id="root"><!--app-html--></div>`, and the module script `/src/entry-client.tsx`; for now `entry-client.tsx` client-renders an `<h1>Tidecaller Stat Weights</h1>` placeholder
- [ ] `src/styles/` holds the reference's CSS ported verbatim in look: the `:root` tokens, the dark tokens under `@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme="light"])` and again under `:root[data-theme="dark"]`, an explicit `body` background, and the reference's component classes. Imported from `entry-client.tsx`
- [ ] Fonts self-hosted with `@fontsource/marcellus-sc`, `@fontsource/ibm-plex-sans` (400, 500, 600) and `@fontsource/ibm-plex-mono` (400, 500); the `--f-display`, `--f-body`, `--f-mono` tokens name them. `grep -r "fonts.googleapis" dist` finds nothing after a build
- [ ] `.gitignore` covers `node_modules`, `node_modules/`, `dist`, `dist-ssr`, `.vercel`, `*.log`, `coverage`, `test-results`
- [ ] One trivial Vitest test exists so `npm test` runs
- [ ] `npm run typecheck`, `npm test` and `npm run build` pass

### US-002: Data files and typed data module
**Description:** As the builder, I need the spec's spells and items as typed data with stable ids and slugs, so the model and every page read one source.

**Acceptance Criteria:**
- [ ] `scripts/extract-spec-data.mjs` reads `docs/spec.md`, takes the JSON code block under "## 11. Data: spells.json" and the one under "## 12. Data: items.json (155 items)", and writes them pretty-printed to `src/data/spells.json` and `src/data/items.json` byte-for-byte equal in content to the spec (same order, same fields). Run it and commit its output; it is kept so a spec update can be re-extracted
- [ ] `src/lib/types.ts`: `Slot` (the 15 slot strings exactly as in the data), `Faction` ("Both" | "Horde" | "Alliance"), `Profession` ("Tailoring" | "Leatherworking" | "Enchanting" | "Engineering"), `Item` (all data fields, `other`/`prof` optional, plus `id`, `slug`, `custom?`), `Spell` (with optional `warn`)
- [ ] `src/lib/slug.ts`: `slugify(name)` per the PRD's slug rule; `SLOT_SLUGS` mapping each slot to its slug and back
- [ ] `src/data/index.ts` exports `SPELLS`, `ITEMS` (with `id` "db0".."db154" in data order and `slug`), `SLOTS` (the 15 slots in the spec's order: Head, Neck, Shoulder, Back, Chest, Wrist, Hands, Waist, Legs, Feet, Finger, Trinket, Main hand, Off hand, Two-hand), `PROFESSIONS`, `itemBySlug`
- [ ] `src/data/data.test.ts`: 12 spells, unique spell ids; 155 items; the per-slot counts, faction counts and profession counts from the PRD's research findings; every slot, faction, profession and armor value is a known one; names unique; slugs unique; `Scorn's Icy Choker` slugifies to `scorns-icy-choker`; the extractor's output equals the spec's JSON (parse both, deep-equal)
- [ ] `npm run typecheck`, `npm test` and `npm run build` pass

### US-003: The model: regen, spells and stat weights
**Description:** As a player, I want stat weights that follow the spec's model exactly, so the numbers can be trusted.

**Acceptance Criteria:**
- [ ] `src/lib/model.ts` (pure functions, no DOM, no storage) exports: `State` type with every key from spec section 4; `DEFAULTS` exactly as section 4 / the reference (`smodel` "line", `sA` 114.0, `sB` 2666, `sbase` 30.5, `sper` 0.626, `spell` "hw5", `edits` {}, `faction` "Horde", `maxlvl` 0, `profs` {}, `showAll` false, `ws` true, `crit` 5, and the rest); `PRESETS` (trash 90/70, boss 120/90, raid 300/100, with labels "Trash pull", "Dungeon boss", "Raid boss") and `activePreset(state)`; `spellOf(state, id)` applying edits; `spiritRegen`, `spiritMarginal`, `shareKept(L, T)`, `spellCalc(state, spell)`, `compute(state)` returning the same fields as the reference's `compute()` (m, k, sFull, fullMP5, castMP5, avgMP5, E, sp, c, X, wf, spiInMP5, intInMP5, weights, raw, wsBack, intWS, casts); `knownSpells(level)` and `effectiveSpell(state)` (the fallback rule); `priorityLine(weights)` returning the ordered keys and the operators
- [ ] `src/lib/format.ts`: `fmt(x, d)` exactly as the reference (`–` for non-finite, `toLocaleString("en-US")` with fixed decimals)
- [ ] `src/lib/model.test.ts` pins spec section 7 at Horde, level 30, no professions, for all three presets, to 3 decimals: k 0.650 / 0.550 / 0.500; E 3543.5 / 3749.8 / 5747.5 (1 decimal); h 526.929; X 3.123 / 3.935 / 6.418; MP5 2.186 / 2.754 / 4.492; Int 1.854 / 1.754 / 1.156; Spirit 0.889 / 0.948 / 1.406. Also Water Shield 2.223 mana per cast and 18.96 casts at Dungeon boss
- [ ] Tests: `priorityLine` at Dungeon boss defaults reads "MP5 > Intellect > Healing = Spell Power > Spirit"; with `stw` 5 Stamina appears first (5 is above MP5's 2.754); a NaN X (a rank whose share is 0, e.g. hw1 at level 60) is reported so the UI can say "No healing power bonus on this rank"; `shareKept(30, 24)` 1, `shareKept(30, 6)` 0.65, `shareKept(30, 1)` 0.4, `shareKept(60, 1)` 0; `imphw` shortens hw5's heal per second but not lhw2's; `effectiveSpell` at level 20 with spell hw5 falls back to hw4; an edit `{base: 400}` on hw5 changes h
- [ ] `npm run typecheck`, `npm test` and `npm run build` pass

### US-004: The model: item scores, usability and the best set
**Description:** As a player, I want each item scored and the best usable set picked exactly as the spec says, so I know what to wear.

**Acceptance Criteria:**
- [ ] `model.ts` adds `score(item, W)` (non-finite weights count as 0), `maxLevel(state)`, `whyNot(item, state)` returning "" or "Horde only" / "Alliance only", "Needs level N", "Needs <Profession>" checked in that order, `sourceNote(item)` (the reference's srcCell text without HTML), `bestSet(items, W, state)` returning rows in the spec's fill order (two Finger rows, two Trinket rows, then Two-hand or Main hand + Off hand), each with slot, item or null, score; plus `total`, `useTwo`, `pair`, `two`, the best two-hander's name and the weapon note text; never the same item name twice; and `candidates(items, W, state)` grouped by slot in `SLOTS` order, usable first sorted by score, each with its reason, with the top usable one flagged
- [ ] `model.test.ts` pins the spec section 7 best set at Dungeon boss defaults to 2 places: Holy Shroud 38.69, Scorn's Icy Choker 17.52, Death Speaker Mantle 25.29, Darkspear Raider's Cloak 17.83, Death Speaker Robes 39.29, Spidertank Oilrag 17.26, Truefaith Gloves 20.26, Blightleaf Rope 24.54, Violet Sorcerer's Leggings 39.54, Acidic Walkers 22.83, Philanthropist's Ring 18.77, Sea Giant's Toe Ring 18.00, Roogug's Severed Head 5.69, Worgenbane Talisman 5.51, Tidebringer's Claw 86.00, Forcestone Buckler 25.59; main hand + off hand 111.59 beats Wind Spirit Staff 85.17; total 422.62
- [ ] Tests: with faction Alliance no Horde-only item is picked and Forcestone Buckler's reason is "Horde only"; with `maxlvl` 25 no item above req 25 is picked; a Tailoring item is unusable ("Needs Tailoring") until `profs.Tailoring` is true; a user item named like an existing ring cannot fill both Finger rows
- [ ] `npm run typecheck`, `npm test` and `npm run build` pass

### US-005: Calibration fits, storage and share encoding
**Description:** As a player, I want my settings and items kept between visits and my Spirit readings fitted, and the code for both must never break the page.

**Acceptance Criteria:**
- [ ] `model.ts` adds `lsq(xs, ys)` -> {a, b, worst} (as the reference), `parseReadings(text)` (lines starting with `#` ignored, split on whitespace, comma or semicolon, Spirit > 0 and both finite), `fitSpirit(readings)` -> line {base, rate, worst} and curve {cap, B, worst} (curve fitted on x = 1/Spirit, B = minus the slope) or null when fewer than two distinct Spirit values, `castingShare(N, C, g)` -> (C - g) / (N - g) or null when N - g <= 0, and `DEFAULT_READINGS` (the textarea text from the reference, 43 commented out)
- [ ] Tests (see research findings): the eleven default readings fit line base 30.5 and rate 0.626 (to 0.001) with worst miss under 0.6, and curve cap 115.1 and B 2750 (rounded as the apply buttons round) with worst miss 2.4 (1 decimal); all twelve readings fit curve cap 113.95 and B 2666; one reading returns null
- [ ] `src/lib/storage.ts`: KEY `tidecaller-weights-v1`; `loadSaved(storage)` merges saved `state` over `DEFAULTS`, applies the section 8 migration (sbase 37.5 and sper 0.5, or 32.4 and 0.6, or sA 105.5 and sB 2223, or sA 107.9 and sB 2347 -> reset smodel, sA, sB, sbase, sper to defaults), keeps only items whose id starts with `u` and gives them `faction` Both, `req` 0, `source` "Added by you", `custom` true; `save(storage, state, items)`. Every read and write is wrapped in try/catch and works when storage is undefined or throws
- [ ] `src/lib/share.ts`: `encodeShare(state, items)` -> base64url of JSON `{v:1, s: keys that differ from DEFAULTS, i: user items}`; `decodeShare(text)` -> `{state, items}` merged over DEFAULTS, or null for anything malformed; drops unknown keys and non-matching types; if the encoded string would exceed 6000 characters, items are left out and a flag says so
- [ ] Tests for each migration case, a throwing storage (load returns defaults, save does not throw), garbage JSON in storage, share round trip with edits, profs and an item, and malformed share strings returning null
- [ ] `npm run typecheck`, `npm test` and `npm run build` pass

### US-006: Calculator shell, state, Character and Fight panels, and the smoke harness
**Description:** As a player, I want to enter my character and fight and have my settings remembered.

**Acceptance Criteria:**
- [ ] `src/calculator/useCalculator.ts`: one reducer holding `state` and user `items`, actions for every input in the spec; starts from DEFAULTS; after mount loads saved state (`loadSaved(window.localStorage)` in try/catch) and saves on every change after that
- [ ] Number inputs keep a draft string while focused and commit only finite numbers (research findings); level rounds and clamps to 1..60
- [ ] `Calculator.tsx` renders the reference's top header (h1 "Tidecaller Stat Weights", the subtitle text from the reference, the three preset chips with `aria-pressed` true only when t and f match that preset), the two-column `.main` grid (rail and outputs, single column under 900px), the Character panel (Level, Max mana, Healing power, Spirit, Gear MP5, Buff MP5 and the hint) and the Fight panel (Length, Stamina weight, the two sliders 0 to 100 step 5 with live percentages and their hints), with the reference's labels and copy
- [ ] `scripts/serve-dist.mjs` and `test/smoke.mjs` as described in Architecture; `playwright-core` as a devDependency; the browser comes from `CHROMIUM_PATH` (default `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`); `npm run smoke` builds and runs it, prints each check and a pass count, exits non-zero on any failure, and kills its server
- [ ] Smoke checks on `/`: h1 text; Dungeon boss chip pressed by default; clicking Raid boss sets the Length input to 300 and presses that chip; after reload Raid boss is still pressed (persistence); at 400px wide `document.documentElement.scrollWidth <= innerWidth`; with `colorScheme: 'dark'` the body background is the dark token (rgb(14, 20, 19)); no console errors
- [ ] `npm run typecheck`, `npm test`, `npm run build` and `npm run smoke` pass

### US-007: Stat weights panel
**Description:** As a player, I want to see the stat priority and every weight at a glance.

**Acceptance Criteria:**
- [ ] The Stat weights box matches the reference: "1 Healing = 1.00" note, the verdict line from `priorityLine` with styled operators (or "No healing power bonus on this rank"), the regime text (the three reference sentences), the bars (labels, sub-labels, mana/heal/stam colours, value to 2 places; Stamina row only when its weight is above 0) and the seven readouts (Next 1 Spirit, 1 Intellect, Regen not casting, Regen casting, Average regen, Mana for the fight with casts, Water Shield)
- [ ] Smoke: at defaults the verdict reads "MP5 > Intellect > Healing = Spell Power > Spirit" and the MP5 bar reads 2.75; after Raid boss MP5 reads 4.49; with the run-out-of-mana slider at 0 every mana stat reads 0.00 and the regime text says mana never runs out; Mana for the fight reads 3,750 at defaults
- [ ] `npm run typecheck`, `npm test`, `npm run build` and `npm run smoke` pass

### US-008: Regen panel and Spirit calibration
**Description:** As a player, I want to set my regen talents and calibrate the Spirit formula to my own tooltip readings.

**Acceptance Criteria:**
- [ ] The "Regen while casting" box matches the reference: the talent row (switch, percent input with datalist 17/33/50, disabled while the talent is off), Polished Driftwood Icon, Improved Healing Wave 5/5, and Water Shield (switch, crit input disabled while off), with the reference's copy; switches are real checkboxes with accessible names and visible focus
- [ ] The "Spirit formula and calibration" details: shape select (line or curve; the inactive shape's inputs disabled), cap, B, line base and rate inputs, the hint, the readings textarea prefilled with `DEFAULT_READINGS`, the casting-share inputs, the results line (each fit's parameters and worst miss, the rounding note, the casting share when entered), and the four buttons with the reference's enable rules and rounding (base 0.1, rate 0.001, cap 0.1, B integer, share percent integer; the share button turns the talent on and the icon off); "Restore defaults" resets smodel, sA, sB, sbase, sper
- [ ] Smoke: turning the talent off disables the percent input and changes the Spirit weight; "Use levels-off fit" with the default readings selects the curve shape with cap 115.1 and B 2750; "Restore defaults" returns to the line with 30.5 and 0.626; entering 87 and 53.5 as sheet regen (gear MP5 10) enables the share button and applying it sets the percent to 56
- [ ] `npm run typecheck`, `npm test`, `npm run build` and `npm run smoke` pass

### US-009: Heal rank table and rank editor
**Description:** As a player, I want to compare every heal rank and pick the one I spam, and fix a rank's numbers when the beta changes them.

**Acceptance Criteria:**
- [ ] "The heal you spam" box matches the reference: one row per known rank ("Healing Wave N" / "Lesser HW N"), columns Rank, Learned, Gear bonus kept, Heals, Mana, Heal per mana, Heal per sec; tags "Best per mana", "Check" (warn and not edited) and "Edited"; the selected row highlighted with `aria-selected`; rows selectable by click and by Enter or Space with focus kept on the row; the table scrolls inside its own container
- [ ] The edit details: average base heal, mana cost and base cast time for the selected rank (positive values only), its source text ("Healing Wave 5: Beta tooltip, 328 to 383"), and "Restore this rank"
- [ ] Smoke: seven rows at level 30; selecting Lesser HW 2 changes the selection and the MP5 weight; editing Healing Wave 4's base removes its Check tag and shows Edited, and Restore brings Check back; level 20 makes the selection fall back to Healing Wave 4
- [ ] `npm run typecheck`, `npm test`, `npm run build` and `npm run smoke` pass

### US-010: Best set panel and filters
**Description:** As a player, I want the best usable set for my faction, level and professions, with its total.

**Acceptance Criteria:**
- [ ] The "Best set" box matches the reference: the database note text, the filters (Faction select, "Usable up to level" input showing the effective level, the professions fieldset with four checkboxes, "Show gear you can't use"), and the best set table (Slot, Pick, Score to 1 place, Where it comes from) with the Total row and the weapon note; "Nothing usable listed" for an empty slot
- [ ] Smoke: at defaults the total reads 422.6, Main hand is Tidebringer's Claw and Off hand is Forcestone Buckler, and the weapon note says main hand and off hand beat the best two-hander by 26.4; switching to Alliance replaces Forcestone Buckler; ticking Tailoring changes at least one pick to a Tailoring item or the test records in progress.txt which picks it changes (measure, then pin what you measured)
- [ ] `npm run typecheck`, `npm test`, `npm run build` and `npm run smoke` pass

### US-011: Every candidate table and adding your own items
**Description:** As a player, I want to see every item per slot with its score, and add items the list does not have.

**Acceptance Criteria:**
- [ ] "Every candidate" matches the reference: grouped by slot, usable items first by score with the top one tagged "Top", zero stats shown as a muted dot, columns Item, Req, Healing, Spell Pwr, MP5, Int, Spirit, Stam, Score, Where it comes from, and the remove column; with "Show gear you can't use" on, unusable items are dimmed with their reason; "Nothing usable with these filters." when empty
- [ ] The "Add your own item" form (name required, slot select of the 15 slots, the six stats) adds an item with the PRD's user-item defaults, tagged "Yours", with a Remove button; added items are saved and come back after reload
- [ ] Smoke: adding "Smoke Test Mace", Main hand, Healing 500 makes it the Main hand pick in the best set and it shows "Yours"; it survives reload; Remove takes it out of both tables; with Show gear you can't use on, Giantstone Medallion shows "Alliance only"
- [ ] `npm run typecheck`, `npm test`, `npm run build` and `npm run smoke` pass

### US-012: Calculator footer, accessibility and phone pass
**Description:** As a player on a phone or using a keyboard, I want the whole calculator usable, with the method explained.

**Acceptance Criteria:**
- [ ] The calculator's explanation block from the reference's `.foot` ("How it works", "Downranking", "Unconfirmed"), word for word
- [ ] Every input, select and textarea on `/` has an accessible name; focus is visible on every control (`:focus-visible` outline); tables use tabular numbers; motion respects `prefers-reduced-motion`
- [ ] At 400px: no horizontal page scroll with every details panel open and "Show gear you can't use" on; wide tables scroll inside `.scroll`; the add-item form wraps as the reference's media query does
- [ ] Smoke: the accessible-name check over every form control; the 400px check with all panels open; a keyboard check that Tab reaches the preset chips and Enter on a rank row selects it
- [ ] `npm run typecheck`, `npm test`, `npm run build` and `npm run smoke` pass

### US-013: Prerender the calculator page with full head tags
**Description:** As a search engine, I want the calculator page's content and metadata in the HTML before any script runs.

**Acceptance Criteria:**
- [ ] `src/site.ts`, `src/seo/` (head tag builder and JSON-LD builders with `<` escaped), `src/routes.tsx` (the route table with `/` only for now), `src/entry-server.tsx` (`routes`, `renderDocument(route, template)`), `scripts/prerender.mjs`, and the three-step `build` script, all as in the Architecture section
- [ ] `/` gets the PRD's title, a description of 70 to 160 characters, canonical `https://tidecaller.drunkenoath.com/`, Open Graph and Twitter tags (og:image may point at `/og/home.png`, which US-020 creates; until then the SEO test allows a missing og image file but not a missing tag), theme-color for light and dark, and WebSite + WebApplication JSON-LD (name, url, applicationCategory "UtilitiesApplication", operatingSystem "Any", isAccessibleForFree true, description)
- [ ] Below the calculator and before its explanation block, a short static "What Tidecaller does" section (two or three short paragraphs drawn from spec sections 1 and 9, no new game facts) for searchers who land on `/`
- [ ] `entry-client.tsx` hydrates `/` with `hydrateRoot` in production and client-renders in dev; saved state still loads after mount
- [ ] `test/seo.test.ts` (Vitest) renders every route through `renderDocument` with a stub template and checks, for every route: title present, unique and at most 65 characters; description unique and 70 to 160 characters; exactly one h1; canonical absolute on SITE_URL matching the route; og:url equals canonical; og:title, og:description, og:image (absolute), og:type, twitter:card present; every JSON-LD block parses; `<html lang="en">`. Use a small HTML parser devDependency (for example `node-html-parser`)
- [ ] Smoke: the raw HTML of `/` fetched without a browser contains the h1, "Tidebringer's Claw" and "MP5 > Intellect"; in Chromium the page hydrates with no console errors or hydration warnings and Raid boss still works; the calculator's JavaScript referenced by `dist/index.html` totals under 120 KB gzipped (the smoke measures it with zlib and prints the number)
- [ ] `npm run typecheck`, `npm test`, `npm run build` and `npm run smoke` pass

### US-014: Site layout, About page, 404 and vercel.json
**Description:** As a visitor, I want consistent navigation on every page and a helpful About page, and the host must serve clean URLs.

**Acceptance Criteria:**
- [ ] `Layout`, `SiteHeader`, `SiteFooter` and `Breadcrumbs` (with a BreadcrumbList JSON-LD builder) as described in "Pages, titles and descriptions"; the calculator page gets the site header and footer too, above and below its own header
- [ ] The header nav and footer links are built from the route table and show only sections whose route exists, so they grow as later stories add `/bis`, `/items` and `/guides` (a link to a missing route fails the SEO test)
- [ ] Routes declare `hydrate`; the prerender removes the module script and modulepreload links from pages with `hydrate: false`, keeping the stylesheet. The SEO test asserts no `<script type="module"` on any `hydrate: false` page
- [ ] `/about`: what Tidecaller is and who it is for, how the numbers are made (one paragraph, link to the calculator), the data version and DATA_UPDATED, the unconfirmed list from spec section 3, every source from spec section 10 as a link, a privacy note (no accounts, settings stay in the visitor's browser), and the trademark disclaimer
- [ ] A 404 page rendered to `dist/404.html` with `<meta name="robots" content="noindex">`, h1 "Page not found" and links to the main sections; the route table marks it `noindex`
- [ ] `vercel.json`: `cleanUrls` true, `trailingSlash` false, `framework` "vite", `buildCommand` "npm run build", `outputDirectory` "dist"; headers: `/assets/(.*)` Cache-Control `public, max-age=31536000, immutable`; every path `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and `Content-Security-Policy: frame-ancestors 'self' https://drunkenoath.com https://*.drunkenoath.com` (so a future Drunken Oath hub may embed the module)
- [ ] The SEO test also checks: every internal `<a href>` on every page resolves to a route path or a file in `public/` (ignoring `#` and `?` parts); every non-home indexable page has a BreadcrumbList whose last item is its canonical URL
- [ ] Smoke: `/about` returns 200 with its h1 and no module script; `/about/` redirects 308 to `/about`; `/no-such-page` returns 404 with "Page not found"; the header nav is present on `/` and `/about`
- [ ] `npm run typecheck`, `npm test`, `npm run build` and `npm run smoke` pass

### US-015: The best-in-slot page
**Description:** As a Resto Shaman searching for "resto shaman bis wow forever", I want one page with the best set for my faction and why.

**Acceptance Criteria:**
- [ ] `/bis` with the PRD's title and h1, an intro naming the settings used (level 30, the default character and the Dungeon boss fight, linking to the calculator to change them), the Horde best set and the Alliance best set (Slot, Item linking to its item page once US-017 exists, otherwise plain text; Score; Where it comes from), each with its total and weapon note, computed at build time with `bestSet`
- [ ] A "Does it change for other fights?" section listing the slots whose pick differs under Trash pull and under Raid boss (Horde), or saying none do
- [ ] A "Crafter upgrades" section: for each of the four professions, the slots whose Horde pick changes when that profession is ticked, with the new item and the score gained, or "No change"
- [ ] No links to slot, item or guide pages yet: those pages do not exist until US-016 to US-019, and the SEO test fails on a link to a missing route. Each later story adds its links here
- [ ] The calculator's "What Tidecaller does" section links to `/bis`
- [ ] Article and BreadcrumbList JSON-LD; the description template names the top picks
- [ ] Smoke: `/bis` shows Holy Shroud 38.7 and a Horde total of 422.6 and contains no module script
- [ ] `npm run typecheck`, `npm test`, `npm run build` and `npm run smoke` pass

### US-016: A page for every slot
**Description:** As a player searching for the best item in one slot, I want a page ranking every candidate for it.

**Acceptance Criteria:**
- [ ] 15 routes `/bis/<slot>` generated from `SLOTS`, each with the PRD's title and h1, a one-sentence answer up top (the top Horde pick and the top Alliance pick with their Dungeon boss scores), and a table of every item in the slot sorted by Dungeon boss score: Item, Req, Healing, Spell Pwr, MP5, Int, Spirit, Stam, Trash, Dungeon, Raid, Faction, Where it comes from (with the profession note and the other note)
- [ ] Finger and Trinket pages say you wear two; Main hand, Off hand and Two-hand pages state the two-hander against main hand + off hand comparison with its numbers and link to each other
- [ ] Previous and next slot links, a link back to `/bis`, Article and BreadcrumbList JSON-LD (Tidecaller, Best in slot, the slot)
- [ ] `/bis` gains a "Best in slot by slot" section linking all 15 slot pages, and each slot name in its best set tables links to its slot page
- [ ] Smoke: `/bis/head` lists Holy Shroud first with Dungeon 38.7; `/bis/main-hand` names Tidebringer's Claw; every slot page returns 200
- [ ] `npm run typecheck`, `npm test`, `npm run build` and `npm run smoke` pass

### US-017: Item pages, the item index, and links from the calculator
**Description:** As a player who searched an item's name, I want a page saying what it is worth to a Resto Shaman and where it comes from.

**Acceptance Criteria:**
- [ ] 155 routes `/items/<slug>` with the PRD's title and h1; a lead sentence ("{Name} is a {armor} {slot} item {for level N and up | with no level requirement}. At Tidecaller's default settings it is worth {score} points of Healing to a level 30 Resto Shaman, {rank} of {n} {slot} items."; omit the armor word when armor is "-"); a stats table of the non-zero stats and the `other` note; a "By fight" table (Trash pull, Dungeon boss, Raid boss: score and rank in slot); "Who can use it" (faction in words, level, profession rule from spec section 7); "Where it comes from" (source); "In this slot" (the top item and the gap when this is not it, and up to three items ranked just above and below, as links); a link to `/bis/<slot>` and to the calculator; BreadcrumbList JSON-LD (Tidecaller, Items, the item). No Product markup
- [ ] `/items`: every item grouped by slot in `SLOTS` order with its Dungeon boss score, faction and a link; BreadcrumbList JSON-LD
- [ ] The best set and every-candidate tables in the calculator, `/bis` and the slot pages link each database item's name to its item page (user items stay plain text)
- [ ] The description template names the slot, the score and the rank and stays within 70 to 160 characters for all 155 items (the SEO test proves it)
- [ ] Smoke: `/items/holy-shroud` shows 38.7 and "1 of 11 Head items"; `/items/forcestone-buckler` says it is Horde only; following the Holy Shroud link from `/bis` lands on its page
- [ ] `npm run typecheck`, `npm test`, `npm run build` and `npm run smoke` pass

### US-018: Guides index, stat weights guide and downranking guide
**Description:** As a player searching how stat weights or downranking work in Forever, I want a clear explanation with real numbers.

**Acceptance Criteria:**
- [ ] `/guides` lists the three guides with one-line summaries (the spirit regen guide's link appears in US-019 when its page exists; until then list only the two built here)
- [ ] `/guides/stat-weights`: what a weight means (points of Healing), the mana-bound idea and why it is scaled by how often mana runs out (spec section 5's "Why it works"), a table of the three presets' weights computed with `compute` (MP5, Intellect, Spirit, with the priority line for each), what moves the weights (fight length, time inside the five-second rule, the regen talent, Water Shield and crit, Stamina as a personal choice), and a link to the calculator. Facts and formulas only from spec sections 3 and 5
- [ ] `/guides/downranking`: the rule `clamp(1 - (L - 17 - T) * 0.05, 0, 1)` explained in words with a worked example, coefficient = base cast time / 3.5 and that Improved Healing Wave shortens the cast but not the coefficient, and a table of every rank in `spells.json` (learned level, average base heal, mana, cast, coefficient, gear bonus kept at levels 20, 25 and 30, heal and heal per mana at level 30 with 200 healing for the ranks known by 30), with unconfirmed values tagged "Check"
- [ ] Article and BreadcrumbList JSON-LD on both guides; the BiS page and the calculator's "What Tidecaller does" section link to the guides that exist
- [ ] Smoke: both guides return 200 with their h1, contain no module script, and the downranking table shows 65% gear bonus kept for Healing Wave 2 at level 30
- [ ] `npm run typecheck`, `npm test`, `npm run build` and `npm run smoke` pass

### US-019: Spirit and mana regen guide with a chart
**Description:** As a player searching how Spirit works in Forever, I want the measured data, the formula and what it means for my gear.

**Acceptance Criteria:**
- [ ] `/guides/spirit-regen`: continuous regen and the five-second rule, gear MP5 working while casting, Mindfulness 17/33/50%, the Polished Driftwood Icon (8%, assumed to add), Intellect not changing Spirit regen and giving 15 mana per point, the twelve measured readings as a table, the fitted line `30.5 + 0.626 x Spirit` and the levels-off alternative with their worst misses, why the 43 reading is excluded, and what is unconfirmed. Facts only from spec sections 3 and 6
- [ ] An inline SVG chart, rendered at build time: the readings as points (43 drawn hollow and labelled "excluded"), the fitted line and the curve, labelled axes (Spirit, MP5 while not casting), a `<title>` and `<desc>`, readable in light and dark, scaling to 400px wide; the table stays as the accessible version of the data
- [ ] `/guides` and the other pages that list guides now link it; Article and BreadcrumbList JSON-LD
- [ ] Smoke: the page returns 200, contains the SVG with 12 points, and has no horizontal scroll at 400px
- [ ] `npm run typecheck`, `npm test`, `npm run build` and `npm run smoke` pass

### US-020: Sitemap, robots, icons, manifest and social images
**Description:** As a search engine or a chat app showing a link preview, I want the files that let me find and present every page.

**Acceptance Criteria:**
- [ ] The prerender writes `dist/sitemap.xml` (every indexable route, absolute URLs, `<lastmod>` DATA_UPDATED) and `dist/robots.txt` (`User-agent: *`, `Allow: /`, `Sitemap: https://tidecaller.drunkenoath.com/sitemap.xml`)
- [ ] `public/favicon.svg` (a simple wave mark in the accent colour that reads at 16px), `public/apple-touch-icon.png` (180), `public/icon-192.png`, `public/icon-512.png`, `public/site.webmanifest` (name, short_name "Tidecaller", icons, theme and background colours, start_url "/", display "standalone"); every page links them
- [ ] `scripts/og.mjs` (run by hand, not by the build) renders 1200x630 cards with playwright-core in the site's look (wordmark, page-type line, "Resto Shaman, WoW Forever") and writes `public/og/home.png`, `bis.png`, `items.png`, `guides.png`, `about.png`, and also renders the PNG icons above; commit the PNGs; total under 600 KB. Each route's `og:image` points at the matching card
- [ ] SEO test: the sitemap lists exactly the indexable routes (the 404 is not in it), robots names the sitemap, and every `og:image` file exists in `public/`
- [ ] Smoke: `/sitemap.xml` and `/robots.txt` return 200; `/favicon.svg` returns 200
- [ ] `npm run typecheck`, `npm test`, `npm run build` and `npm run smoke` pass

### US-021: Share a link to your settings
**Description:** As a player, I want to send my exact setup to a guildmate, so they see the same weights and set.

**Acceptance Criteria:**
- [ ] A "Copy link to these settings" button in the calculator header area copies `SITE_URL/?s=<encodeShare(...)>` (on the current origin when not on production) to the clipboard, with a visible "Link copied" confirmation and a fallback text field when the clipboard is unavailable
- [ ] On load, a valid `?s=` value is applied after hydration in place of saved state, saved, and then removed from the address bar with `history.replaceState`; an invalid one is ignored. The canonical stays `/`
- [ ] Smoke: set Raid boss and tick Tailoring, read the copied link (from the clipboard or the fallback field), open it in a fresh browser context, and see Raid boss pressed, Tailoring ticked, and no `?s=` left in the URL
- [ ] `npm run typecheck`, `npm test`, `npm run build` and `npm run smoke` pass

### US-022: Analytics hook and continuous integration
**Description:** As the owner, I want to know how many people use the site, and every push checked automatically.

**Acceptance Criteria:**
- [ ] The prerender adds `<script defer src="/_vercel/insights/script.js"></script>` (Vercel Web Analytics, cookieless) to every page only when `process.env.VERCEL_ENV === "production"` at build time; local and preview builds do not have it. A Vitest test covers both cases
- [ ] The About page's privacy note says anonymous page views are counted without cookies
- [ ] `.github/workflows/ci.yml`: on push and pull request, Node 22, `npm ci`, `npm run typecheck`, `npm test`, `npm run build`
- [ ] `npm run typecheck`, `npm test` and `npm run build` pass

### US-023: README and search console guide
**Description:** As the owner or a future session, I want the repo to explain itself and the steps to get the site into search engines.

**Acceptance Criteria:**
- [ ] `README.md`: what Tidecaller is, the live URL, every npm script, the architecture in a few lines (static prerender, route table, which page hydrates), how data is updated (edit `docs/spec.md`, run `scripts/extract-spec-data.mjs`, rerun tests), how to regenerate the social images, and the Ralph workflow pointer
- [ ] `docs/search-console.md`: the owner's steps to add the site to Google Search Console (a Domain property verified with a TXT record at GoDaddy, or a URL-prefix property for the subdomain), submit `sitemap.xml`, request indexing of `/` and `/bis`, import into Bing Webmaster Tools, and turn on Vercel Web Analytics for the project, each as exact clicks; plus what to watch in the first month
- [ ] No em dashes in either file
- [ ] `npm run typecheck`, `npm test` and `npm run build` pass

## Functional Requirements

- FR-1: The calculator's inputs, defaults, formulas, readouts, tables and copy follow spec sections 4 to 9 and the reference implementation in section 13.
- FR-2: All math lives in pure functions in `src/lib/model.ts`, unit tested against spec section 7.
- FR-3: State persists in `localStorage` under one key, wrapped in try/catch, with the section 8 migration; the page works when storage is unavailable.
- FR-4: Every URL in the route table is prerendered to static HTML with complete head tags and structured data; only `/` hydrates.
- FR-5: Static pages compute their numbers at build time from the same model and data as the calculator.
- FR-6: The site works at 400px with no horizontal page scroll, in light and dark, with keyboard access and labelled controls.
- FR-7: `sitemap.xml` and `robots.txt` cover every indexable page; preview deployments are not indexed.

## Non-Goals (Out of Scope)

- No backend, database, accounts or server functions. Supabase is not used.
- No game facts beyond `docs/spec.md`; no new items, spells or sources.
- No cookie banner (nothing sets cookies), no ads, no newsletter.
- No client-side router; pages are separate documents.
- No per-item social images (five section cards are enough; 155 PNGs would bloat every deployment).
- No internationalisation.
- No Product, Offer or Review structured data.

## Design Considerations

- Keep the reference's visual design: the teal accent, the Marcellus SC display face, IBM Plex for
  body and numbers, panels on a soft background, and the dark palette.
- Content pages reuse the calculator's typography, table and tag styles so the site reads as one
  product. Tables scroll inside their container on phones.

## Technical Considerations

- React 19 `renderToString` for the prerender; `hydrateRoot` on `/` only.
- `playwright-core` (no browser download) with `CHROMIUM_PATH`; never run Playwright in the Vercel
  build.
- Vercel serves `dist/404.html` for unknown paths and adds `noindex` to preview deployments itself.
- Keep deployments small: the only images are the icons and five social cards.

## Success Metrics

- Every spec section 7 value is pinned by a passing test.
- 178 indexable URLs in the sitemap (home, BiS, 15 slots, item index, 155 items, guides index,
  3 guides, about), each passing the SEO checks.
- The calculator page's JavaScript is under 120 KB gzipped; content pages ship none.
- After launch (owner's measure): pages indexed in Search Console and search impressions for
  "resto shaman bis wow forever" style queries.

## Open Questions

- Should the footer link to drunkenoath.com? It is plain text until Tom confirms the hub is live
  (`PARENT_SITE.link` in `src/site.ts`).
- When the beta confirms an unconfirmed value (spec section 3), Tom updates `docs/spec.md` and a
  follow-up run re-extracts the data.

## Decisions made for Tom (he can overturn any of these)

- A static multi-page site prerendered from React rather than a single-page app, because search
  engines and link previews need real HTML per URL. The calculator still behaves exactly as the spec.
- Headline numbers on static pages use the spec defaults and the Dungeon boss fight, with Trash and
  Raid alongside.
- Fonts self-hosted instead of Google Fonts, for speed and privacy.
- Vercel Web Analytics (cookieless) on production only; Tom turns it on in the Vercel project.
- `frame-ancestors` allows drunkenoath.com and its subdomains to embed the calculator later.
