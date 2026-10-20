# PRD: a 3D character wearing the best set

## Introduction

Tom, 19 Oct 2026, after reviewing sixtysim.com: *"i want the 3d model system they are using i want
3d model charactrers with the gear"*. Run 005 built the character sheet (gear down both sides,
weapons and relic along the bottom) with original totem art in the centre, because Wowhead serves
its 3D model files only to wowhead.com.

The delivering session then read how sixtysim does it, and built a throwaway mock-up of our own
sheet with a 3D Orc wearing our default best set (it worked). Tom's answers, 19 Oct:

1. Relaying Wowhead's model files through our own domain: *"fine for now"*.
2. The item model numbers were to come *"from wowhead"*. Wowhead blocked the reads (servers, then
   Tom's browser), so on 20 Oct Tom chose sixtysim's table, with every number checked against
   Wowhead's own model files. They are in **spec section 14.10** (119 items).
3. Races: *"alliance is dwarf only"*; the Horde list comes from web research (section 14.10).
4. Pages: *"the main calculator page"* and the best-in-slot page (`/bis`), which shows the main set.

**What a player can do after this that they cannot now:** see their best set on a 3D Shaman of their
own race, turn it with the mouse, and watch the gear change as they change the calculator.

**Branch:** `claude/sweet-hypatia-53cceb`, moved forward to `main` after PR #3 merged. A new PR.

## Research findings

**How the 3D character works (as on sixtysim.com).** Three parts:

- **The viewer** is Wowhead's own script,
  `https://wow.zamimg.com/modelviewer/classicplus/viewer/viewer.min.js`, loaded with a plain
  `<script>` tag. It needs jQuery on `window.jQuery` before it loads, and these globals:
  `WH.debug = () => {}`, `WH.defaultAnimation = "Stand"`,
  `WH.WebP = { getImageExtension: () => ".webp" }`,
  `WH.Wow.Item = { INVENTORY_TYPE_SHOULDERS: 3, INVENTORY_TYPE_CHEST: 5, INVENTORY_TYPE_ROBE: 20 }`
  (set each only when missing).
- **The model files** are fetched from our own domain at `/modelviewer/classicplus/...`. A Vercel
  rewrite forwards them to `https://wow.zamimg.com/modelviewer/classicplus/...`. Wowhead's file
  server refuses requests whose `Origin` is another website; a page fetching from its own domain
  sends no `Origin`, so the relay is served. Wowhead sends `cache-control: max-age=2592000`, so
  Vercel's CDN keeps each file for 30 days.
- **The viewer call**, once jQuery and the script are loaded and the customization file is fetched:

  ```js
  const cc = await (await fetch(`/modelviewer/classicplus/meta/charactercustomization/${model}.json`)).json();
  const options = ((cc.data ?? cc).Options ?? []).flatMap((o) =>
    o.Choices?.length ? [{ optionId: o.Id, choiceId: o.Choices[0].Id }] : []);
  new ZamModelViewer({
    type: 2,
    contentPath: `${location.origin}/modelviewer/classicplus/`,
    container: jQuery(el),
    aspect: el.clientWidth / el.clientHeight,
    hd: true,
    items,                                   // [[viewerSlot, display], ...]
    models: { id: model, type: 16 },
    charCustomization: { options },          // the first choice of every option: the game's default look
    wheelEventValidation: (e) => !!(e.originalEvent?.ctrlKey || e.originalEvent?.metaKey),
  });
  ```

  `wheelEventValidation` keeps the page scrolling under the mouse wheel; Ctrl (or Cmd) + wheel
  zooms. To change gear on a live viewer: `viewer.method("clearSlots", String(slot))`, then
  `viewer.method("setItems", [[{ slot, display, visual: 0 }]])` for each slot that changed. A new
  race or gender needs a new viewer (empty the container first).
- **Weight:** one character's first view moves about 1.8 MB (about 70 files); the browser caches
  them after that.

**Spec section 14.10** is one JSON block:

- `races`: by faction, in display order, each `{ "race": name, "male": modelId, "female": modelId }`.
  Horde: Orc (3, 4), Troll (15, 16), Tauren (11, 12), Windshaper Skyborne (218, 219). Alliance:
  Dwarf (5, 6). The first race is the faction's default; male is the default gender.
- `items`: item name to `{ "display": n, "slot": viewerSlot }`, for items that show on a character
  (head, shoulder, back, chest, wrist, hands, waist, legs, feet, weapons, off hands). Viewer slots:
  head 1, shoulder 3, back 16, chest 5 (a robe 20), wrist 9, hands 10, waist 6, legs 7, feet 8,
  every main-hand and two-hand weapon 21, every off hand 22. Necks, rings and trinkets have no
  model and no entry. An item with no entry (no Wowhead ID, or no model number yet) is simply not
  drawn; never fill one in from anywhere else.
- Pinned values: Holy Shroud `{display 16826, slot 1}`; Death Speaker Robes `{12216, 20}` (a robe);
  Tidebringer's Claw `{741039, 21}`; Forcestone Buckler `{4403, 22}`; Wind Spirit Staff `{20325, 21}`.
- The Dungeon boss Horde best set at the defaults (spec 14.8) draws exactly these ten, in sheet
  order: Holy Shroud [1, 16826], Death Speaker Mantle [3, 11473], Death Speaker Robes [20, 12216],
  Mindthrust Bracers [9, 16901], Gloves of Old [10, 13348], Blightleaf Rope [6, 737787], Violet
  Sorcerer's Leggings [7, 737498], Acidic Walkers [8, 4623], Tidebringer's Claw [21, 741039],
  Forcestone Buckler [22, 4403]. Darkspear Raider's Cloak (back) has no Wowhead ID, so no cloak.

**Pages and SEO.** The calculator (`/`) is the only page that hydrates. `/bis` is a content page
with no app JavaScript; Tom's answer 4 adds one small script to it, the same way every page carries
the item popup script (`src/tips/tips.ts`, its own Vite entry, added by `scripts/prerender.mjs`).
The prerendered HTML keeps the totem art, so a visitor (or crawler) without JavaScript or WebGL
sees exactly today's sheet. On phones (760 px and narrower) the sheet's centre is hidden
(`src/styles`), so no model loads there; that stays as it is.

**Tests cannot reach Wowhead.** Smoke and unit tests never depend on wow.zamimg.com. The smoke
suite answers the viewer script with a stub that records what it was asked to draw, and answers
`/modelviewer/**` customization files with a small fixture. The delivering session checks the real
render by hand.

## User Stories

### US-001: Model data from the spec
**Description:** As a developer, I want the races and item model numbers beside the other item data, so both pages can build the viewer's item list.

**Acceptance Criteria:**
- [ ] Read `docs/spec.md` section 14.10 and this PRD's research findings first
- [ ] `scripts/extract-spec-data.mjs` also extracts the 14.10 JSON block (heading "### 14.10 3D character: races, slots and item models") to `src/data/models.json`; update `scripts/extract-spec-data.d.mts`; the existing test that the data files equal the spec covers it
- [ ] A small module with no React and no `data/index.ts` import (so a standalone script can use it), for example `src/model3d/data.ts`: `racesFor(faction)` (the 14.10 list), `modelId(race, gender)`, and `viewerItems(set)` returning `[viewerSlot, display][]` for a `BestSet` in sheet order (head, shoulder, back, chest, wrist, hands, waist, legs, feet, then main hand or two-hand, then off hand), skipping rows with no item, custom items and items with no 14.10 entry
- [ ] Tests: every 14.10 item key is a section 12 item with a 14.5 entry, in a slot that shows on a character; the pinned values in the research findings; no Neck, Finger or Trinket item has an entry; `racesFor("Horde")` is Orc, Troll, Tauren, Windshaper Skyborne with model IDs 3/4, 15/16, 11/12, 218/219; `racesFor("Alliance")` is Dwarf only, 5/6; `viewerItems` of the default Dungeon boss Horde set is exactly the ten pairs listed in the research findings
- [ ] `npm run typecheck`, `npm test` and `npm run build` pass

### US-002: The model file relay
**Description:** As the site, I want Wowhead's model files served from our own domain, so the viewer can load them.

**Acceptance Criteria:**
- [ ] `vercel.json` gains a rewrite `{ "source": "/modelviewer/:path*", "destination": "https://wow.zamimg.com/modelviewer/:path*" }` and, for `/modelviewer/(.*)`, the header `x-vercel-enable-rewrite-caching: 1` (Vercel then honours Wowhead's 30-day cache header); nothing else in `vercel.json` changes
- [ ] `robots.txt` (written by `scripts/prerender.mjs`) gains `Disallow: /modelviewer/`
- [ ] Dev: `vite.config.ts` proxies `/modelviewer` to `https://wow.zamimg.com` with `changeOrigin: true` and the request's `Origin` header removed, so `npm run dev` shows the real model
- [ ] `scripts/serve-dist.mjs` gains an opt-in relay (an option such as `serveDist({ relay: true })`, and a `--relay` flag if the file is run directly) that forwards `/modelviewer/*` the same way; it is off by default and the smoke suite never turns it on
- [ ] Tests: a unit test reads `vercel.json` and finds the rewrite and the header; the SEO tests find the new robots line
- [ ] `npm run typecheck`, `npm test` and `npm run build` pass

### US-003: The 3D character on the calculator's sheet
**Description:** As a player, I want the calculator's character sheet to show a 3D Shaman wearing the best set, so I can see my gear the way the game shows it.

**Acceptance Criteria:**
- [ ] A plain TypeScript module (for example `src/model3d/viewer.ts`, no React) does the loading and the viewer call exactly as the research findings describe: jQuery from the `jquery` npm package (add `jquery@3.7.1`; import it dynamically and set `window.jQuery` and `window.$`), the `WH` globals, Wowhead's viewer script loaded once per page, the customization file, then `new ZamModelViewer(...)`. It returns a handle with `setItems(items)` (clears and sets only the slots that changed) and `destroy()`. Minimal type declarations for `ZamModelViewer`; no `any` leaks into the rest of the code
- [ ] `CharacterSheet` puts a viewer container over the totem art in `.centre`, the same size, with no layout shift. Loading starts only when the sheet comes within 200 px of the viewport (IntersectionObserver) and only when the browser has WebGL. The totem art stays visible until the viewer is created, then hides. Any failure (script, file, WebGL) leaves the totem art in place with no visible error (a `console.warn` only)
- [ ] The calculator draws the Horde Orc male (model 3) by default. When the best set changes (any input), the live viewer gets `setItems` with the new list; it is not rebuilt
- [ ] Under the model, once it is ready, a one-line hint: "Drag to turn. Ctrl + scroll to zoom."
- [ ] Smoke (`test/smoke.mjs`, with the stub described in the research findings: the viewer script route returns a fake `ZamModelViewer` that stores its options and `method` calls on `window`, the customization route returns `{"Options":[{"Id":1,"Name":"Skin Color","Choices":[{"Id":10},{"Id":11}]}]}`): after scrolling to the sheet on `/`, the viewer was created with `models.id` 3, `contentPath` ending `/modelviewer/classicplus/`, `charCustomization.options` `[{optionId:1, choiceId:10}]`, and `items` exactly the ten pairs of the research findings; after changing the level to 25 the stub recorded `setItems` calls and no second viewer; with the viewer script route aborted, the totem art is still visible and no page error is thrown; at 400 px wide no viewer is created
- [ ] `npm run typecheck`, `npm test`, `npm run build` and `CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run smoke` pass

### US-004: Race and gender
**Description:** As a player, I want to pick my Shaman's race and gender, so the character looks like mine.

**Acceptance Criteria:**
- [ ] Once the model is ready, small buttons over the top of the centre: one per race in `racesFor(faction)` (the race name as its label and title), then Male and Female; the current choice is pressed (`aria-pressed`). For the Alliance only Dwarf is shown
- [ ] A change rebuilds the viewer with the new model ID and the same items. The choice is kept in `localStorage` under `tidecaller-look-v1` as `{ "race": name, "gender": "male" | "female" }`, read and written inside try/catch; a stored race the current faction cannot be falls back to that faction's first race (switching the calculator to Alliance shows a Dwarf, switching back shows the stored Horde race again). It is not part of the calculator's saved state or share link
- [ ] Smoke (stub as in US-003): click Troll, the newest viewer has `models.id` 15; click Female, 16; reload, still 16; switch the calculator's faction to Alliance, 6 (Dwarf female) and the only race button is Dwarf
- [ ] `npm run typecheck`, `npm test`, `npm run build` and `CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run smoke` pass

### US-005: The 3D character on the best-in-slot page
**Description:** As a visitor reading `/bis`, I want the Horde best set's sheet to show the same 3D character, without the page loading the calculator app.

**Acceptance Criteria:**
- [ ] A second standalone Vite entry beside `tips` (for example `src/model3d/page.ts`, emitted as `assets/model3d-[hash].js`) finds each sheet marked for it (a data attribute carrying the faction and the `viewerItems` list as JSON, rendered by `CharacterSheet` into the prerendered HTML) and mounts the same viewer, lazy loading, fallback, hint, race and gender buttons and `tidecaller-look-v1` storage as the calculator. On `/bis` the sheet is the Horde set, so the Horde races are offered
- [ ] `scripts/prerender.mjs` adds the script only to routes the route table marks (a new optional route field, set only on `/bis`), and fails the build if that entry plus its own chunks (jQuery's chunk excluded, it loads only when the model does) is over 8 KB gzipped, the way it checks the popup script
- [ ] The SEO tests: `/bis` loads the popup script and the 3D script and no app JavaScript; every other content page is unchanged (popup script only)
- [ ] Root `CLAUDE.md`, SEO rules: the line about scripts says `/bis` also loads the small 3D character script (Tom's answer, 19 Oct 2026), lazily, with the totem art as its no-JavaScript fallback
- [ ] Smoke (stub as in US-003): on `/bis`, after scrolling to the sheet, the viewer has `models.id` 3 and the ten pairs; the prerendered HTML of `/bis` still contains the totem art image
- [ ] `npm run typecheck`, `npm test`, `npm run build` and `CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run smoke` pass

### US-006: Credit and wrap-up
**Description:** As the site owner, I want the 3D character's sources credited, and the whole run checked against the spec.

**Acceptance Criteria:**
- [ ] About page sources: the 3D character uses Wowhead's model viewer and Blizzard's character and item models, with the files fetched from Wowhead through this site; item model numbers come from sixtysim.com's item table, each checked against Wowhead's model files (spec section 14.10). (Corrected at delivery: this line still named Wowhead's item data, the source before Tom's 20 Oct choice; the About page was fixed to match.)
- [ ] The run 005 PR note that a 3D character is not used is not repeated anywhere in page copy (search `src/` for "3D")
- [ ] `npm run typecheck`, `npm test`, `npm run build`, `CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run smoke` and `CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run reference` (26 of 26) pass

## Non-Goals

- No 3D character on phones (the sheet's centre stays hidden at 760 px and narrower) and none on item, slot or guide pages.
- No dice or face, skin or hair choices: every character uses the game's default look.
- No change to any score, weight or pick; the model is display only.
- No race effect on any number: race only chooses the model.
- No copy of Wowhead's files in the repo; they are fetched through the relay.

## Open Questions

- If Wowhead ever stops answering the relay, the sheet quietly falls back to the totem art; the
  owner decides then whether to drop the feature.

## Delivery notes (run 006)

- **Sheet height fix.** Wowhead's viewer writes `height` and `position: relative` onto its container,
  which pushed the model under the hidden totem art and doubled the sheet's height (found in the
  real render, not by the stub). Fixed in CSS (`.doll .fig .viewer` keeps `position: absolute` and
  `height: auto` with `!important`); the smoke stub now writes the same inline styles, and a check on
  `/` and `/bis` asserts the figure stays the height of the art.
- **Viewer script through the relay.** Ralph loads `viewer.min.js` from `/modelviewer/classicplus/viewer/`
  (through our relay) instead of straight from wow.zamimg.com. Same file; the site then loads no
  third-party script. Kept.

