# Tidecaller Stat Weights: build spec

A Restoration Shaman stat-weight calculator and best-in-slot picker for World of Warcraft: Forever (beta build 1.60.1, level 30 cap). This file is everything needed to build and deploy it as a web app on Vercel. A working single-file version already exists and is included at the end as the reference implementation.

## 1. What to build

A static single-page app with no backend. Everything runs in the browser and settings persist in `localStorage`.

The app has four parts:

1. **Inputs**: character stats, regen talents, fight settings, the heal rank being spammed, and a Spirit calibration panel.
2. **Stat weights**: the value of one point of MP5, Intellect, Spirit, Healing, Spell Power and Stamina, expressed in points of Healing. Shown as a sorted priority line ("MP5 > Intellect > Healing = Spell Power > Spirit") and horizontal bars.
3. **Heal rank table**: every Healing Wave and Lesser Healing Wave rank known at the chosen level, with the share of gear bonus each keeps, heal size, mana, heal per mana and heal per second. Clicking a row picks the spell the weights are built on.
4. **Best set and item scorer**: 155 candidate items with Forever beta stats. Filters for faction, maximum required level and the player's crafting professions. A best-set table picks the top item per slot (two rings, two trinkets, two-hander vs main hand plus off hand) and a full list shows every candidate per slot with its score and source. Users can add their own items.

## 2. Tech stack and deployment

- Vite + React + TypeScript, static build output (`dist/`).
- No server, no database, no auth. Persist state in `localStorage` under one key, wrapped in try/catch (the app must work when storage is unavailable).
- Data lives in `src/data/items.json` and `src/data/spells.json` (contents in sections 11 and 12).
- Put all math in pure functions in `src/lib/model.ts` so it can be unit tested with Vitest against the test values in section 7.
- Deploy to Vercel as a Vite project: framework preset Vite, build command `npm run build`, output directory `dist`. No environment variables.
- Must work at phone width (about 400px) with no horizontal page scroll; wide tables scroll inside their own container.
- Support light and dark themes via `prefers-color-scheme`.

Suggested structure:

```
src/
  data/items.json
  data/spells.json
  lib/model.ts          // regen, weights, spell math, scoring, best set
  lib/model.test.ts     // section 7 values
  lib/storage.ts        // load/save with migration and try/catch
  components/...        // Inputs, Weights, RankTable, Calibration, BestSet, ItemTable, AddItem
  App.tsx
```

## 3. Game mechanics (what is measured vs assumed)

**Confirmed in Forever:**
- Mana regen is continuous (no 2-second ticks). The five-second rule still applies: Spirit-based regen stops for 5 seconds after spending mana.
- Gear MP5 keeps working inside the five-second rule (measured: a level 20 mage's casting regen equalled exactly the staff's +2 MP5).
- Mindfulness (Shaman) lets 17%, 33% or 50% of Spirit regen continue while casting (1/2/3 points). Every healer class has an equivalent talent. Default 50%, with an on/off toggle.
- Polished Driftwood Icon (relic) lets 8% of regen continue while casting. Whether it adds to Mindfulness is unconfirmed; the app assumes it adds, capped at 100%.
- Intellect does not change Spirit regen (56 Spirit gave 66 MP5 at both 50 and 64 Intellect).
- Intellect gives 15 mana per point.
- Healing spell coefficient = base cast time / 3.5 (Healing Wave rank 1 shows SP mod 0.429 = 1.5/3.5). Improved Healing Wave shortens the cast but not the coefficient.
- Downranking: a rank keeps `clamp(1 - (L - 17 - T) * 0.05, 0, 1)` of its coefficient, where L is character level and T is the level the rank is learned. Measured in the beta from level 18 to 30.
- Water Shield (tooltip): 3 globes; when a spell crits, 2% of maximum mana is restored and one globe is spent; one globe at most every few seconds; lasts 10 minutes.
- On Forever healing items, "+X Healing" and "+Y Spell Damage" are separate lines. Spell Damage does not heal. "Spell Power" raises both healing and damage.

**Spirit regen, measured by the user (level 22 Orc Shaman, Spirit tooltip "Mana Regeneration by N per 5 sec while not casting"):**

| Spirit | 43 | 48 | 53 | 56 | 60 | 61 | 65 | 71 | 76 | 81 | 87 | 90 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| MP5 | 53 | 60 | 64 | 66 | 68 | 69 | 71 | 75 | 78 | 81 | 85 | 87 |

From 48 to 90 Spirit this is a straight line, `30.5 + 0.626 × Spirit` MP5, within 0.6 MP5 of every reading (the tooltip rounds to whole numbers). The 43 reading (no bonus Spirit) sits off the line and is excluded from the default fit. A "levels off" model `A - B / Spirit` (A 114.0, B 2666) is offered as an alternative but fits worse (worst miss 2.7). Whether the rate changes with level is not yet known.

**Unconfirmed values (keep them editable and flagged in the UI):** Healing Wave rank 4 base heal (read from a chart), mana cost of Healing Wave rank 10 and Lesser Healing Wave rank 1 (Classic values), Spirit rate above 90 Spirit and at other levels, Icon stacking.

## 4. Inputs and defaults

| Key | Label | Default | Notes |
|---|---|---|---|
| level | Level | 30 | 1 to 60, integer |
| pool | Max mana | 2223 | |
| heal | Healing power | 200 | Healing plus Spell Power from the sheet. Spell Damage does not count |
| spi | Spirit | 107 | |
| g | Gear MP5 | 10 | |
| buff | Buff MP5 | 0 | Mana Spring, Blessing of Wisdom (paladin blessings are available to all factions in Forever) |
| talent | Spirit regen talent on | true | toggle |
| pct | Share kept while casting, % | 50 | suggestions 17, 33, 50; disabled when talent is off |
| icon | Polished Driftwood Icon | false | +8 share |
| imphw | Improved Healing Wave 5/5 | true | Healing Wave cast 0.5 s faster; affects heal per second only |
| ws | Water Shield | true | toggle |
| crit | Heal crit chance, % | 5 | disabled when ws is off |
| smodel | Spirit shape | "line" | "line" or "curve" |
| sbase, sper | Line base MP5, MP5 per Spirit | 30.5, 0.626 | |
| sA, sB | Curve cap, B | 114.0, 2666 | |
| t | Fight length, seconds | 120 | |
| f | Time inside the five-second rule, % | 90 | slider 0 to 100 step 5. Casting once every 5 s counts as 100% |
| w | Fights where you run out of mana, % | 70 | slider 0 to 100 step 5 |
| stw | Stamina weight | 0 | user-set |
| spell | Spell being spammed | "hw5" | id from spells.json |
| edits | Per-spell overrides | {} | {id: {base, cost, cast}} |
| faction | Faction filter | "Horde" | "Horde" or "Alliance" |
| maxlvl | Usable up to level | 0 | 0 means "use Level" |
| profs | Professions owned | {} | Tailoring, Leatherworking, Enchanting, Engineering |
| showAll | Show gear you can't use | false | |

Fight presets (buttons, set t and f): Trash pull (90 s, 70%), Dungeon boss (120 s, 90%), Raid boss (300 s, 100%). Highlight the active preset when t and f match.

## 5. The model

All regen numbers below are in MP5 (mana per 5 seconds). Mana per second = MP5 / 5.

```
m        = talent ? pct/100 : 0;  if icon: m += 0.08;  m = min(m, 1)
f        = f% / 100
k        = 1 - f * (1 - m)                       // average share of Spirit regen you actually get
S        = smodel == "line" ? max(0, sbase + sper * max(spi,1))
                            : max(0, sA - sB / max(spi,1))     // Spirit regen while not casting
S'       = smodel == "line" ? sper : sB / max(spi,1)^2          // marginal MP5 per Spirit
regenFull    = g + buff + S
regenCasting = g + buff + S * m
regenAvg     = g + buff + S * k
E        = pool + regenAvg / 5 * T              // total mana available for the fight

// spell being spammed (after edits)
coef     = min(cast, 3.5) / 3.5
share    = clamp(1 - (level - 17 - learnLevel) * 0.05, 0, 1)
ce       = coef * share
h        = base + ce * healPower                 // average heal per cast
castTime = cast - (imphw && spell is Healing Wave ? 0.5 : 0)
hpm      = h / cost
hps      = h / max(castTime, 1.5)                // 1.5 s global cooldown floor

// value of 1 MP5 in points of Healing when mana is what limits you
X        = ce > 0 ? (T / 5) * h / (E * ce) : NaN

// Water Shield
pc       = crit / 100
wsBack   = ws ? pc * 0.02 * pool : 0             // mana back per cast
costEff  = max(1, cost - wsBack)
intWS    = (ws && ce > 0) ? h * pc * 0.3 / (ce * costEff) : 0
                                                  // 0.3 = 15 mana per Int * 0.02

// raw mana-bound values (points of Healing)
rawMP5   = X
rawInt   = (75 / T) * X + intWS                  // 15 mana once per fight = 75/T MP5
rawSpi   = S' * k * X

// final weights, scaled by how often mana runs out
wf       = w / 100
weights  = { heal: 1, sp: 1, mp5: wf*rawMP5, int: wf*rawInt, spi: wf*rawSpi, sta: stw }
casts    = E / costEff
```

Why it works: when mana runs out, total healing = total mana × healing per mana. One point of Healing adds `E·ce/cost` healing; one MP5 adds `(T/5)·h/cost`. The ratio is X. Crits and percent talents multiply both equally, so they cancel. When mana never runs out, mana stats are worth 0, which is why the result is scaled by w.

Priority line: sort mp5, int, spi, heal, sp (and sta if > 0) by weight descending. Join with ">" except use "=" when two neighbours are within max(0.03, 3% of the larger). If X is NaN, show "No healing power bonus on this rank".

Show these readouts: Next 1 Spirit (S'·k, MP5 in this fight), 1 Intellect (75/T MP5), regen not casting, regen casting, average regen, mana for the fight (E, with casts), Water Shield mana back per cast.

## 6. Spirit calibration panel

- Shape selector (line or curve). The inactive shape's inputs are disabled.
- Textarea of readings, one `Spirit MP5` pair per line; lines starting with `#` are ignored. Prefill with the 11 readings from 48 to 90 and the 43 reading commented out.
- Fit both shapes by ordinary least squares: line on x = Spirit, curve on x = 1/Spirit (B = minus the slope). Show each fit's parameters and worst absolute miss, and note that a worst miss under 1 fits given rounding. Buttons apply each fit (round base to 0.1, rate to 0.001, B to integer).
- Optional casting-share check: "sheet regen not casting" N and "casting" C (both include gear MP5). share = (C - g) / (N - g); a button sets talent on, icon off, pct = round(share × 100).
- "Restore defaults" resets smodel, sA, sB, sbase, sper.

## 7. Best set and item scoring

```
score(item) = heal*W.heal + sp*W.sp + mp5*W.mp5 + int*W.int + spi*W.spi + sta*W.sta
usable(item):
  faction is "Both" or equals the filter         else "Horde only" / "Alliance only"
  req <= (maxlvl > 0 ? maxlvl : level)           else "Needs level N"
  no prof, or prof is ticked                     else "Needs Tailoring" etc.
```

Crafted items with `prof` are bind on pickup (only the crafter can wear them); Minor Recombobulator needs Engineering to use. Items without `prof` that are crafted are bind on equip and usable by anyone.

Best set: for each slot take usable items sorted by score. Compare best two-hander against best main hand + best off hand and use the higher; show the margin. Fill slots in order Head, Neck, Shoulder, Back, Chest, Wrist, Hands, Waist, Legs, Feet, Finger, Finger, Trinket, Trinket, then weapons, never using the same item name twice. Show the total.

Full list: grouped by slot, usable items first sorted by score, top one tagged "Top". With "Show gear you can't use" on, unusable items appear dimmed with the reason. Columns: Item, Req, Healing, Spell Pwr, MP5, Int, Spirit, Stam, Score, Where it comes from (source, profession note, other, faction). User-added items get a "Yours" tag and a Remove button; they default to faction Both, req 0.

### Test values (defaults, Horde, level 30, no professions)

Weights, rounded to 3 places:

| Preset | k | E | h | X (raw MP5) | MP5 | Int | Spirit |
|---|---|---|---|---|---|---|---|
| Trash pull (90 s, 70%) | 0.650 | 3543.5 | 526.929 | 3.123 | 2.186 | 1.854 | 0.889 |
| Dungeon boss (120 s, 90%) | 0.550 | 3749.8 | 526.929 | 3.935 | 2.754 | 1.754 | 0.948 |
| Raid boss (300 s, 100%) | 0.500 | 5747.5 | 526.929 | 6.418 | 4.492 | 1.156 | 1.406 |

Water Shield mana back per cast at defaults: 2.223. Dungeon boss casts: 18.96.

Best set at Dungeon boss defaults (scores to 2 places): Holy Shroud 38.69, Scorn's Icy Choker 17.52, Death Speaker Mantle 25.29, Darkspear Raider's Cloak 17.83, Death Speaker Robes 39.29, Spidertank Oilrag 17.26, Truefaith Gloves 20.26, Blightleaf Rope 24.54, Violet Sorcerer's Leggings 39.54, Acidic Walkers 22.83, Philanthropist's Ring 18.77, Sea Giant's Toe Ring 18.00, Roogug's Severed Head 5.69, Worgenbane Talisman 5.51, Tidebringer's Claw 86.00, Forcestone Buckler 25.59. Main hand + off hand 111.59 beats the best two-hander (Wind Spirit Staff) 85.17. Total 422.62.

## 8. Persistence and migration

Save `{state, items}` on every change, where `items` holds only user-added items. On load, merge saved state over defaults. If the saved Spirit settings equal an old default (sbase 37.5 and sper 0.5, or 32.4 and 0.6, or sA 105.5 and sB 2223, or sA 107.9 and sB 2347), replace smodel, sA, sB, sbase and sper with the current defaults. Never let a storage error break rendering.

## 9. Copy and UX notes

- Name: "Tidecaller Stat Weights". Subtitle explains that every number is in points of Healing.
- Tooltips/hints: Healing power excludes Spell Damage; the five-second-rule slider counts casting once every 5 s as 100%; set "run out of mana" to 0 if you always finish with mana left.
- Footer: a short "How it works", the downranking rule, and the unconfirmed list from section 3.
- Visible keyboard focus, labels on every input, tabular numbers in tables.

## 10. Sources

- ForeverChanges (item tooltips, downranking measurements, Resto BiS): https://foreverchanges.pro/bis/shaman/restoration and https://foreverchanges.pro/downranking
- The Forever Era BiS: https://theforeverera.com/en/bis/shaman/restoration/30/
- wowtbc.gg BiS (expanded): https://wowtbc.gg/warcraftforever/bis-list/restoration-shaman/
- Wowhead level 30 healer overview: https://www.wowhead.com/forever/guide/classes/shaman/restoration/level-30-healer-overview
- wowvendor, classicwowforever.com, wowclassicforever.info Resto BiS lists
- Regen behavior: ManaMaster addon notes https://github.com/olav9/ManaMaster/blob/main/CLAUDE.md and StatRat https://statrat.info/mechanics/mana-regeneration/
- Mindfulness ranks: Wowhead Forever spell 1223033
- Spirit readings and Water Shield tooltip: measured in the beta by the user

## 11. Data: spells.json

```json
[
  {"id": "hw1", "name": "Healing Wave", "rank": 1, "lvl": 1, "base": 41.5, "cost": 25, "cast": 1.5, "src": "Beta tooltip, 36 to 47"},
  {"id": "hw2", "name": "Healing Wave", "rank": 2, "lvl": 6, "base": 76, "cost": 45, "cast": 2.0, "src": "Beta tooltip, 69 to 83"},
  {"id": "hw3", "name": "Healing Wave", "rank": 3, "lvl": 12, "base": 138.5, "cost": 80, "cast": 2.5, "src": "Beta tooltip, 126 to 151"},
  {"id": "hw4", "name": "Healing Wave", "rank": 4, "lvl": 18, "base": 267, "cost": 155, "cast": 3.0, "src": "Read from a ForeverChanges chart, unconfirmed", "warn": true},
  {"id": "hw5", "name": "Healing Wave", "rank": 5, "lvl": 24, "base": 355.5, "cost": 200, "cast": 3.0, "src": "Beta tooltip, 328 to 383"},
  {"id": "hw6", "name": "Healing Wave", "rank": 6, "lvl": 32, "base": 500.5, "cost": 265, "cast": 3.0, "src": "Beta tooltip, 463 to 538"},
  {"id": "hw7", "name": "Healing Wave", "rank": 7, "lvl": 40, "base": 704.5, "cost": 340, "cast": 3.0, "src": "Beta data, 654 to 755"},
  {"id": "hw8", "name": "Healing Wave", "rank": 8, "lvl": 48, "base": 995.5, "cost": 440, "cast": 3.0, "src": "Beta data, 927 to 1064"},
  {"id": "hw9", "name": "Healing Wave", "rank": 9, "lvl": 56, "base": 1366, "cost": 560, "cast": 3.0, "src": "Beta data, 1275 to 1457"},
  {"id": "hw10", "name": "Healing Wave", "rank": 10, "lvl": 60, "base": 1615, "cost": 620, "cast": 3.0, "src": "Heal 1508 to 1722; cost is Classic's, unconfirmed", "warn": true},
  {"id": "lhw1", "name": "Lesser Healing Wave", "rank": 1, "lvl": 20, "base": 161.5, "cost": 105, "cast": 1.5, "src": "Heal 150 to 173; cost is Classic's, unconfirmed", "warn": true},
  {"id": "lhw2", "name": "Lesser Healing Wave", "rank": 2, "lvl": 28, "base": 228.5, "cost": 145, "cast": 1.5, "src": "Beta tooltip, 214 to 243"}
]
```

`warn: true` marks values that are unconfirmed; show a "Check" tag on those rows until the user edits them.

## 12. Data: items.json (155 items)

Fields: `slot` is one of Head, Neck, Shoulder, Back, Chest, Wrist, Hands, Waist, Legs, Feet, Finger, Trinket, Main hand, Off hand, Two-hand. `req` 0 means no level requirement. `heal` is +Healing, `sp` is Spell Power (heals and damage), Spell Damage is omitted because it does not heal. `prof` means bind-on-pickup crafted (crafter only). `faction` is Both, Horde or Alliance. Stats are from the Forever beta client or server (build 1.60.1); several quest rewards were reduced in the October 8 beta update and these values reflect that.

```json
[
  {"name": "Holy Shroud", "slot": "Head", "req": 27, "heal": 33, "sp": 0, "mp5": 0, "int": 0, "spi": 6, "sta": 0, "source": "World drop / auction house", "faction": "Both", "armor": "Cloth"},
  {"name": "Enduring Cap", "slot": "Head", "req": 28, "heal": 0, "sp": 0, "mp5": 0, "int": 16, "spi": 7, "sta": 0, "source": "World drop / auction house", "faction": "Both", "armor": "Leather"},
  {"name": "Embalmed Shroud", "slot": "Head", "req": 30, "heal": 24, "sp": 0, "mp5": 0, "int": 0, "spi": 12, "sta": 7, "source": "Fallen Champion (rare), SM Graveyard", "faction": "Both", "armor": "Cloth"},
  {"name": "Wild Headdress", "slot": "Head", "req": 0, "heal": 0, "sp": 12, "mp5": 0, "int": 11, "spi": 0, "sta": 0, "source": "Quest: Wanted! Marez Cowl (Arathi)", "faction": "Alliance", "other": "Elite quest", "armor": "Leather"},
  {"name": "Sorrow's Shroud", "slot": "Head", "req": 24, "heal": 16, "sp": 5, "mp5": 3, "int": 0, "spi": 0, "sta": 11, "source": "Sorrow Wing (rare elite), Stonetalon Mountains", "faction": "Both", "armor": "Cloth"},
  {"name": "Filigreed Pristine Circlet", "slot": "Head", "req": 25, "heal": 22, "sp": 0, "mp5": 0, "int": 0, "spi": 0, "sta": 12, "source": "Crafted: Tailoring 125 (pattern drops in RFK)", "faction": "Both", "prof": "Tailoring", "armor": "Cloth"},
  {"name": "Wisdom's Leather Helm", "slot": "Head", "req": 25, "heal": 21, "sp": 0, "mp5": 0, "int": 0, "spi": 0, "sta": 13, "source": "Crafted: Leatherworking 130", "faction": "Both", "prof": "Leatherworking", "armor": "Leather"},
  {"name": "Kaleidoscope Chain", "slot": "Neck", "req": 30, "heal": 0, "sp": 0, "mp5": 0, "int": 4, "spi": 4, "sta": 4, "source": "World drop / auction house", "faction": "Both", "other": "+4 Str, +4 Agi", "armor": "-"},
  {"name": "Archmagister's Faceted Pendant", "slot": "Neck", "req": 30, "heal": 0, "sp": 0, "mp5": 0, "int": 6, "spi": 0, "sta": 0, "source": "Shade of the Archmage, City of Dalaran", "faction": "Both", "other": "+12 attack power", "armor": "-"},
  {"name": "Crystal Starfire Medallion", "slot": "Neck", "req": 26, "heal": 0, "sp": 0, "mp5": 0, "int": 4, "spi": 3, "sta": 4, "source": "World drop / auction house", "faction": "Both", "armor": "-"},
  {"name": "Giantstone Medallion", "slot": "Neck", "req": 0, "heal": 0, "sp": 0, "mp5": 0, "int": 0, "spi": 10, "sta": 0, "source": "Quest: Gleaning Our Future (Wetlands)", "faction": "Alliance", "armor": "-"},
  {"name": "Mark of the Pack Leader", "slot": "Neck", "req": 20, "heal": 0, "sp": 0, "mp5": 0, "int": 5, "spi": 0, "sta": 0, "source": "Humar the Pridelord (rare), The Barrens", "faction": "Both", "other": "+5 Str", "armor": "-"},
  {"name": "Scorn's Icy Choker", "slot": "Neck", "req": 30, "heal": 0, "sp": 7, "mp5": 0, "int": 6, "spi": 0, "sta": 5, "source": "Scorn, SM Graveyard (Classic event boss)", "faction": "Both", "other": "Source unconfirmed in Forever", "armor": "-"},
  {"name": "Stygian Bone Amulet", "slot": "Neck", "req": 29, "heal": 0, "sp": 5, "mp5": 0, "int": 0, "spi": 0, "sta": 4, "source": "Blind Hunter (rare), Razorfen Kraul", "faction": "Both", "armor": "-"},
  {"name": "Explorers' League Commendation", "slot": "Neck", "req": 0, "heal": 0, "sp": 0, "mp5": 0, "int": 0, "spi": 9, "sta": 9, "source": "Quest: Mythology of the Titans (Uldaman)", "faction": "Alliance", "armor": "-"},
  {"name": "Death Speaker Mantle", "slot": "Shoulder", "req": 27, "heal": 0, "sp": 6, "mp5": 0, "int": 11, "spi": 0, "sta": 0, "source": "Death Speaker Jargba, Razorfen Kraul", "faction": "Both", "armor": "Cloth"},
  {"name": "Batwing Mantle", "slot": "Shoulder", "req": 29, "heal": 0, "sp": 6, "mp5": 0, "int": 11, "spi": 0, "sta": 0, "source": "Blind Hunter (rare), Razorfen Kraul", "faction": "Both", "other": "+3 Agi", "armor": "Cloth"},
  {"name": "Bloodmage Mantle", "slot": "Shoulder", "req": 30, "heal": 0, "sp": 9, "mp5": 0, "int": 9, "spi": 0, "sta": 0, "source": "Bloodmage Thalnos, SM Graveyard", "faction": "Both", "other": "+9 health regen", "armor": "Cloth"},
  {"name": "Berylline Pads", "slot": "Shoulder", "req": 0, "heal": 0, "sp": 7, "mp5": 0, "int": 10, "spi": 0, "sta": 5, "source": "Quest: A Vengeful Fate (RFK, from 29)", "faction": "Both", "armor": "Cloth"},
  {"name": "Magician's Mantle", "slot": "Shoulder", "req": 20, "heal": 0, "sp": 5, "mp5": 0, "int": 9, "spi": 0, "sta": 0, "source": "World drop / auction house", "faction": "Both", "armor": "Cloth"},
  {"name": "Ghostly Mantle", "slot": "Shoulder", "req": 0, "heal": 6, "sp": 0, "mp5": 0, "int": 0, "spi": 6, "sta": 0, "source": "Quest: Deathstalkers in Shadowfang", "faction": "Horde", "other": "Nerfed Oct 8", "armor": "Cloth"},
  {"name": "Fairywing Mantle", "slot": "Shoulder", "req": 0, "heal": 0, "sp": 4, "mp5": 0, "int": 6, "spi": 0, "sta": 1, "source": "Quest: A Fine Mess (Gnomeregan)", "faction": "Both", "other": "Nerfed Oct 8", "armor": "Cloth"},
  {"name": "Moonlit Amice", "slot": "Shoulder", "req": 0, "heal": 0, "sp": 7, "mp5": 0, "int": 0, "spi": 0, "sta": 7, "source": "Quest: Return to Vahlarriel (Desolace)", "faction": "Alliance", "armor": "Cloth"},
  {"name": "Rose Mantle", "slot": "Shoulder", "req": 0, "heal": 0, "sp": 5, "mp5": 0, "int": 5, "spi": 0, "sta": 0, "source": "Quest: Morganth (Redridge)", "faction": "Alliance", "armor": "Cloth"},
  {"name": "Naga Priestess's Mantle", "slot": "Shoulder", "req": 0, "heal": 10, "sp": 0, "mp5": 0, "int": 0, "spi": 6, "sta": 8, "source": "Quest: The Only Good Brinescale...", "faction": "Horde", "other": "Source reported, not checked", "armor": "Cloth"},
  {"name": "Red Wool Cloak", "slot": "Back", "req": 26, "heal": 9, "sp": 0, "mp5": 3, "int": 0, "spi": 0, "sta": 0, "source": "Bazil Thredd, The Stockade", "faction": "Both", "armor": "Cloth"},
  {"name": "Repairman's Cape", "slot": "Back", "req": 0, "heal": 6, "sp": 0, "mp5": 0, "int": 3, "spi": 5, "sta": 0, "source": "Quest: Data Rescue", "faction": "Alliance", "armor": "Cloth"},
  {"name": "Brilliant Cloak", "slot": "Back", "req": 0, "heal": 0, "sp": 6, "mp5": 0, "int": 5, "spi": 0, "sta": 5, "source": "Quest: Strahnbrad Mystery (Alterac)", "faction": "Horde", "armor": "Cloth"},
  {"name": "Glowing Thresher Cape", "slot": "Back", "req": 24, "heal": 7, "sp": 0, "mp5": 0, "int": 0, "spi": 8, "sta": 0, "source": "Old Serra'kis, Blackfathom Deeps", "faction": "Both", "armor": "Cloth"},
  {"name": "Tattered Kirin Tor Cloak", "slot": "Back", "req": 28, "heal": 0, "sp": 0, "mp5": 0, "int": 8, "spi": 0, "sta": 0, "source": "Unknown", "faction": "Both", "other": "+5 hit", "armor": "Cloth"},
  {"name": "Battle Healer's Cloak", "slot": "Back", "req": 28, "heal": 13, "sp": 0, "mp5": 0, "int": 0, "spi": 4, "sta": 6, "source": "Warsong Outriders reputation (Classic)", "faction": "Horde", "other": "Source unconfirmed in Forever", "armor": "Cloth"},
  {"name": "Windsong Drape", "slot": "Back", "req": 0, "heal": 0, "sp": 5, "mp5": 0, "int": 0, "spi": 4, "sta": 0, "source": "Quest: Free at Last", "faction": "Horde", "armor": "Cloth"},
  {"name": "Thornweaver Drape", "slot": "Back", "req": 25, "heal": 0, "sp": 7, "mp5": 0, "int": 0, "spi": 6, "sta": 0, "source": "Roogug, Razorfen Kraul", "faction": "Both", "armor": "Cloth"},
  {"name": "Prelacy Cape", "slot": "Back", "req": 0, "heal": 7, "sp": 0, "mp5": 0, "int": 0, "spi": 3, "sta": 0, "source": "Quest: Researching the Corruption", "faction": "Alliance", "armor": "Cloth"},
  {"name": "Death Speaker Robes", "slot": "Chest", "req": 26, "heal": 20, "sp": 0, "mp5": 0, "int": 11, "spi": 0, "sta": 4, "source": "Death Speaker Jargba, Razorfen Kraul", "faction": "Both", "armor": "Cloth"},
  {"name": "Beguiler Robes", "slot": "Chest", "req": 29, "heal": 0, "sp": 9, "mp5": 0, "int": 12, "spi": 8, "sta": 0, "source": "Scarlet Monastery trash", "faction": "Both", "other": "Very rare drop", "armor": "Cloth"},
  {"name": "Civinad Robes", "slot": "Chest", "req": 0, "heal": 26, "sp": 0, "mp5": 0, "int": 0, "spi": 12, "sta": 7, "source": "Quest: Rig Wars (Gnomeregan final boss)", "faction": "Both", "armor": "Cloth"},
  {"name": "Pristine Gown", "slot": "Chest", "req": 22, "heal": 20, "sp": 0, "mp5": 0, "int": 7, "spi": 4, "sta": 6, "source": "Crafted: Tailoring 110", "faction": "Both", "prof": "Tailoring", "armor": "Cloth"},
  {"name": "Violet Sorcerer's Robes", "slot": "Chest", "req": 27, "heal": 0, "sp": 9, "mp5": 0, "int": 15, "spi": 0, "sta": 0, "source": "Arcanic Enigma, City of Dalaran", "faction": "Both", "other": "Violet Sorcerer's set piece", "armor": "Cloth"},
  {"name": "Wisdom's Leather Tunic", "slot": "Chest", "req": 22, "heal": 18, "sp": 0, "mp5": 0, "int": 6, "spi": 6, "sta": 5, "source": "Crafted: Leatherworking 110", "faction": "Both", "prof": "Leatherworking", "armor": "Leather"},
  {"name": "Doomsayer's Robe", "slot": "Chest", "req": 0, "heal": 16, "sp": 0, "mp5": 0, "int": 0, "spi": 18, "sta": -11, "source": "Quest: Solution to Doom (from 30)", "faction": "Both", "armor": "Cloth"},
  {"name": "Zealot's Robe", "slot": "Chest", "req": 0, "heal": 0, "sp": 11, "mp5": 0, "int": 7, "spi": 7, "sta": 0, "source": "Quest: An Unholy Alliance (RFK)", "faction": "Horde", "armor": "Cloth"},
  {"name": "Spidertank Oilrag", "slot": "Wrist", "req": 29, "heal": 0, "sp": 9, "mp5": 3, "int": 0, "spi": 0, "sta": 0, "source": "Electrocutioner 6000, Gnomeregan", "faction": "Both", "armor": "Cloth"},
  {"name": "Mindthrust Bracers", "slot": "Wrist", "req": 17, "heal": 0, "sp": 0, "mp5": 3, "int": 5, "spi": 0, "sta": 1, "source": "Shadowfang Keep trash", "faction": "Both", "other": "Rare drop", "armor": "Cloth"},
  {"name": "Glowing Magical Bracelets", "slot": "Wrist", "req": 26, "heal": 0, "sp": 0, "mp5": 0, "int": 8, "spi": 0, "sta": 0, "source": "World drop / auction house", "faction": "Both", "other": "+3 Str", "armor": "Cloth"},
  {"name": "Nightsky Wristbands", "slot": "Wrist", "req": 28, "heal": 0, "sp": 0, "mp5": 0, "int": 6, "spi": 3, "sta": 0, "source": "World drop / auction house", "faction": "Both", "armor": "Cloth"},
  {"name": "Silkstream Cuffs", "slot": "Wrist", "req": 0, "heal": 0, "sp": 0, "mp5": 0, "int": 5, "spi": 4, "sta": 4, "source": "Quest: Book of the Ancients (from 30)", "faction": "Both", "armor": "Cloth"},
  {"name": "Knife-Polishing Rag", "slot": "Wrist", "req": 0, "heal": 0, "sp": 6, "mp5": 0, "int": 0, "spi": 4, "sta": 0, "source": "Quest: Open the Maw (Wetlands)", "faction": "Horde", "armor": "Cloth"},
  {"name": "Graveweave Bindings", "slot": "Wrist", "req": 26, "heal": 0, "sp": 5, "mp5": 2, "int": 0, "spi": 0, "sta": 0, "source": "Atrexis the Grave Knight, City of Dalaran", "faction": "Both", "other": "+6 Str", "armor": "Cloth"},
  {"name": "Bridgebreaker Bindings", "slot": "Wrist", "req": 24, "heal": 9, "sp": 0, "mp5": 0, "int": 0, "spi": 0, "sta": 0, "source": "Kam Deepfury, The Stockade", "faction": "Both", "armor": "Cloth"},
  {"name": "Prospector Gloves", "slot": "Hands", "req": 0, "heal": 0, "sp": 9, "mp5": 0, "int": 8, "spi": 0, "sta": 0, "source": "Quest: Agmond's Fate (Loch Modan)", "faction": "Alliance", "armor": "Leather"},
  {"name": "Truefaith Gloves", "slot": "Hands", "req": 25, "heal": 15, "sp": 0, "mp5": 0, "int": 3, "spi": 0, "sta": 0, "source": "Crafted: Tailoring 125", "faction": "Both", "other": "Bind on equip, anyone can wear", "armor": "Cloth"},
  {"name": "Gloves of Old", "slot": "Hands", "req": 29, "heal": 0, "sp": 0, "mp5": 0, "int": 5, "spi": 12, "sta": 0, "source": "World drop / auction house", "faction": "Both", "armor": "Cloth"},
  {"name": "Hotshot Pilot's Gloves", "slot": "Hands", "req": 27, "heal": 0, "sp": 0, "mp5": 0, "int": 8, "spi": 5, "sta": 5, "source": "Gnomeregan trash (rare)", "faction": "Both", "other": "+4 Agility", "armor": "Cloth"},
  {"name": "Restorer's Fine Gloves", "slot": "Hands", "req": 0, "heal": 11, "sp": 0, "mp5": 0, "int": 0, "spi": 8, "sta": 6, "source": "Quest: Agmond's Fate (Loch Modan)", "faction": "Alliance", "armor": "Cloth"},
  {"name": "Pristine Gloves", "slot": "Hands", "req": 15, "heal": 11, "sp": 0, "mp5": 0, "int": 3, "spi": 0, "sta": 4, "source": "Crafted: Tailoring 75", "faction": "Both", "prof": "Tailoring", "armor": "Cloth"},
  {"name": "Wisdom's Leather Gloves", "slot": "Hands", "req": 15, "heal": 10, "sp": 0, "mp5": 0, "int": 4, "spi": 0, "sta": 3, "source": "Crafted: Leatherworking 75", "faction": "Both", "prof": "Leatherworking", "armor": "Leather"},
  {"name": "Naga Battle Gloves", "slot": "Hands", "req": 22, "heal": 15, "sp": 0, "mp5": 0, "int": 0, "spi": 0, "sta": 4, "source": "Lady Sarevess, Blackfathom Deeps", "faction": "Both", "other": "+4 Strength", "armor": "Leather"},
  {"name": "Oilrag Handwraps", "slot": "Hands", "req": 0, "heal": 0, "sp": 9, "mp5": 0, "int": 2, "spi": 0, "sta": 2, "source": "Quest: The Lost Pages", "faction": "Horde", "armor": "Leather"},
  {"name": "Shilly Mitts", "slot": "Hands", "req": 0, "heal": 0, "sp": 5, "mp5": 0, "int": 0, "spi": 6, "sta": 0, "source": "Quest: Gyrodrillmatic Excavationators", "faction": "Alliance", "armor": "Cloth"},
  {"name": "Mender's Leather Belt", "slot": "Waist", "req": 30, "heal": 19, "sp": 0, "mp5": 0, "int": 6, "spi": 6, "sta": 4, "source": "Crafted: Leatherworking 150", "faction": "Both", "prof": "Leatherworking", "armor": "Leather"},
  {"name": "Blightleaf Rope", "slot": "Waist", "req": 29, "heal": 0, "sp": 7, "mp5": 0, "int": 10, "spi": 0, "sta": 0, "source": "Fel Ancient, City of Dalaran", "faction": "Both", "other": "+5 health regen", "armor": "Cloth"},
  {"name": "Skycaller's Leather Belt", "slot": "Waist", "req": 30, "heal": 0, "sp": 10, "mp5": 0, "int": 6, "spi": 4, "sta": 6, "source": "Crafted: Leatherworking 150", "faction": "Both", "prof": "Leatherworking", "armor": "Leather"},
  {"name": "Violet Sash", "slot": "Waist", "req": 0, "heal": 0, "sp": 6, "mp5": 0, "int": 9, "spi": 0, "sta": 0, "source": "Quest: Power Overwhelming (City of Dalaran)", "faction": "Alliance", "armor": "Cloth"},
  {"name": "Razzeric's Customized Seatbelt", "slot": "Waist", "req": 0, "heal": 0, "sp": 0, "mp5": 0, "int": 12, "spi": 0, "sta": 1, "source": "Quest: Safety First", "faction": "Both", "other": "Quest is level 41", "armor": "Cloth"},
  {"name": "Belt of Arugal", "slot": "Waist", "req": 23, "heal": 0, "sp": 9, "mp5": 0, "int": 3, "spi": 5, "sta": 0, "source": "Archmage Arugal, Shadowfang Keep", "faction": "Both", "other": "+2 Agility", "armor": "Cloth"},
  {"name": "Budding Leaf Belt", "slot": "Waist", "req": 27, "heal": 13, "sp": 0, "mp5": 0, "int": 0, "spi": 0, "sta": 6, "source": "Unknown", "faction": "Both", "armor": "Leather"},
  {"name": "Pristine Sash", "slot": "Waist", "req": 17, "heal": 11, "sp": 0, "mp5": 0, "int": 4, "spi": 0, "sta": 5, "source": "Crafted: Tailoring 85", "faction": "Both", "prof": "Tailoring", "armor": "Cloth"},
  {"name": "Wisdom's Leather Leggings", "slot": "Legs", "req": 25, "heal": 21, "sp": 0, "mp5": 0, "int": 7, "spi": 7, "sta": 6, "source": "Crafted: Leatherworking 125", "faction": "Both", "prof": "Leatherworking", "armor": "Leather"},
  {"name": "Violet Sorcerer's Leggings", "slot": "Legs", "req": 29, "heal": 0, "sp": 12, "mp5": 0, "int": 13, "spi": 5, "sta": 0, "source": "City of Dalaran drop", "faction": "Both", "other": "Violet Sorcerer's set piece", "armor": "Cloth"},
  {"name": "Pristine Leggings", "slot": "Legs", "req": 25, "heal": 22, "sp": 0, "mp5": 0, "int": 7, "spi": 5, "sta": 7, "source": "Crafted: Tailoring 125", "faction": "Both", "prof": "Tailoring", "armor": "Cloth"},
  {"name": "Filigreed Pristine Leggings", "slot": "Legs", "req": 20, "heal": 18, "sp": 0, "mp5": 0, "int": 6, "spi": 4, "sta": 5, "source": "Crafted: Tailoring 100", "faction": "Both", "prof": "Tailoring", "armor": "Cloth"},
  {"name": "Magistrate's Pantaloons", "slot": "Legs", "req": 0, "heal": 0, "sp": 7, "mp5": 0, "int": 13, "spi": 0, "sta": 0, "source": "Quest: The Fury Runs Deep", "faction": "Alliance", "armor": "Cloth"},
  {"name": "Wisdom's Leather Pants", "slot": "Legs", "req": 20, "heal": 20, "sp": 0, "mp5": 0, "int": 6, "spi": 4, "sta": 4, "source": "Crafted: Leatherworking 105", "faction": "Both", "prof": "Leatherworking", "armor": "Leather"},
  {"name": "Gaze Dreamer Pants", "slot": "Legs", "req": 23, "heal": 0, "sp": 12, "mp5": 0, "int": 0, "spi": 9, "sta": 0, "source": "Twilight Lord Kelris, Blackfathom Deeps", "faction": "Both", "armor": "Cloth"},
  {"name": "Gilded Slippers", "slot": "Feet", "req": 30, "heal": 20, "sp": 0, "mp5": 0, "int": 7, "spi": 4, "sta": 6, "source": "Crafted: Tailoring 150", "faction": "Both", "prof": "Tailoring", "armor": "Cloth"},
  {"name": "Renewing Footpads", "slot": "Feet", "req": 0, "heal": 11, "sp": 0, "mp5": 0, "int": 11, "spi": 0, "sta": 5, "source": "Quest: Heart of Disruption (City of Dalaran)", "faction": "Alliance", "armor": "Leather"},
  {"name": "Acidic Walkers", "slot": "Feet", "req": 27, "heal": 0, "sp": 5, "mp5": 0, "int": 8, "spi": 4, "sta": 0, "source": "Viscous Fallout, Gnomeregan", "faction": "Both", "armor": "Cloth"},
  {"name": "Wisdom's Leather Boots", "slot": "Feet", "req": 17, "heal": 11, "sp": 0, "mp5": 0, "int": 5, "spi": 0, "sta": 4, "source": "Crafted: Leatherworking 85", "faction": "Both", "prof": "Leatherworking", "armor": "Leather"},
  {"name": "Violet Sorcerer's Sandals", "slot": "Feet", "req": 28, "heal": 0, "sp": 0, "mp5": 0, "int": 11, "spi": 0, "sta": 7, "source": "City of Dalaran trash", "faction": "Both", "other": "Violet Sorcerer's set piece", "armor": "Cloth"},
  {"name": "Gnomebot Operating Boots", "slot": "Feet", "req": 29, "heal": 11, "sp": 0, "mp5": 0, "int": 0, "spi": 0, "sta": 12, "source": "Crowd Pummeler 9-60, Gnomeregan", "faction": "Both", "armor": "Leather"},
  {"name": "Rotmender's Treads", "slot": "Feet", "req": 19, "heal": 15, "sp": 0, "mp5": 0, "int": 0, "spi": 0, "sta": 7, "source": "Rath'mael, Ruins of Lordaeron", "faction": "Both", "other": "Rotmender's set piece", "armor": "Cloth"},
  {"name": "Everlast Boots", "slot": "Feet", "req": 0, "heal": 10, "sp": 0, "mp5": 0, "int": 0, "spi": 9, "sta": 0, "source": "Quest: Power Stones", "faction": "Both", "other": "Quest is level 36", "armor": "Cloth"},
  {"name": "Philanthropist's Ring", "slot": "Finger", "req": 0, "heal": 0, "sp": 10, "mp5": 0, "int": 5, "spi": 0, "sta": 0, "source": "Quest: Greater Friend of the Library (20 books)", "faction": "Both", "armor": "-"},
  {"name": "Sea Giant's Toe Ring", "slot": "Finger", "req": 30, "heal": 18, "sp": 0, "mp5": 0, "int": 0, "spi": 0, "sta": 0, "source": "Vendor: Gezzy Gunkgear, Booty Bay", "faction": "Both", "other": "Booty Bay Friendly", "armor": "-"},
  {"name": "Ladimore Heirloom Ring", "slot": "Finger", "req": 0, "heal": 0, "sp": 5, "mp5": 0, "int": 6, "spi": 0, "sta": 0, "source": "Quest: A Daughter's Love (Duskwood)", "faction": "Alliance", "armor": "-"},
  {"name": "Solid Gold Band", "slot": "Finger", "req": 0, "heal": 11, "sp": 0, "mp5": 0, "int": 0, "spi": 5, "sta": 0, "source": "Quest: Opportunistic Education (City of Dalaran)", "faction": "Horde", "armor": "-"},
  {"name": "Runemender's Seal", "slot": "Finger", "req": 27, "heal": 9, "sp": 0, "mp5": 0, "int": 0, "spi": 7, "sta": 4, "source": "Arcane Anomaly, City of Dalaran", "faction": "Both", "other": "Unique", "armor": "-"},
  {"name": "Snake Hoop", "slot": "Finger", "req": 0, "heal": 0, "sp": 6, "mp5": 0, "int": 5, "spi": 0, "sta": 0, "source": "Quest: Willix the Importer (RFK)", "faction": "Both", "armor": "-"},
  {"name": "Ring of Power Regulation", "slot": "Finger", "req": 28, "heal": 0, "sp": 6, "mp5": 3, "int": 0, "spi": 0, "sta": 0, "source": "Relic Guardian, Excavation Site: Wetlands", "faction": "Both", "other": "Unique", "armor": "-"},
  {"name": "Electrocutioner Lagnut", "slot": "Finger", "req": 29, "heal": 9, "sp": 0, "mp5": 0, "int": 0, "spi": 7, "sta": 4, "source": "Electrocutioner 6000, Gnomeregan", "faction": "Both", "other": "Unique", "armor": "-"},
  {"name": "Advisor's Ring", "slot": "Finger", "req": 28, "heal": 0, "sp": 7, "mp5": 2, "int": 0, "spi": 0, "sta": 4, "source": "Defilers reputation (Classic)", "faction": "Horde", "other": "Source unconfirmed in Forever", "armor": "-"},
  {"name": "Minor Recombobulator", "slot": "Trinket", "req": 0, "heal": 0, "sp": 0, "mp5": 0, "int": 0, "spi": 0, "sta": 0, "source": "Crafted: Engineering 140", "faction": "Both", "other": "Use: restores 96 to 160 mana (5 min); needs Engineering 140 to use", "prof": "Engineering", "armor": "-"},
  {"name": "Roogug's Severed Head", "slot": "Trinket", "req": 25, "heal": 0, "sp": 0, "mp5": 0, "int": 0, "spi": 6, "sta": 0, "source": "Roogug, Razorfen Kraul", "faction": "Both", "armor": "-"},
  {"name": "Worgenbane Talisman", "slot": "Trinket", "req": 21, "heal": 0, "sp": 0, "mp5": 2, "int": 0, "spi": 0, "sta": 0, "source": "Commander Springvale, Shadowfang Keep", "faction": "Both", "armor": "-"},
  {"name": "Cursed Murloc Eye", "slot": "Trinket", "req": 24, "heal": 0, "sp": 0, "mp5": 0, "int": 0, "spi": 0, "sta": 0, "source": "Gelihast, Blackfathom Deeps", "faction": "Both", "other": "Damage only, no healing value", "armor": "-"},
  {"name": "Lookie's Spyglass", "slot": "Trinket", "req": 18, "heal": 0, "sp": 0, "mp5": 0, "int": 0, "spi": 1, "sta": 0, "source": "Cookie, The Deadmines", "faction": "Both", "armor": "-"},
  {"name": "Wind Spirit Staff", "slot": "Two-hand", "req": 29, "heal": 70, "sp": 0, "mp5": 0, "int": 0, "spi": 16, "sta": 6, "source": "Earthcaller Halmgar, Razorfen Kraul", "faction": "Both", "armor": "-"},
  {"name": "Healer's Staff", "slot": "Two-hand", "req": 0, "heal": 67, "sp": 0, "mp5": 5, "int": 0, "spi": 0, "sta": 12, "source": "Quest: Elder Knowledge, Excavation Site: Wetlands", "faction": "Both", "armor": "-"},
  {"name": "Fallen Dragon's Scepter", "slot": "Two-hand", "req": 0, "heal": 0, "sp": 36, "mp5": 0, "int": 11, "spi": 13, "sta": 0, "source": "Quest: Stopping the Cycle (Wetlands)", "faction": "Alliance", "other": "Elite quest", "armor": "-"},
  {"name": "Odo's Ley Staff", "slot": "Two-hand", "req": 21, "heal": 52, "sp": 0, "mp5": 0, "int": 0, "spi": 12, "sta": 5, "source": "Odo the Blindwatcher, Shadowfang Keep", "faction": "Both", "armor": "-"},
  {"name": "Tidebringer's Claw", "slot": "Main hand", "req": 0, "heal": 86, "sp": 0, "mp5": 0, "int": 0, "spi": 0, "sta": 5, "source": "Shaman quest: The Tempest's Weapons (from 30)", "faction": "Both", "other": "+2% crit on Healing Wave and Lesser Healing Wave", "armor": "-"},
  {"name": "Royal Diplomatic Scepter", "slot": "Main hand", "req": 30, "heal": 72, "sp": 0, "mp5": 0, "int": 0, "spi": 7, "sta": 3, "source": "Dark Iron Ambassador (rare), Gnomeregan", "faction": "Both", "armor": "-"},
  {"name": "Death Speaker Scepter", "slot": "Main hand", "req": 28, "heal": 68, "sp": 0, "mp5": 0, "int": 0, "spi": 0, "sta": 0, "source": "Death Speaker Jargba, Razorfen Kraul", "faction": "Both", "other": "+12 health regen", "armor": "-"},
  {"name": "Forcestone Buckler", "slot": "Off hand", "req": 0, "heal": 18, "sp": 0, "mp5": 0, "int": 0, "spi": 8, "sta": 4, "source": "Quest: Compendium of the Fallen (from 28)", "faction": "Horde", "armor": "Shield"},
  {"name": "Elementalist's Guard", "slot": "Off hand", "req": 0, "heal": 0, "sp": 0, "mp5": 2, "int": 6, "spi": 0, "sta": 9, "source": "Shaman quest: The Tempest's Weapons (from 30)", "faction": "Both", "armor": "Shield"},
  {"name": "Heart of Agamaggan", "slot": "Off hand", "req": 30, "heal": 15, "sp": 0, "mp5": 0, "int": 0, "spi": 0, "sta": 7, "source": "Charlga Razorflank, Razorfen Kraul", "faction": "Both", "armor": "Shield"},
  {"name": "Seedcloud Buckler", "slot": "Off hand", "req": 19, "heal": 0, "sp": 5, "mp5": 0, "int": 5, "spi": 0, "sta": 0, "source": "Verdan the Everliving, Wailing Caverns", "faction": "Both", "armor": "Shield"},
  {"name": "Painwalker Buckler", "slot": "Off hand", "req": 29, "heal": 13, "sp": 0, "mp5": 0, "int": 0, "spi": 0, "sta": 6, "source": "Interrogator Vishas, SM Graveyard", "faction": "Both", "other": "Proc when struck: 12 mp5 for 10 sec", "armor": "Shield"},
  {"name": "Salve and Salvation", "slot": "Off hand", "req": 0, "heal": 9, "sp": 0, "mp5": 0, "int": 0, "spi": 9, "sta": 0, "source": "Quest: Past Due (SM Library)", "faction": "Alliance", "armor": "-"},
  {"name": "Orb of Souls", "slot": "Off hand", "req": 25, "heal": 13, "sp": 0, "mp5": 0, "int": 0, "spi": 6, "sta": 0, "source": "Crafted: Enchanting 140", "faction": "Both", "prof": "Enchanting", "armor": "-"},
  {"name": "Geomancer Headdress", "slot": "Head", "req": 25, "heal": 13, "sp": 0, "mp5": 0, "int": 0, "spi": 14, "sta": 0, "source": "Roogug, Razorfen Kraul", "faction": "Both", "armor": "Leather"},
  {"name": "Pristine Circlet", "slot": "Head", "req": 20, "heal": 18, "sp": 0, "mp5": 0, "int": 0, "spi": 0, "sta": 10, "source": "Crafted: Tailoring 100", "faction": "Both", "prof": "Tailoring", "armor": "Cloth"},
  {"name": "Wisdom's Leather Hood", "slot": "Head", "req": 20, "heal": 17, "sp": 0, "mp5": 0, "int": 0, "spi": 0, "sta": 10, "source": "Crafted: Leatherworking 100", "faction": "Both", "prof": "Leatherworking", "armor": "Leather"},
  {"name": "Whisperwind Headdress", "slot": "Head", "req": 29, "heal": 0, "sp": 7, "mp5": 0, "int": 0, "spi": 11, "sta": 11, "source": "Earthcaller Halmgar, Razorfen Kraul", "faction": "Both", "armor": "Leather"},
  {"name": "Guardian's Emblem", "slot": "Neck", "req": 28, "heal": 0, "sp": 6, "mp5": 0, "int": 0, "spi": 0, "sta": 8, "source": "Unknown", "faction": "Both", "armor": "-"},
  {"name": "Thermaplugg Medal of Honor", "slot": "Neck", "req": 29, "heal": 0, "sp": 0, "mp5": 0, "int": 0, "spi": 6, "sta": 6, "source": "Crowd Pummeler 9-60, Gnomeregan", "faction": "Both", "other": "+10 attack power", "armor": "-"},
  {"name": "Pendant of Myzrael", "slot": "Neck", "req": 30, "heal": 0, "sp": 0, "mp5": 0, "int": 0, "spi": 6, "sta": 4, "source": "Myzrael quest chain, Arathi", "faction": "Both", "armor": "-"},
  {"name": "Glowing Green Talisman", "slot": "Neck", "req": 25, "heal": 0, "sp": 0, "mp5": 0, "int": 0, "spi": 6, "sta": 1, "source": "World drop / auction house", "faction": "Both", "armor": "-"},
  {"name": "Invoker's Mantle", "slot": "Shoulder", "req": 25, "heal": 0, "sp": 7, "mp5": 0, "int": 5, "spi": 0, "sta": 0, "source": "Crafted: Tailoring (bind on equip)", "faction": "Both", "other": "Stats from a secondary database", "armor": "Cloth"},
  {"name": "Feline Mantle", "slot": "Shoulder", "req": 23, "heal": 0, "sp": 4, "mp5": 0, "int": 8, "spi": 0, "sta": 0, "source": "Wolf Master Nandos, Shadowfang Keep", "faction": "Both", "other": "+2 Agi", "armor": "Cloth"},
  {"name": "Heavy Woolen Cloak", "slot": "Back", "req": 16, "heal": 0, "sp": 4, "mp5": 0, "int": 0, "spi": 4, "sta": 0, "source": "Crafted: Tailoring 80 (bind on equip)", "faction": "Both", "armor": "Cloth"},
  {"name": "Darkspear Raider's Cloak", "slot": "Back", "req": 28, "heal": 0, "sp": 0, "mp5": 0, "int": 8, "spi": 4, "sta": 3, "source": "Darkspear Raiders vendor", "faction": "Horde", "other": "Needs Darkspear Raiders Honored", "armor": "Cloth"},
  {"name": "Robes of Arugal", "slot": "Chest", "req": 23, "heal": 18, "sp": 0, "mp5": 0, "int": 0, "spi": 6, "sta": 5, "source": "Archmage Arugal, Shadowfang Keep", "faction": "Both", "armor": "Cloth"},
  {"name": "Wisdom's Leather Armor", "slot": "Chest", "req": 15, "heal": 15, "sp": 0, "mp5": 0, "int": 5, "spi": 3, "sta": 3, "source": "Crafted: Leatherworking 80", "faction": "Both", "prof": "Leatherworking", "armor": "Leather"},
  {"name": "Ceremonial Gown", "slot": "Chest", "req": 0, "heal": 0, "sp": 13, "mp5": 0, "int": 11, "spi": 0, "sta": 0, "source": "Unknown", "faction": "Both", "armor": "Cloth"},
  {"name": "Witherbite Bracers", "slot": "Wrist", "req": 15, "heal": 0, "sp": 5, "mp5": 0, "int": 0, "spi": 0, "sta": 0, "source": "Witherfang, Ruins of Lordaeron", "faction": "Both", "other": "+4 Agi", "armor": "Leather"},
  {"name": "Tattered Mittens", "slot": "Hands", "req": 0, "heal": 9, "sp": 0, "mp5": 0, "int": 0, "spi": 0, "sta": 6, "source": "Quest: The Book of Ur (Undercity)", "faction": "Horde", "armor": "Cloth"},
  {"name": "Gloves of Meditation", "slot": "Hands", "req": 21, "heal": 0, "sp": 5, "mp5": 0, "int": 0, "spi": 7, "sta": 0, "source": "Crafted: Tailoring 105 (bind on equip)", "faction": "Both", "armor": "Cloth"},
  {"name": "Jutebraid Gloves", "slot": "Hands", "req": 0, "heal": 0, "sp": 6, "mp5": 0, "int": 5, "spi": 0, "sta": 0, "source": "Quest: Horde Presence", "faction": "Horde", "armor": "Cloth"},
  {"name": "Defiler's Cloth Girdle", "slot": "Waist", "req": 28, "heal": 0, "sp": 11, "mp5": 0, "int": 3, "spi": 0, "sta": 4, "source": "Defilers vendor (Arathi Basin)", "faction": "Horde", "other": "Needs Defilers Honored", "armor": "Cloth"},
  {"name": "Wisdom's Leather Belt", "slot": "Waist", "req": 12, "heal": 8, "sp": 0, "mp5": 0, "int": 4, "spi": 0, "sta": 3, "source": "Crafted: Leatherworking 60", "faction": "Both", "prof": "Leatherworking", "armor": "Leather"},
  {"name": "Daewyn's Girdle", "slot": "Waist", "req": 0, "heal": 0, "sp": 7, "mp5": 0, "int": 0, "spi": 6, "sta": 0, "source": "Quest: Fallen in the Fen (Excavation Site)", "faction": "Alliance", "armor": "Cloth"},
  {"name": "Earthen Leggings", "slot": "Legs", "req": 30, "heal": 15, "sp": 0, "mp5": 0, "int": 0, "spi": 11, "sta": 0, "source": "Crafted: Tailoring 140 (bind on equip)", "faction": "Both", "armor": "Cloth"},
  {"name": "Ogre Loincloth", "slot": "Legs", "req": 17, "heal": 18, "sp": 0, "mp5": 0, "int": 0, "spi": 0, "sta": 6, "source": "Rhahk'Zor, The Deadmines", "faction": "Both", "other": "+4 Str", "armor": "Cloth"},
  {"name": "Kodohide Legguards", "slot": "Legs", "req": 24, "heal": 0, "sp": 10, "mp5": 0, "int": 11, "spi": 0, "sta": 0, "source": "Brontus (rare), The Barrens", "faction": "Both", "other": "+4 Str", "armor": "Leather"},
  {"name": "Stormrider's Leather Pants", "slot": "Legs", "req": 20, "heal": 0, "sp": 10, "mp5": 0, "int": 6, "spi": 4, "sta": 4, "source": "Crafted: Leatherworking 105", "faction": "Both", "prof": "Leatherworking", "armor": "Leather"},
  {"name": "Roused Nature Footwraps", "slot": "Feet", "req": 27, "heal": 13, "sp": 0, "mp5": 0, "int": 0, "spi": 9, "sta": 6, "source": "Unknown (bind on equip)", "faction": "Both", "armor": "Leather"},
  {"name": "Black Whelp Slippers", "slot": "Feet", "req": 10, "heal": 9, "sp": 0, "mp5": 0, "int": 4, "spi": 0, "sta": 0, "source": "Crafted: Leatherworking 35", "faction": "Both", "prof": "Leatherworking", "armor": "Leather"},
  {"name": "Wingborne Boots", "slot": "Feet", "req": 0, "heal": 0, "sp": 6, "mp5": 0, "int": 0, "spi": 10, "sta": 0, "source": "Quest: Malin's Request", "faction": "Alliance", "armor": "Cloth"},
  {"name": "Pristine Boots", "slot": "Feet", "req": 12, "heal": 9, "sp": 0, "mp5": 0, "int": 3, "spi": 0, "sta": 4, "source": "Crafted: Tailoring 60", "faction": "Both", "prof": "Tailoring", "armor": "Cloth"},
  {"name": "Reedknot Ring", "slot": "Finger", "req": 0, "heal": 0, "sp": 7, "mp5": 0, "int": 0, "spi": 0, "sta": 3, "source": "Quest: Jarl Needs a Blade (from 30)", "faction": "Both", "armor": "-"},
  {"name": "Sacristan Band", "slot": "Finger", "req": 0, "heal": 6, "sp": 0, "mp5": 0, "int": 0, "spi": 0, "sta": 7, "source": "Unknown", "faction": "Both", "armor": "-"},
  {"name": "Dog Whistle", "slot": "Trinket", "req": 25, "heal": 0, "sp": 0, "mp5": 0, "int": 0, "spi": 0, "sta": 0, "source": "Houndmaster Loksey, SM Library", "faction": "Both", "other": "Use: summon a hound", "armor": "-"},
  {"name": "Transformative Cocoon", "slot": "Trinket", "req": 0, "heal": 0, "sp": 0, "mp5": 0, "int": 0, "spi": 0, "sta": 0, "source": "Quest: The Broodmother (Mulgore)", "faction": "Horde", "other": "Use: absorb shield then speed boost", "armor": "-"},
  {"name": "Bottle of Powderfuse Port", "slot": "Main hand", "req": 0, "heal": 63, "sp": 0, "mp5": 0, "int": 7, "spi": 0, "sta": 0, "source": "Unknown", "faction": "Both", "armor": "-"},
  {"name": "Lightning's Grasp", "slot": "Main hand", "req": 0, "heal": 0, "sp": 46, "mp5": 0, "int": 6, "spi": 0, "sta": 0, "source": "Shaman quest: The Tempest's Weapons (from 30)", "faction": "Both", "other": "+1% Lightning Bolt crit", "armor": "-"},
  {"name": "Eye of Paleth", "slot": "Off hand", "req": 0, "heal": 13, "sp": 0, "mp5": 0, "int": 0, "spi": 0, "sta": 0, "source": "Quest: Cleansing the Eye", "faction": "Alliance", "armor": "-"},
  {"name": "Alliance Outrunner Healing Rod", "slot": "Off hand", "req": 21, "heal": 12, "sp": 0, "mp5": 0, "int": 0, "spi": 0, "sta": 0, "source": "Aean Swiftriver (rare), The Barrens", "faction": "Both", "other": "+8 health regen", "armor": "-"},
  {"name": "Orb of Mistmantle", "slot": "Off hand", "req": 23, "heal": 9, "sp": 0, "mp5": 0, "int": 0, "spi": 4, "sta": 0, "source": "World drop / auction house", "faction": "Both", "armor": "-"},
  {"name": "Omega Orb", "slot": "Off hand", "req": 0, "heal": 0, "sp": 9, "mp5": 3, "int": 0, "spi": 0, "sta": 0, "source": "Quest: Compendium of the Fallen (from 28)", "faction": "Horde", "armor": "-"},
  {"name": "Raptor's Gaze", "slot": "Off hand", "req": 26, "heal": 0, "sp": 8, "mp5": 0, "int": 4, "spi": 0, "sta": 4, "source": "Shadetooth, Excavation Site: Wetlands", "faction": "Both", "armor": "-"},
  {"name": "Staff of the Friar", "slot": "Two-hand", "req": 21, "heal": 52, "sp": 0, "mp5": 0, "int": 3, "spi": 12, "sta": 4, "source": "Blackfathom Deeps trash", "faction": "Both", "other": "Very rare drop", "armor": "-"},
  {"name": "Defiler's Talisman", "slot": "Trinket", "req": 28, "heal": 0, "sp": 0, "mp5": 0, "int": 0, "spi": 0, "sta": 6, "source": "Defilers vendor (Arathi Basin)", "faction": "Horde", "other": "Use: absorb about 300 physical damage (3 min); needs Defilers Friendly", "armor": "-"},
  {"name": "Satchel of Potions", "slot": "Trinket", "req": 0, "heal": 0, "sp": 0, "mp5": 0, "int": 0, "spi": 0, "sta": 0, "source": "Quest: Changing Tastes (Excavation Site)", "faction": "Horde", "other": "Use: random potion", "armor": "-"}
]
```

## 13. Reference implementation

The current working version as one self-contained HTML file. Match its behavior; restructure the code into the React app described above. The item data inside it is the same as section 12.

```html
<title>Tidecaller Stat Weights</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Marcellus+SC&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
/* Layout: inputs rail on the left, live weights and regen on the right, item scorer full width below. */
:root{
  --bg:#eef2f1; --panel:#ffffff; --ink:#16211f; --muted:#596966; --line:#d3dcd9; --soft:#e4ebe9;
  --accent:#0d6b62; --accent-soft:#d6ece8; --mana:#2c5aad; --mana-soft:#dbe5f6; --stam:#868e8b; --warn:#9a5a12;
  --f-display:"Marcellus SC", "Trajan Pro", Georgia, serif;
  --f-body:"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
  --f-mono:"IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --bg:#0e1413; --panel:#151d1c; --ink:#e2eae7; --muted:#93a39f; --line:#27322f; --soft:#1c2624;
    --accent:#4fc4b5; --accent-soft:#16312d; --mana:#82a8f2; --mana-soft:#1a2740; --stam:#8f9895; --warn:#e3a658;
    color-scheme:dark;
  }
}
:root[data-theme="dark"]{
  --bg:#0e1413; --panel:#151d1c; --ink:#e2eae7; --muted:#93a39f; --line:#27322f; --soft:#1c2624;
  --accent:#4fc4b5; --accent-soft:#16312d; --mana:#82a8f2; --mana-soft:#1a2740; --stam:#8f9895; --warn:#e3a658;
  color-scheme:dark;
}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--ink);font-family:var(--f-body);font-size:14px;line-height:1.5}
.wrap{max-width:1200px;margin:0 auto;padding-block:28px 48px;padding-left:max(16px, env(safe-area-inset-left, 0px));padding-right:max(16px, env(safe-area-inset-right, 0px))}
header.top{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px 24px;margin-bottom:22px}
h1{font-family:var(--f-display);font-weight:400;font-size:clamp(26px,4vw,36px);letter-spacing:.02em;margin:0;line-height:1.1;text-wrap:balance}
.sub{color:var(--muted);margin:6px 0 0;max-width:62ch}
.scen{display:flex;flex-wrap:wrap;gap:6px}
.chip{font:500 13px var(--f-body);border:1px solid var(--line);background:var(--panel);color:var(--ink);padding:7px 12px;border-radius:999px;cursor:pointer}
.chip:hover{border-color:var(--accent)}
.chip[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:var(--panel)}
.chip:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:2px solid var(--accent);outline-offset:2px}

.main{display:grid;grid-template-columns:minmax(0,390px) minmax(0,1fr);gap:20px;align-items:start}
@media (max-width:900px){.main{grid-template-columns:minmax(0,1fr)}}
.rail{display:flex;flex-direction:column;gap:14px}
.out{display:flex;flex-direction:column;gap:14px;min-width:0}
.box{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:16px 16px 18px;min-width:0}
h2{font-family:var(--f-display);font-weight:400;font-size:17px;letter-spacing:.04em;margin:0 0 12px;display:flex;justify-content:space-between;align-items:baseline;gap:8px}
h2 small{font-family:var(--f-body);font-size:12px;color:var(--muted);letter-spacing:0}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px}
.field{display:flex;flex-direction:column;gap:4px;min-width:0}
.field.full{grid-column:1/-1}
label,.lab{font-size:12px;color:var(--muted);font-weight:500}
textarea{resize:vertical;line-height:1.5}
input[type=number],input[type=text],select,textarea{font:500 14px var(--f-mono);font-variant-numeric:tabular-nums;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:7px 9px;width:100%;min-width:0}
select{font-family:var(--f-body)}
input[type=range]{width:100%;accent-color:var(--accent)}
.hint{font-size:12px;color:var(--muted);margin:2px 0 0}
.row{display:flex;align-items:center;justify-content:space-between;gap:10px}
.tog{display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--soft)}
.tog:first-of-type{border-top:0}
.tog .t{flex:1;min-width:0}
.tog .t b{display:block;font-weight:600;font-size:13px}
.tog .t span{font-size:12px;color:var(--muted)}
.sw{position:relative;width:38px;height:22px;flex:none}
.sw input{opacity:0;width:100%;height:100%;margin:0;cursor:pointer;position:absolute;inset:0;z-index:1}
.sw i{position:absolute;inset:0;border-radius:999px;background:var(--line);transition:background .15s}
.sw i::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:var(--panel);transition:transform .15s}
.sw input:checked + i{background:var(--accent)}
.sw input:checked + i::after{transform:translateX(16px)}
.sw input:focus-visible + i{outline:2px solid var(--accent);outline-offset:2px}
.pct{width:70px!important;flex:none}

/* outputs */
.verdict{font-family:var(--f-display);font-size:clamp(18px,2.4vw,22px);letter-spacing:.02em;margin:0 0 4px;text-wrap:balance}
.verdict .op{color:var(--muted);padding:0 .25em}
.regime{font-size:12.5px;color:var(--muted);margin:0 0 14px}
.bars{display:flex;flex-direction:column;gap:9px}
.bar{display:grid;grid-template-columns:110px minmax(0,1fr) 64px;align-items:center;gap:10px}
.bar .n{font-weight:600;font-size:13px}
.bar .n small{display:block;font-weight:400;color:var(--muted);font-size:11.5px}
.track{height:14px;background:var(--soft);border-radius:3px;overflow:hidden}
.fill{height:100%;border-radius:3px;transition:width .25s ease}
.fill.heal{background:var(--accent)}
.fill.mana{background:var(--mana)}
.fill.stam{background:var(--stam)}
.bar .v{font:500 14px var(--f-mono);font-variant-numeric:tabular-nums;text-align:right}
@media (max-width:480px){.bar{grid-template-columns:86px minmax(0,1fr) 54px}}
.conv{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:16px;padding-top:14px;border-top:1px solid var(--soft)}
.kv .k{font-size:12px;color:var(--muted)}
.kv .v{font:500 17px var(--f-mono);font-variant-numeric:tabular-nums}
.kv .v small{font-size:12px;color:var(--muted);font-weight:400}

.scroll{overflow-x:auto;margin:0 -4px;padding:0 4px}
table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}
th{font:500 11.5px var(--f-body);color:var(--muted);text-align:right;padding:6px 8px;border-bottom:1px solid var(--line);white-space:nowrap;letter-spacing:.02em}
th:first-child,td:first-child{text-align:left}
td{padding:7px 8px;border-bottom:1px solid var(--soft);text-align:right;font-family:var(--f-mono);font-size:13px;white-space:nowrap}
td.nm{font-family:var(--f-body);font-weight:500}
tr.sel td{background:var(--accent-soft)}
tr.click{cursor:pointer}
tr.click:hover td{background:var(--soft)}
tr.sel:hover td{background:var(--accent-soft)}
.tag{display:inline-block;font:600 10.5px var(--f-body);letter-spacing:.04em;text-transform:uppercase;padding:2px 6px;border-radius:4px;background:var(--accent-soft);color:var(--accent);margin-left:6px;vertical-align:1px}
.tag.mana{background:var(--mana-soft);color:var(--mana)}
.tag.warn{background:transparent;color:var(--warn);border:1px solid var(--warn)}
.dim{color:var(--muted)}

details{border-top:1px solid var(--soft);margin-top:12px;padding-top:10px}
summary{cursor:pointer;font-weight:600;font-size:13px}
details .grid2{margin-top:10px}
.btn{font:600 13px var(--f-body);border:1px solid var(--accent);background:var(--accent);color:var(--panel);border-radius:6px;padding:8px 12px;cursor:pointer}
.btn.ghost{background:transparent;color:var(--accent)}
.btn:disabled{opacity:.45;cursor:not-allowed}
.calres{font-size:12.5px;margin:10px 0 0;color:var(--muted)}
.calres b{color:var(--ink);font-family:var(--f-mono)}

/* items */
.items{margin-top:20px}
.items .head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:10px;margin-bottom:12px}
.items .head p{margin:4px 0 0;color:var(--muted);font-size:13px;max-width:70ch}
.add{display:grid;grid-template-columns:2fr 1.3fr repeat(6,minmax(58px,1fr)) auto;gap:8px;align-items:end;padding:12px;background:var(--soft);border-radius:8px;margin-bottom:14px}
@media (max-width:900px){.add{grid-template-columns:1fr 1fr 1fr}.add .nmf{grid-column:1/-1}}
.filters{display:flex;flex-wrap:wrap;gap:12px 22px;align-items:flex-end;margin-bottom:14px}
.filters .field{width:150px}
.profs{border:0;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:4px 14px;align-items:center}
.profs legend{padding:0;margin-bottom:4px;width:100%}
.profs label,.showall{font-size:13px;color:var(--ink);font-weight:400;display:flex;align-items:center;gap:6px;cursor:pointer}
.profs input,.showall input{accent-color:var(--accent);width:16px;height:16px;margin:0}
.addbox{margin:8px 0 14px}
.addbox .add{margin-top:10px}
td.src{font-family:var(--f-body);font-size:12.5px;color:var(--muted);white-space:normal;min-width:180px;text-align:left}
tr.cant td{opacity:.45}
tr.cant td.src{opacity:1}
.why{color:var(--warn);font-weight:600}
#bestTable td:nth-child(2){font-family:var(--f-body);font-weight:500;text-align:left}
#bestTable th:nth-child(2),#bestTable th:nth-child(4){text-align:left}
#bestTable tfoot td{border-top:1px solid var(--line);border-bottom:0;font-weight:600}
.slotgrp td.slot{font-family:var(--f-display);font-size:14px;letter-spacing:.04em;color:var(--muted);padding-top:14px;background:transparent}
td .x{font:500 12px var(--f-body);background:none;border:0;color:var(--muted);cursor:pointer;padding:2px 6px;border-radius:4px}
td .x:hover{color:var(--warn)}
td.score{font-weight:600}
.best td.score{color:var(--accent)}
.foot{margin-top:22px;color:var(--muted);font-size:12.5px;max-width:90ch}
.foot p{margin:0 0 8px}
@media (prefers-reduced-motion: reduce){.fill,.sw i,.sw i::after{transition:none}}
</style>

<div class="wrap">
  <header class="top">
    <div>
      <h1>Tidecaller Stat Weights</h1>
      <p class="sub">Resto Shaman stat weights for WoW Forever, worked out from your own fight. Every number is in points of Healing: a weight of 4 means one point of that stat is worth four points of Healing.</p>
    </div>
    <div class="scen" role="group" aria-label="Fight presets">
      <button class="chip" data-scen="trash" type="button">Trash pull</button>
      <button class="chip" data-scen="boss" type="button">Dungeon boss</button>
      <button class="chip" data-scen="raid" type="button">Raid boss</button>
    </div>
  </header>

  <div class="main">
    <div class="rail">
      <section class="box" aria-labelledby="h-char">
        <h2 id="h-char">Character <small>from your character sheet</small></h2>
        <div class="grid2">
          <div class="field"><label for="level">Level</label><input id="level" data-k="level" type="number" min="1" max="60" step="1"></div>
          <div class="field"><label for="pool">Max mana</label><input id="pool" data-k="pool" type="number" min="0" step="1"></div>
          <div class="field"><label for="heal">Healing power</label><input id="heal" data-k="heal" type="number" min="0" step="1"></div>
          <div class="field"><label for="spi">Spirit</label><input id="spi" data-k="spi" type="number" min="0" step="1"></div>
          <div class="field"><label for="g">Gear MP5</label><input id="g" data-k="g" type="number" min="0" step="1"></div>
          <div class="field"><label for="buff">Buff MP5</label><input id="buff" data-k="buff" type="number" min="0" step="1"></div>
          <p class="hint field full">Healing power is Healing plus Spell Power. Spell Damage on healing items does not heal. Buff MP5 covers Mana Spring, Blessing of Wisdom and similar.</p>
        </div>
      </section>

      <section class="box" aria-labelledby="h-reg">
        <h2 id="h-reg">Regen while casting</h2>
        <div class="tog">
          <div class="t"><b>Spirit regen talent</b><span>Mindfulness for Shaman. Every caster has one; 3/3 keeps 50%.</span></div>
          <input id="pct" class="pct" data-k="pct" type="number" min="0" max="100" step="1" aria-label="Share kept while casting, percent" list="pcts">
          <datalist id="pcts"><option value="17"></option><option value="33"></option><option value="50"></option></datalist>
          <label class="sw" for="talent"><input id="talent" data-k="talent" type="checkbox" aria-label="Spirit regen talent"><i></i></label>
        </div>
        <div class="tog">
          <div class="t"><b>Polished Driftwood Icon</b><span>Relic, +8% kept while casting. Assumed to add to the talent.</span></div>
          <label class="sw" for="icon"><input id="icon" data-k="icon" type="checkbox" aria-label="Polished Driftwood Icon"><i></i></label>
        </div>
        <div class="tog">
          <div class="t"><b>Improved Healing Wave 5/5</b><span>Healing Wave casts 0.5 sec faster. Affects heals per second only.</span></div>
          <label class="sw" for="imphw"><input id="imphw" data-k="imphw" type="checkbox" aria-label="Improved Healing Wave"><i></i></label>
        </div>
        <div class="tog">
          <div class="t"><b>Water Shield</b><span>Each heal crit returns 2% of max mana. Set your heal crit chance.</span></div>
          <input id="crit" class="pct" data-k="crit" type="number" min="0" max="100" step="0.5" aria-label="Heal crit chance, percent">
          <label class="sw" for="ws"><input id="ws" data-k="ws" type="checkbox" aria-label="Water Shield"><i></i></label>
        </div>
        <details id="spiritbox">
          <summary>Spirit formula and calibration</summary>
          <div class="grid2">
            <div class="field full"><label for="smodel">Shape</label><select id="smodel"><option value="line">Straight line: base plus rate × Spirit</option><option value="curve">Levels off: cap minus B ÷ Spirit</option></select></div>
            <div class="field"><label for="sA">Cap, MP5</label><input id="sA" data-k="sA" type="number" step="0.1"></div>
            <div class="field"><label for="sB">B</label><input id="sB" data-k="sB" type="number" step="1"></div>
            <div class="field"><label for="sbase">Line base, MP5</label><input id="sbase" data-k="sbase" type="number" step="0.1"></div>
            <div class="field"><label for="sper">Line MP5 per Spirit</label><input id="sper" data-k="sper" type="number" step="0.01"></div>
            <p class="hint field full">The default is a straight line fitted to eleven level 22 Orc readings from 48 to 90 Spirit: about 0.63 MP5 per Spirit, within 0.6 MP5 of every reading. The 43 Spirit reading (no bonus Spirit) sits off the line and is left out. Intellect does not change the result. Add a reading per line: your Spirit, then the Spirit tooltip's "Mana Regeneration by N per 5 sec while not casting". Lines starting with # are ignored.</p>
            <div class="field full"><label for="readings">Readings (Spirit, mana regen)</label><textarea id="readings" rows="9" spellcheck="false"># 43 53 (no bonus Spirit, sits off the line)
48 60
53 64
56 66
60 68
61 69
65 71
71 75
76 78
81 81
87 85
90 87</textarea></div>
            <p class="hint field full">Casting share (optional): if your sheet shows total mana regen while casting and not casting, enter both. Gear MP5 above is subtracted.</p>
            <div class="field"><label for="c3n">Sheet regen not casting</label><input id="c3n" type="number" step="0.1"></div>
            <div class="field"><label for="c3c">Sheet regen casting</label><input id="c3c" type="number" step="0.1"></div>
          </div>
          <p class="calres" id="calres"></p>
          <div class="row" style="justify-content:flex-start;gap:8px;margin-top:10px;flex-wrap:wrap">
            <button class="btn" id="calCurve" type="button" disabled>Use levels-off fit</button>
            <button class="btn ghost" id="calLine" type="button" disabled>Use straight-line fit</button>
            <button class="btn ghost" id="calShare" type="button" disabled>Use measured casting share</button>
            <button class="btn ghost" id="calReset" type="button">Restore defaults</button>
          </div>
        </details>
      </section>

      <section class="box" aria-labelledby="h-fight">
        <h2 id="h-fight">Fight</h2>
        <div class="grid2">
          <div class="field"><label for="t">Length, seconds</label><input id="t" data-k="t" type="number" min="10" step="5"></div>
          <div class="field"><label for="stw">Stamina weight</label><input id="stw" data-k="stw" type="number" min="0" step="0.05"></div>
          <div class="field full">
            <div class="row"><label for="f">Time inside the five-second rule</label><span class="lab" id="fOut"></span></div>
            <input id="f" data-k="f" type="range" min="0" max="100" step="5">
            <p class="hint">Casting once every five seconds counts as 100%, even if you are only casting half the time.</p>
          </div>
          <div class="field full">
            <div class="row"><label for="w">Fights where you run out of mana</label><span class="lab" id="wOut"></span></div>
            <input id="w" data-k="w" type="range" min="0" max="100" step="5">
            <p class="hint">Mana stats only matter when mana is what stops you. If you always finish with mana left, set this to 0.</p>
          </div>
        </div>
      </section>
    </div>

    <div class="out">
      <section class="box" aria-labelledby="h-w">
        <h2 id="h-w">Stat weights <small id="wnote"></small></h2>
        <p class="verdict" id="verdict"></p>
        <p class="regime" id="regime"></p>
        <div class="bars" id="bars"></div>
        <div class="conv" id="conv"></div>
      </section>

      <section class="box" aria-labelledby="h-spell">
        <h2 id="h-spell">The heal you spam <small>click a row to pick it</small></h2>
        <div class="scroll"><table id="ranks"><thead><tr>
          <th>Rank</th><th>Learned</th><th>Gear bonus kept</th><th>Heals</th><th>Mana</th><th>Heal per mana</th><th>Heal per sec</th>
        </tr></thead><tbody></tbody></table></div>
        <details>
          <summary>Edit the selected rank's values</summary>
          <div class="grid2">
            <div class="field"><label for="eb">Average base heal</label><input id="eb" type="number" step="0.5"></div>
            <div class="field"><label for="ec">Mana cost</label><input id="ec" type="number" step="1"></div>
            <div class="field"><label for="et">Base cast time, sec</label><input id="et" type="number" step="0.1"></div>
            <div class="field"><span class="lab">Source</span><span id="esrc" class="hint" style="margin:6px 0 0"></span></div>
          </div>
          <div class="row" style="justify-content:flex-start;margin-top:10px"><button class="btn ghost" id="eReset" type="button">Restore this rank</button></div>
        </details>
      </section>
    </div>
  </div>

  <section class="box items" aria-labelledby="h-items">
    <div class="head">
      <div>
        <h2 id="h-items" style="margin:0">Best set</h2>
        <p id="dbnote"></p>
      </div>
    </div>
    <div class="filters">
      <div class="field"><label for="faction">Faction</label><select id="faction"><option>Horde</option><option>Alliance</option></select></div>
      <div class="field"><label for="maxlvl">Usable up to level</label><input id="maxlvl" type="number" min="1" max="60" step="1"></div>
      <fieldset class="profs"><legend class="lab">Your professions</legend>
        <label><input type="checkbox" data-prof="Tailoring"> Tailoring</label>
        <label><input type="checkbox" data-prof="Leatherworking"> Leatherworking</label>
        <label><input type="checkbox" data-prof="Enchanting"> Enchanting</label>
        <label><input type="checkbox" data-prof="Engineering"> Engineering</label>
      </fieldset>
      <label class="showall"><input type="checkbox" id="showAll"> Show gear you can't use</label>
    </div>
    <div class="scroll"><table id="bestTable"><thead><tr>
      <th>Slot</th><th>Pick</th><th>Score</th><th>Where it comes from</th>
    </tr></thead><tbody></tbody><tfoot><tr><td class="nm">Total</td><td></td><td class="score" id="bestTotal"></td><td class="nm dim" id="bestWeapon"></td></tr></tfoot></table></div>

    <h2 style="margin:22px 0 4px">Every candidate <small>score is in points of Healing</small></h2>
    <details class="addbox">
      <summary>Add your own item</summary>
    <form class="add" id="addForm" autocomplete="off">
      <div class="field nmf"><label for="a-name">Item</label><input id="a-name" type="text" placeholder="Item name" required></div>
      <div class="field"><label for="a-slot">Slot</label><select id="a-slot"></select></div>
      <div class="field"><label for="a-heal">Healing</label><input id="a-heal" type="number" step="1"></div>
      <div class="field"><label for="a-sp">Spell Pwr</label><input id="a-sp" type="number" step="1"></div>
      <div class="field"><label for="a-mp5">MP5</label><input id="a-mp5" type="number" step="1"></div>
      <div class="field"><label for="a-int">Int</label><input id="a-int" type="number" step="1"></div>
      <div class="field"><label for="a-spi">Spirit</label><input id="a-spi" type="number" step="1"></div>
      <div class="field"><label for="a-sta">Stam</label><input id="a-sta" type="number" step="1"></div>
      <button class="btn" type="submit">Add item</button>
    </form>
    </details>
    <div class="scroll"><table id="itemTable"><thead><tr>
      <th>Item</th><th>Req</th><th>Healing</th><th>Spell Pwr</th><th>MP5</th><th>Int</th><th>Spirit</th><th>Stam</th><th>Score</th><th>Where it comes from</th><th></th>
    </tr></thead><tbody></tbody></table></div>
  </section>

  <div class="foot">
    <p><b>How it works.</b> When mana runs out, total healing is your total mana times healing per mana. One MP5 is worth (fight length / 5) × (base heal + coefficient × healing power) / (total mana × coefficient) points of Healing. Intellect gives 15 mana once per fight, and with Water Shield each heal crit returns 2% of max mana, so Intellect also makes every crit return more. Water Shield's limits (three globes, one proc every few seconds, a global cooldown to reapply) are not modelled; at normal crit rates they rarely bind. Spirit regen keeps running at the talent's share inside the five-second rule and at full rate outside it; gear and buff MP5 always run at full rate. The final weights are the mana-bound values scaled by how often you actually run out.</p>
    <p><b>Downranking.</b> Forever cuts a rank's healing power bonus by 5% for each level past 17 above the level you learned it. The coefficient is the base cast time divided by 3.5 seconds. Crits and percent talents multiply every term equally, so they do not change the weights.</p>
    <p><b>Unconfirmed.</b> The Spirit rate above 90 Spirit, why the first few points of bonus Spirit give more, and whether level moves it (measured at level 22 from 43 to 90 Spirit; Intellect does not change it), whether the Icon stacks with the talent, Healing Wave rank 4's base heal (read from a chart), and the mana costs of Healing Wave rank 10 and Lesser Healing Wave rank 1 (Classic values). Calibrate and edit as the beta answers these.</p>
  </div>
</div>

<script>
(function(){
  "use strict";
  var SPELLS = [
    {id:"hw1", name:"Healing Wave", rank:1, lvl:1,  base:41.5,  cost:25,  cast:1.5, src:"Beta tooltip, 36 to 47"},
    {id:"hw2", name:"Healing Wave", rank:2, lvl:6,  base:76,    cost:45,  cast:2.0, src:"Beta tooltip, 69 to 83"},
    {id:"hw3", name:"Healing Wave", rank:3, lvl:12, base:138.5, cost:80,  cast:2.5, src:"Beta tooltip, 126 to 151"},
    {id:"hw4", name:"Healing Wave", rank:4, lvl:18, base:267,   cost:155, cast:3.0, src:"Read from a ForeverChanges chart, unconfirmed", warn:true},
    {id:"hw5", name:"Healing Wave", rank:5, lvl:24, base:355.5, cost:200, cast:3.0, src:"Beta tooltip, 328 to 383"},
    {id:"hw6", name:"Healing Wave", rank:6, lvl:32, base:500.5, cost:265, cast:3.0, src:"Beta tooltip, 463 to 538"},
    {id:"hw7", name:"Healing Wave", rank:7, lvl:40, base:704.5, cost:340, cast:3.0, src:"Beta data, 654 to 755"},
    {id:"hw8", name:"Healing Wave", rank:8, lvl:48, base:995.5, cost:440, cast:3.0, src:"Beta data, 927 to 1064"},
    {id:"hw9", name:"Healing Wave", rank:9, lvl:56, base:1366,  cost:560, cast:3.0, src:"Beta data, 1275 to 1457"},
    {id:"hw10",name:"Healing Wave", rank:10,lvl:60, base:1615,  cost:620, cast:3.0, src:"Heal 1508 to 1722; cost is Classic's, unconfirmed", warn:true},
    {id:"lhw1",name:"Lesser Healing Wave", rank:1, lvl:20, base:161.5, cost:105, cast:1.5, src:"Heal 150 to 173; cost is Classic's, unconfirmed", warn:true},
    {id:"lhw2",name:"Lesser Healing Wave", rank:2, lvl:28, base:228.5, cost:145, cast:1.5, src:"Beta tooltip, 214 to 243"}
  ];
  var SLOTS = ["Head","Neck","Shoulder","Back","Chest","Wrist","Hands","Waist","Legs","Feet","Finger","Trinket","Main hand","Off hand","Two-hand"];
  var DB = [{"name":"Holy Shroud","slot":"Head","req":27,"heal":33,"sp":0,"mp5":0,"int":0,"spi":6,"sta":0,"id":"db0","source":"World drop / auction house","faction":"Both","armor":"Cloth"},{"name":"Enduring Cap","slot":"Head","req":28,"heal":0,"sp":0,"mp5":0,"int":16,"spi":7,"sta":0,"id":"db1","source":"World drop / auction house","faction":"Both","armor":"Leather"},{"name":"Embalmed Shroud","slot":"Head","req":30,"heal":24,"sp":0,"mp5":0,"int":0,"spi":12,"sta":7,"id":"db2","source":"Fallen Champion (rare), SM Graveyard","faction":"Both","armor":"Cloth"},{"name":"Wild Headdress","slot":"Head","req":0,"heal":0,"sp":12,"mp5":0,"int":11,"spi":0,"sta":0,"id":"db3","source":"Quest: Wanted! Marez Cowl (Arathi)","faction":"Alliance","other":"Elite quest","armor":"Leather"},{"name":"Sorrow's Shroud","slot":"Head","req":24,"heal":16,"sp":5,"mp5":3,"int":0,"spi":0,"sta":11,"id":"db4","source":"Sorrow Wing (rare elite), Stonetalon Mountains","faction":"Both","armor":"Cloth"},{"name":"Filigreed Pristine Circlet","slot":"Head","req":25,"heal":22,"sp":0,"mp5":0,"int":0,"spi":0,"sta":12,"id":"db5","source":"Crafted: Tailoring 125 (pattern drops in RFK)","faction":"Both","prof":"Tailoring","armor":"Cloth"},{"name":"Wisdom's Leather Helm","slot":"Head","req":25,"heal":21,"sp":0,"mp5":0,"int":0,"spi":0,"sta":13,"id":"db6","source":"Crafted: Leatherworking 130","faction":"Both","prof":"Leatherworking","armor":"Leather"},{"name":"Kaleidoscope Chain","slot":"Neck","req":30,"heal":0,"sp":0,"mp5":0,"int":4,"spi":4,"sta":4,"id":"db7","source":"World drop / auction house","faction":"Both","other":"+4 Str, +4 Agi","armor":"-"},{"name":"Archmagister's Faceted Pendant","slot":"Neck","req":30,"heal":0,"sp":0,"mp5":0,"int":6,"spi":0,"sta":0,"id":"db8","source":"Shade of the Archmage, City of Dalaran","faction":"Both","other":"+12 attack power","armor":"-"},{"name":"Crystal Starfire Medallion","slot":"Neck","req":26,"heal":0,"sp":0,"mp5":0,"int":4,"spi":3,"sta":4,"id":"db9","source":"World drop / auction house","faction":"Both","armor":"-"},{"name":"Giantstone Medallion","slot":"Neck","req":0,"heal":0,"sp":0,"mp5":0,"int":0,"spi":10,"sta":0,"id":"db10","source":"Quest: Gleaning Our Future (Wetlands)","faction":"Alliance","armor":"-"},{"name":"Mark of the Pack Leader","slot":"Neck","req":20,"heal":0,"sp":0,"mp5":0,"int":5,"spi":0,"sta":0,"id":"db11","source":"Humar the Pridelord (rare), The Barrens","faction":"Both","other":"+5 Str","armor":"-"},{"name":"Scorn's Icy Choker","slot":"Neck","req":30,"heal":0,"sp":7,"mp5":0,"int":6,"spi":0,"sta":5,"id":"db12","source":"Scorn, SM Graveyard (Classic event boss)","faction":"Both","other":"Source unconfirmed in Forever","armor":"-"},{"name":"Stygian Bone Amulet","slot":"Neck","req":29,"heal":0,"sp":5,"mp5":0,"int":0,"spi":0,"sta":4,"id":"db13","source":"Blind Hunter (rare), Razorfen Kraul","faction":"Both","armor":"-"},{"name":"Explorers' League Commendation","slot":"Neck","req":0,"heal":0,"sp":0,"mp5":0,"int":0,"spi":9,"sta":9,"id":"db14","source":"Quest: Mythology of the Titans (Uldaman)","faction":"Alliance","armor":"-"},{"name":"Death Speaker Mantle","slot":"Shoulder","req":27,"heal":0,"sp":6,"mp5":0,"int":11,"spi":0,"sta":0,"id":"db15","source":"Death Speaker Jargba, Razorfen Kraul","faction":"Both","armor":"Cloth"},{"name":"Batwing Mantle","slot":"Shoulder","req":29,"heal":0,"sp":6,"mp5":0,"int":11,"spi":0,"sta":0,"id":"db16","source":"Blind Hunter (rare), Razorfen Kraul","faction":"Both","other":"+3 Agi","armor":"Cloth"},{"name":"Bloodmage Mantle","slot":"Shoulder","req":30,"heal":0,"sp":9,"mp5":0,"int":9,"spi":0,"sta":0,"id":"db17","source":"Bloodmage Thalnos, SM Graveyard","faction":"Both","other":"+9 health regen","armor":"Cloth"},{"name":"Berylline Pads","slot":"Shoulder","req":0,"heal":0,"sp":7,"mp5":0,"int":10,"spi":0,"sta":5,"id":"db18","source":"Quest: A Vengeful Fate (RFK, from 29)","faction":"Both","armor":"Cloth"},{"name":"Magician's Mantle","slot":"Shoulder","req":20,"heal":0,"sp":5,"mp5":0,"int":9,"spi":0,"sta":0,"id":"db19","source":"World drop / auction house","faction":"Both","armor":"Cloth"},{"name":"Ghostly Mantle","slot":"Shoulder","req":0,"heal":6,"sp":0,"mp5":0,"int":0,"spi":6,"sta":0,"id":"db20","source":"Quest: Deathstalkers in Shadowfang","faction":"Horde","other":"Nerfed Oct 8","armor":"Cloth"},{"name":"Fairywing Mantle","slot":"Shoulder","req":0,"heal":0,"sp":4,"mp5":0,"int":6,"spi":0,"sta":1,"id":"db21","source":"Quest: A Fine Mess (Gnomeregan)","faction":"Both","other":"Nerfed Oct 8","armor":"Cloth"},{"name":"Moonlit Amice","slot":"Shoulder","req":0,"heal":0,"sp":7,"mp5":0,"int":0,"spi":0,"sta":7,"id":"db22","source":"Quest: Return to Vahlarriel (Desolace)","faction":"Alliance","armor":"Cloth"},{"name":"Rose Mantle","slot":"Shoulder","req":0,"heal":0,"sp":5,"mp5":0,"int":5,"spi":0,"sta":0,"id":"db23","source":"Quest: Morganth (Redridge)","faction":"Alliance","armor":"Cloth"},{"name":"Naga Priestess's Mantle","slot":"Shoulder","req":0,"heal":10,"sp":0,"mp5":0,"int":0,"spi":6,"sta":8,"id":"db24","source":"Quest: The Only Good Brinescale...","faction":"Horde","other":"Source reported, not checked","armor":"Cloth"},{"name":"Red Wool Cloak","slot":"Back","req":26,"heal":9,"sp":0,"mp5":3,"int":0,"spi":0,"sta":0,"id":"db25","source":"Bazil Thredd, The Stockade","faction":"Both","armor":"Cloth"},{"name":"Repairman's Cape","slot":"Back","req":0,"heal":6,"sp":0,"mp5":0,"int":3,"spi":5,"sta":0,"id":"db26","source":"Quest: Data Rescue","faction":"Alliance","armor":"Cloth"},{"name":"Brilliant Cloak","slot":"Back","req":0,"heal":0,"sp":6,"mp5":0,"int":5,"spi":0,"sta":5,"id":"db27","source":"Quest: Strahnbrad Mystery (Alterac)","faction":"Horde","armor":"Cloth"},{"name":"Glowing Thresher Cape","slot":"Back","req":24,"heal":7,"sp":0,"mp5":0,"int":0,"spi":8,"sta":0,"id":"db28","source":"Old Serra'kis, Blackfathom Deeps","faction":"Both","armor":"Cloth"},{"name":"Tattered Kirin Tor Cloak","slot":"Back","req":28,"heal":0,"sp":0,"mp5":0,"int":8,"spi":0,"sta":0,"id":"db29","source":"Unknown","faction":"Both","other":"+5 hit","armor":"Cloth"},{"name":"Battle Healer's Cloak","slot":"Back","req":28,"heal":13,"sp":0,"mp5":0,"int":0,"spi":4,"sta":6,"id":"db30","source":"Warsong Outriders reputation (Classic)","faction":"Horde","other":"Source unconfirmed in Forever","armor":"Cloth"},{"name":"Windsong Drape","slot":"Back","req":0,"heal":0,"sp":5,"mp5":0,"int":0,"spi":4,"sta":0,"id":"db31","source":"Quest: Free at Last","faction":"Horde","armor":"Cloth"},{"name":"Thornweaver Drape","slot":"Back","req":25,"heal":0,"sp":7,"mp5":0,"int":0,"spi":6,"sta":0,"id":"db32","source":"Roogug, Razorfen Kraul","faction":"Both","armor":"Cloth"},{"name":"Prelacy Cape","slot":"Back","req":0,"heal":7,"sp":0,"mp5":0,"int":0,"spi":3,"sta":0,"id":"db33","source":"Quest: Researching the Corruption","faction":"Alliance","armor":"Cloth"},{"name":"Death Speaker Robes","slot":"Chest","req":26,"heal":20,"sp":0,"mp5":0,"int":11,"spi":0,"sta":4,"id":"db34","source":"Death Speaker Jargba, Razorfen Kraul","faction":"Both","armor":"Cloth"},{"name":"Beguiler Robes","slot":"Chest","req":29,"heal":0,"sp":9,"mp5":0,"int":12,"spi":8,"sta":0,"id":"db35","source":"Scarlet Monastery trash","faction":"Both","other":"Very rare drop","armor":"Cloth"},{"name":"Civinad Robes","slot":"Chest","req":0,"heal":26,"sp":0,"mp5":0,"int":0,"spi":12,"sta":7,"id":"db36","source":"Quest: Rig Wars (Gnomeregan final boss)","faction":"Both","armor":"Cloth"},{"name":"Pristine Gown","slot":"Chest","req":22,"heal":20,"sp":0,"mp5":0,"int":7,"spi":4,"sta":6,"id":"db37","source":"Crafted: Tailoring 110","faction":"Both","prof":"Tailoring","armor":"Cloth"},{"name":"Violet Sorcerer's Robes","slot":"Chest","req":27,"heal":0,"sp":9,"mp5":0,"int":15,"spi":0,"sta":0,"id":"db38","source":"Arcanic Enigma, City of Dalaran","faction":"Both","other":"Violet Sorcerer's set piece","armor":"Cloth"},{"name":"Wisdom's Leather Tunic","slot":"Chest","req":22,"heal":18,"sp":0,"mp5":0,"int":6,"spi":6,"sta":5,"id":"db39","source":"Crafted: Leatherworking 110","faction":"Both","prof":"Leatherworking","armor":"Leather"},{"name":"Doomsayer's Robe","slot":"Chest","req":0,"heal":16,"sp":0,"mp5":0,"int":0,"spi":18,"sta":-11,"id":"db40","source":"Quest: Solution to Doom (from 30)","faction":"Both","armor":"Cloth"},{"name":"Zealot's Robe","slot":"Chest","req":0,"heal":0,"sp":11,"mp5":0,"int":7,"spi":7,"sta":0,"id":"db41","source":"Quest: An Unholy Alliance (RFK)","faction":"Horde","armor":"Cloth"},{"name":"Spidertank Oilrag","slot":"Wrist","req":29,"heal":0,"sp":9,"mp5":3,"int":0,"spi":0,"sta":0,"id":"db42","source":"Electrocutioner 6000, Gnomeregan","faction":"Both","armor":"Cloth"},{"name":"Mindthrust Bracers","slot":"Wrist","req":17,"heal":0,"sp":0,"mp5":3,"int":5,"spi":0,"sta":1,"id":"db43","source":"Shadowfang Keep trash","faction":"Both","other":"Rare drop","armor":"Cloth"},{"name":"Glowing Magical Bracelets","slot":"Wrist","req":26,"heal":0,"sp":0,"mp5":0,"int":8,"spi":0,"sta":0,"id":"db44","source":"World drop / auction house","faction":"Both","other":"+3 Str","armor":"Cloth"},{"name":"Nightsky Wristbands","slot":"Wrist","req":28,"heal":0,"sp":0,"mp5":0,"int":6,"spi":3,"sta":0,"id":"db45","source":"World drop / auction house","faction":"Both","armor":"Cloth"},{"name":"Silkstream Cuffs","slot":"Wrist","req":0,"heal":0,"sp":0,"mp5":0,"int":5,"spi":4,"sta":4,"id":"db46","source":"Quest: Book of the Ancients (from 30)","faction":"Both","armor":"Cloth"},{"name":"Knife-Polishing Rag","slot":"Wrist","req":0,"heal":0,"sp":6,"mp5":0,"int":0,"spi":4,"sta":0,"id":"db47","source":"Quest: Open the Maw (Wetlands)","faction":"Horde","armor":"Cloth"},{"name":"Graveweave Bindings","slot":"Wrist","req":26,"heal":0,"sp":5,"mp5":2,"int":0,"spi":0,"sta":0,"id":"db48","source":"Atrexis the Grave Knight, City of Dalaran","faction":"Both","other":"+6 Str","armor":"Cloth"},{"name":"Bridgebreaker Bindings","slot":"Wrist","req":24,"heal":9,"sp":0,"mp5":0,"int":0,"spi":0,"sta":0,"id":"db49","source":"Kam Deepfury, The Stockade","faction":"Both","armor":"Cloth"},{"name":"Prospector Gloves","slot":"Hands","req":0,"heal":0,"sp":9,"mp5":0,"int":8,"spi":0,"sta":0,"id":"db50","source":"Quest: Agmond's Fate (Loch Modan)","faction":"Alliance","armor":"Leather"},{"name":"Truefaith Gloves","slot":"Hands","req":25,"heal":15,"sp":0,"mp5":0,"int":3,"spi":0,"sta":0,"id":"db51","source":"Crafted: Tailoring 125","faction":"Both","other":"Bind on equip, anyone can wear","armor":"Cloth"},{"name":"Gloves of Old","slot":"Hands","req":29,"heal":0,"sp":0,"mp5":0,"int":5,"spi":12,"sta":0,"id":"db52","source":"World drop / auction house","faction":"Both","armor":"Cloth"},{"name":"Hotshot Pilot's Gloves","slot":"Hands","req":27,"heal":0,"sp":0,"mp5":0,"int":8,"spi":5,"sta":5,"id":"db53","source":"Gnomeregan trash (rare)","faction":"Both","other":"+4 Agility","armor":"Cloth"},{"name":"Restorer's Fine Gloves","slot":"Hands","req":0,"heal":11,"sp":0,"mp5":0,"int":0,"spi":8,"sta":6,"id":"db54","source":"Quest: Agmond's Fate (Loch Modan)","faction":"Alliance","armor":"Cloth"},{"name":"Pristine Gloves","slot":"Hands","req":15,"heal":11,"sp":0,"mp5":0,"int":3,"spi":0,"sta":4,"id":"db55","source":"Crafted: Tailoring 75","faction":"Both","prof":"Tailoring","armor":"Cloth"},{"name":"Wisdom's Leather Gloves","slot":"Hands","req":15,"heal":10,"sp":0,"mp5":0,"int":4,"spi":0,"sta":3,"id":"db56","source":"Crafted: Leatherworking 75","faction":"Both","prof":"Leatherworking","armor":"Leather"},{"name":"Naga Battle Gloves","slot":"Hands","req":22,"heal":15,"sp":0,"mp5":0,"int":0,"spi":0,"sta":4,"id":"db57","source":"Lady Sarevess, Blackfathom Deeps","faction":"Both","other":"+4 Strength","armor":"Leather"},{"name":"Oilrag Handwraps","slot":"Hands","req":0,"heal":0,"sp":9,"mp5":0,"int":2,"spi":0,"sta":2,"id":"db58","source":"Quest: The Lost Pages","faction":"Horde","armor":"Leather"},{"name":"Shilly Mitts","slot":"Hands","req":0,"heal":0,"sp":5,"mp5":0,"int":0,"spi":6,"sta":0,"id":"db59","source":"Quest: Gyrodrillmatic Excavationators","faction":"Alliance","armor":"Cloth"},{"name":"Mender's Leather Belt","slot":"Waist","req":30,"heal":19,"sp":0,"mp5":0,"int":6,"spi":6,"sta":4,"id":"db60","source":"Crafted: Leatherworking 150","faction":"Both","prof":"Leatherworking","armor":"Leather"},{"name":"Blightleaf Rope","slot":"Waist","req":29,"heal":0,"sp":7,"mp5":0,"int":10,"spi":0,"sta":0,"id":"db61","source":"Fel Ancient, City of Dalaran","faction":"Both","other":"+5 health regen","armor":"Cloth"},{"name":"Skycaller's Leather Belt","slot":"Waist","req":30,"heal":0,"sp":10,"mp5":0,"int":6,"spi":4,"sta":6,"id":"db62","source":"Crafted: Leatherworking 150","faction":"Both","prof":"Leatherworking","armor":"Leather"},{"name":"Violet Sash","slot":"Waist","req":0,"heal":0,"sp":6,"mp5":0,"int":9,"spi":0,"sta":0,"id":"db63","source":"Quest: Power Overwhelming (City of Dalaran)","faction":"Alliance","armor":"Cloth"},{"name":"Razzeric's Customized Seatbelt","slot":"Waist","req":0,"heal":0,"sp":0,"mp5":0,"int":12,"spi":0,"sta":1,"id":"db64","source":"Quest: Safety First","faction":"Both","other":"Quest is level 41","armor":"Cloth"},{"name":"Belt of Arugal","slot":"Waist","req":23,"heal":0,"sp":9,"mp5":0,"int":3,"spi":5,"sta":0,"id":"db65","source":"Archmage Arugal, Shadowfang Keep","faction":"Both","other":"+2 Agility","armor":"Cloth"},{"name":"Budding Leaf Belt","slot":"Waist","req":27,"heal":13,"sp":0,"mp5":0,"int":0,"spi":0,"sta":6,"id":"db66","source":"Unknown","faction":"Both","armor":"Leather"},{"name":"Pristine Sash","slot":"Waist","req":17,"heal":11,"sp":0,"mp5":0,"int":4,"spi":0,"sta":5,"id":"db67","source":"Crafted: Tailoring 85","faction":"Both","prof":"Tailoring","armor":"Cloth"},{"name":"Wisdom's Leather Leggings","slot":"Legs","req":25,"heal":21,"sp":0,"mp5":0,"int":7,"spi":7,"sta":6,"id":"db68","source":"Crafted: Leatherworking 125","faction":"Both","prof":"Leatherworking","armor":"Leather"},{"name":"Violet Sorcerer's Leggings","slot":"Legs","req":29,"heal":0,"sp":12,"mp5":0,"int":13,"spi":5,"sta":0,"id":"db69","source":"City of Dalaran drop","faction":"Both","other":"Violet Sorcerer's set piece","armor":"Cloth"},{"name":"Pristine Leggings","slot":"Legs","req":25,"heal":22,"sp":0,"mp5":0,"int":7,"spi":5,"sta":7,"id":"db70","source":"Crafted: Tailoring 125","faction":"Both","prof":"Tailoring","armor":"Cloth"},{"name":"Filigreed Pristine Leggings","slot":"Legs","req":20,"heal":18,"sp":0,"mp5":0,"int":6,"spi":4,"sta":5,"id":"db71","source":"Crafted: Tailoring 100","faction":"Both","prof":"Tailoring","armor":"Cloth"},{"name":"Magistrate's Pantaloons","slot":"Legs","req":0,"heal":0,"sp":7,"mp5":0,"int":13,"spi":0,"sta":0,"id":"db72","source":"Quest: The Fury Runs Deep","faction":"Alliance","armor":"Cloth"},{"name":"Wisdom's Leather Pants","slot":"Legs","req":20,"heal":20,"sp":0,"mp5":0,"int":6,"spi":4,"sta":4,"id":"db73","source":"Crafted: Leatherworking 105","faction":"Both","prof":"Leatherworking","armor":"Leather"},{"name":"Gaze Dreamer Pants","slot":"Legs","req":23,"heal":0,"sp":12,"mp5":0,"int":0,"spi":9,"sta":0,"id":"db74","source":"Twilight Lord Kelris, Blackfathom Deeps","faction":"Both","armor":"Cloth"},{"name":"Gilded Slippers","slot":"Feet","req":30,"heal":20,"sp":0,"mp5":0,"int":7,"spi":4,"sta":6,"id":"db75","source":"Crafted: Tailoring 150","faction":"Both","prof":"Tailoring","armor":"Cloth"},{"name":"Renewing Footpads","slot":"Feet","req":0,"heal":11,"sp":0,"mp5":0,"int":11,"spi":0,"sta":5,"id":"db76","source":"Quest: Heart of Disruption (City of Dalaran)","faction":"Alliance","armor":"Leather"},{"name":"Acidic Walkers","slot":"Feet","req":27,"heal":0,"sp":5,"mp5":0,"int":8,"spi":4,"sta":0,"id":"db77","source":"Viscous Fallout, Gnomeregan","faction":"Both","armor":"Cloth"},{"name":"Wisdom's Leather Boots","slot":"Feet","req":17,"heal":11,"sp":0,"mp5":0,"int":5,"spi":0,"sta":4,"id":"db78","source":"Crafted: Leatherworking 85","faction":"Both","prof":"Leatherworking","armor":"Leather"},{"name":"Violet Sorcerer's Sandals","slot":"Feet","req":28,"heal":0,"sp":0,"mp5":0,"int":11,"spi":0,"sta":7,"id":"db79","source":"City of Dalaran trash","faction":"Both","other":"Violet Sorcerer's set piece","armor":"Cloth"},{"name":"Gnomebot Operating Boots","slot":"Feet","req":29,"heal":11,"sp":0,"mp5":0,"int":0,"spi":0,"sta":12,"id":"db80","source":"Crowd Pummeler 9-60, Gnomeregan","faction":"Both","armor":"Leather"},{"name":"Rotmender's Treads","slot":"Feet","req":19,"heal":15,"sp":0,"mp5":0,"int":0,"spi":0,"sta":7,"id":"db81","source":"Rath'mael, Ruins of Lordaeron","faction":"Both","other":"Rotmender's set piece","armor":"Cloth"},{"name":"Everlast Boots","slot":"Feet","req":0,"heal":10,"sp":0,"mp5":0,"int":0,"spi":9,"sta":0,"id":"db82","source":"Quest: Power Stones","faction":"Both","other":"Quest is level 36","armor":"Cloth"},{"name":"Philanthropist's Ring","slot":"Finger","req":0,"heal":0,"sp":10,"mp5":0,"int":5,"spi":0,"sta":0,"id":"db83","source":"Quest: Greater Friend of the Library (20 books)","faction":"Both","armor":"-"},{"name":"Sea Giant's Toe Ring","slot":"Finger","req":30,"heal":18,"sp":0,"mp5":0,"int":0,"spi":0,"sta":0,"id":"db84","source":"Vendor: Gezzy Gunkgear, Booty Bay","faction":"Both","other":"Booty Bay Friendly","armor":"-"},{"name":"Ladimore Heirloom Ring","slot":"Finger","req":0,"heal":0,"sp":5,"mp5":0,"int":6,"spi":0,"sta":0,"id":"db85","source":"Quest: A Daughter's Love (Duskwood)","faction":"Alliance","armor":"-"},{"name":"Solid Gold Band","slot":"Finger","req":0,"heal":11,"sp":0,"mp5":0,"int":0,"spi":5,"sta":0,"id":"db86","source":"Quest: Opportunistic Education (City of Dalaran)","faction":"Horde","armor":"-"},{"name":"Runemender's Seal","slot":"Finger","req":27,"heal":9,"sp":0,"mp5":0,"int":0,"spi":7,"sta":4,"id":"db87","source":"Arcane Anomaly, City of Dalaran","faction":"Both","other":"Unique","armor":"-"},{"name":"Snake Hoop","slot":"Finger","req":0,"heal":0,"sp":6,"mp5":0,"int":5,"spi":0,"sta":0,"id":"db88","source":"Quest: Willix the Importer (RFK)","faction":"Both","armor":"-"},{"name":"Ring of Power Regulation","slot":"Finger","req":28,"heal":0,"sp":6,"mp5":3,"int":0,"spi":0,"sta":0,"id":"db89","source":"Relic Guardian, Excavation Site: Wetlands","faction":"Both","other":"Unique","armor":"-"},{"name":"Electrocutioner Lagnut","slot":"Finger","req":29,"heal":9,"sp":0,"mp5":0,"int":0,"spi":7,"sta":4,"id":"db90","source":"Electrocutioner 6000, Gnomeregan","faction":"Both","other":"Unique","armor":"-"},{"name":"Advisor's Ring","slot":"Finger","req":28,"heal":0,"sp":7,"mp5":2,"int":0,"spi":0,"sta":4,"id":"db91","source":"Defilers reputation (Classic)","faction":"Horde","other":"Source unconfirmed in Forever","armor":"-"},{"name":"Minor Recombobulator","slot":"Trinket","req":0,"heal":0,"sp":0,"mp5":0,"int":0,"spi":0,"sta":0,"id":"db92","source":"Crafted: Engineering 140","faction":"Both","other":"Use: restores 96 to 160 mana (5 min); needs Engineering 140 to use","prof":"Engineering","armor":"-"},{"name":"Roogug's Severed Head","slot":"Trinket","req":25,"heal":0,"sp":0,"mp5":0,"int":0,"spi":6,"sta":0,"id":"db93","source":"Roogug, Razorfen Kraul","faction":"Both","armor":"-"},{"name":"Worgenbane Talisman","slot":"Trinket","req":21,"heal":0,"sp":0,"mp5":2,"int":0,"spi":0,"sta":0,"id":"db94","source":"Commander Springvale, Shadowfang Keep","faction":"Both","armor":"-"},{"name":"Cursed Murloc Eye","slot":"Trinket","req":24,"heal":0,"sp":0,"mp5":0,"int":0,"spi":0,"sta":0,"id":"db95","source":"Gelihast, Blackfathom Deeps","faction":"Both","other":"Damage only, no healing value","armor":"-"},{"name":"Lookie's Spyglass","slot":"Trinket","req":18,"heal":0,"sp":0,"mp5":0,"int":0,"spi":1,"sta":0,"id":"db96","source":"Cookie, The Deadmines","faction":"Both","armor":"-"},{"name":"Wind Spirit Staff","slot":"Two-hand","req":29,"heal":70,"sp":0,"mp5":0,"int":0,"spi":16,"sta":6,"id":"db97","source":"Earthcaller Halmgar, Razorfen Kraul","faction":"Both","armor":"-"},{"name":"Healer's Staff","slot":"Two-hand","req":0,"heal":67,"sp":0,"mp5":5,"int":0,"spi":0,"sta":12,"id":"db98","source":"Quest: Elder Knowledge, Excavation Site: Wetlands","faction":"Both","armor":"-"},{"name":"Fallen Dragon's Scepter","slot":"Two-hand","req":0,"heal":0,"sp":36,"mp5":0,"int":11,"spi":13,"sta":0,"id":"db99","source":"Quest: Stopping the Cycle (Wetlands)","faction":"Alliance","other":"Elite quest","armor":"-"},{"name":"Odo's Ley Staff","slot":"Two-hand","req":21,"heal":52,"sp":0,"mp5":0,"int":0,"spi":12,"sta":5,"id":"db100","source":"Odo the Blindwatcher, Shadowfang Keep","faction":"Both","armor":"-"},{"name":"Tidebringer's Claw","slot":"Main hand","req":0,"heal":86,"sp":0,"mp5":0,"int":0,"spi":0,"sta":5,"id":"db101","source":"Shaman quest: The Tempest's Weapons (from 30)","faction":"Both","other":"+2% crit on Healing Wave and Lesser Healing Wave","armor":"-"},{"name":"Royal Diplomatic Scepter","slot":"Main hand","req":30,"heal":72,"sp":0,"mp5":0,"int":0,"spi":7,"sta":3,"id":"db102","source":"Dark Iron Ambassador (rare), Gnomeregan","faction":"Both","armor":"-"},{"name":"Death Speaker Scepter","slot":"Main hand","req":28,"heal":68,"sp":0,"mp5":0,"int":0,"spi":0,"sta":0,"id":"db103","source":"Death Speaker Jargba, Razorfen Kraul","faction":"Both","other":"+12 health regen","armor":"-"},{"name":"Forcestone Buckler","slot":"Off hand","req":0,"heal":18,"sp":0,"mp5":0,"int":0,"spi":8,"sta":4,"id":"db104","source":"Quest: Compendium of the Fallen (from 28)","faction":"Horde","armor":"Shield"},{"name":"Elementalist's Guard","slot":"Off hand","req":0,"heal":0,"sp":0,"mp5":2,"int":6,"spi":0,"sta":9,"id":"db105","source":"Shaman quest: The Tempest's Weapons (from 30)","faction":"Both","armor":"Shield"},{"name":"Heart of Agamaggan","slot":"Off hand","req":30,"heal":15,"sp":0,"mp5":0,"int":0,"spi":0,"sta":7,"id":"db106","source":"Charlga Razorflank, Razorfen Kraul","faction":"Both","armor":"Shield"},{"name":"Seedcloud Buckler","slot":"Off hand","req":19,"heal":0,"sp":5,"mp5":0,"int":5,"spi":0,"sta":0,"id":"db107","source":"Verdan the Everliving, Wailing Caverns","faction":"Both","armor":"Shield"},{"name":"Painwalker Buckler","slot":"Off hand","req":29,"heal":13,"sp":0,"mp5":0,"int":0,"spi":0,"sta":6,"id":"db108","source":"Interrogator Vishas, SM Graveyard","faction":"Both","other":"Proc when struck: 12 mp5 for 10 sec","armor":"Shield"},{"name":"Salve and Salvation","slot":"Off hand","req":0,"heal":9,"sp":0,"mp5":0,"int":0,"spi":9,"sta":0,"id":"db109","source":"Quest: Past Due (SM Library)","faction":"Alliance","armor":"-"},{"name":"Orb of Souls","slot":"Off hand","req":25,"heal":13,"sp":0,"mp5":0,"int":0,"spi":6,"sta":0,"id":"db110","source":"Crafted: Enchanting 140","faction":"Both","prof":"Enchanting","armor":"-"},{"name":"Geomancer Headdress","slot":"Head","req":25,"heal":13,"sp":0,"mp5":0,"int":0,"spi":14,"sta":0,"id":"db111","source":"Roogug, Razorfen Kraul","faction":"Both","armor":"Leather"},{"name":"Pristine Circlet","slot":"Head","req":20,"heal":18,"sp":0,"mp5":0,"int":0,"spi":0,"sta":10,"id":"db112","source":"Crafted: Tailoring 100","faction":"Both","prof":"Tailoring","armor":"Cloth"},{"name":"Wisdom's Leather Hood","slot":"Head","req":20,"heal":17,"sp":0,"mp5":0,"int":0,"spi":0,"sta":10,"id":"db113","source":"Crafted: Leatherworking 100","faction":"Both","prof":"Leatherworking","armor":"Leather"},{"name":"Whisperwind Headdress","slot":"Head","req":29,"heal":0,"sp":7,"mp5":0,"int":0,"spi":11,"sta":11,"id":"db114","source":"Earthcaller Halmgar, Razorfen Kraul","faction":"Both","armor":"Leather"},{"name":"Guardian's Emblem","slot":"Neck","req":28,"heal":0,"sp":6,"mp5":0,"int":0,"spi":0,"sta":8,"id":"db115","source":"Unknown","faction":"Both","armor":"-"},{"name":"Thermaplugg Medal of Honor","slot":"Neck","req":29,"heal":0,"sp":0,"mp5":0,"int":0,"spi":6,"sta":6,"id":"db116","source":"Crowd Pummeler 9-60, Gnomeregan","faction":"Both","other":"+10 attack power","armor":"-"},{"name":"Pendant of Myzrael","slot":"Neck","req":30,"heal":0,"sp":0,"mp5":0,"int":0,"spi":6,"sta":4,"id":"db117","source":"Myzrael quest chain, Arathi","faction":"Both","armor":"-"},{"name":"Glowing Green Talisman","slot":"Neck","req":25,"heal":0,"sp":0,"mp5":0,"int":0,"spi":6,"sta":1,"id":"db118","source":"World drop / auction house","faction":"Both","armor":"-"},{"name":"Invoker's Mantle","slot":"Shoulder","req":25,"heal":0,"sp":7,"mp5":0,"int":5,"spi":0,"sta":0,"id":"db119","source":"Crafted: Tailoring (bind on equip)","faction":"Both","other":"Stats from a secondary database","armor":"Cloth"},{"name":"Feline Mantle","slot":"Shoulder","req":23,"heal":0,"sp":4,"mp5":0,"int":8,"spi":0,"sta":0,"id":"db120","source":"Wolf Master Nandos, Shadowfang Keep","faction":"Both","other":"+2 Agi","armor":"Cloth"},{"name":"Heavy Woolen Cloak","slot":"Back","req":16,"heal":0,"sp":4,"mp5":0,"int":0,"spi":4,"sta":0,"id":"db121","source":"Crafted: Tailoring 80 (bind on equip)","faction":"Both","armor":"Cloth"},{"name":"Darkspear Raider's Cloak","slot":"Back","req":28,"heal":0,"sp":0,"mp5":0,"int":8,"spi":4,"sta":3,"id":"db122","source":"Darkspear Raiders vendor","faction":"Horde","other":"Needs Darkspear Raiders Honored","armor":"Cloth"},{"name":"Robes of Arugal","slot":"Chest","req":23,"heal":18,"sp":0,"mp5":0,"int":0,"spi":6,"sta":5,"id":"db123","source":"Archmage Arugal, Shadowfang Keep","faction":"Both","armor":"Cloth"},{"name":"Wisdom's Leather Armor","slot":"Chest","req":15,"heal":15,"sp":0,"mp5":0,"int":5,"spi":3,"sta":3,"id":"db124","source":"Crafted: Leatherworking 80","faction":"Both","prof":"Leatherworking","armor":"Leather"},{"name":"Ceremonial Gown","slot":"Chest","req":0,"heal":0,"sp":13,"mp5":0,"int":11,"spi":0,"sta":0,"id":"db125","source":"Unknown","faction":"Both","armor":"Cloth"},{"name":"Witherbite Bracers","slot":"Wrist","req":15,"heal":0,"sp":5,"mp5":0,"int":0,"spi":0,"sta":0,"id":"db126","source":"Witherfang, Ruins of Lordaeron","faction":"Both","other":"+4 Agi","armor":"Leather"},{"name":"Tattered Mittens","slot":"Hands","req":0,"heal":9,"sp":0,"mp5":0,"int":0,"spi":0,"sta":6,"id":"db127","source":"Quest: The Book of Ur (Undercity)","faction":"Horde","armor":"Cloth"},{"name":"Gloves of Meditation","slot":"Hands","req":21,"heal":0,"sp":5,"mp5":0,"int":0,"spi":7,"sta":0,"id":"db128","source":"Crafted: Tailoring 105 (bind on equip)","faction":"Both","armor":"Cloth"},{"name":"Jutebraid Gloves","slot":"Hands","req":0,"heal":0,"sp":6,"mp5":0,"int":5,"spi":0,"sta":0,"id":"db129","source":"Quest: Horde Presence","faction":"Horde","armor":"Cloth"},{"name":"Defiler's Cloth Girdle","slot":"Waist","req":28,"heal":0,"sp":11,"mp5":0,"int":3,"spi":0,"sta":4,"id":"db130","source":"Defilers vendor (Arathi Basin)","faction":"Horde","other":"Needs Defilers Honored","armor":"Cloth"},{"name":"Wisdom's Leather Belt","slot":"Waist","req":12,"heal":8,"sp":0,"mp5":0,"int":4,"spi":0,"sta":3,"id":"db131","source":"Crafted: Leatherworking 60","faction":"Both","prof":"Leatherworking","armor":"Leather"},{"name":"Daewyn's Girdle","slot":"Waist","req":0,"heal":0,"sp":7,"mp5":0,"int":0,"spi":6,"sta":0,"id":"db132","source":"Quest: Fallen in the Fen (Excavation Site)","faction":"Alliance","armor":"Cloth"},{"name":"Earthen Leggings","slot":"Legs","req":30,"heal":15,"sp":0,"mp5":0,"int":0,"spi":11,"sta":0,"id":"db133","source":"Crafted: Tailoring 140 (bind on equip)","faction":"Both","armor":"Cloth"},{"name":"Ogre Loincloth","slot":"Legs","req":17,"heal":18,"sp":0,"mp5":0,"int":0,"spi":0,"sta":6,"id":"db134","source":"Rhahk'Zor, The Deadmines","faction":"Both","other":"+4 Str","armor":"Cloth"},{"name":"Kodohide Legguards","slot":"Legs","req":24,"heal":0,"sp":10,"mp5":0,"int":11,"spi":0,"sta":0,"id":"db135","source":"Brontus (rare), The Barrens","faction":"Both","other":"+4 Str","armor":"Leather"},{"name":"Stormrider's Leather Pants","slot":"Legs","req":20,"heal":0,"sp":10,"mp5":0,"int":6,"spi":4,"sta":4,"id":"db136","source":"Crafted: Leatherworking 105","faction":"Both","prof":"Leatherworking","armor":"Leather"},{"name":"Roused Nature Footwraps","slot":"Feet","req":27,"heal":13,"sp":0,"mp5":0,"int":0,"spi":9,"sta":6,"id":"db137","source":"Unknown (bind on equip)","faction":"Both","armor":"Leather"},{"name":"Black Whelp Slippers","slot":"Feet","req":10,"heal":9,"sp":0,"mp5":0,"int":4,"spi":0,"sta":0,"id":"db138","source":"Crafted: Leatherworking 35","faction":"Both","prof":"Leatherworking","armor":"Leather"},{"name":"Wingborne Boots","slot":"Feet","req":0,"heal":0,"sp":6,"mp5":0,"int":0,"spi":10,"sta":0,"id":"db139","source":"Quest: Malin's Request","faction":"Alliance","armor":"Cloth"},{"name":"Pristine Boots","slot":"Feet","req":12,"heal":9,"sp":0,"mp5":0,"int":3,"spi":0,"sta":4,"id":"db140","source":"Crafted: Tailoring 60","faction":"Both","prof":"Tailoring","armor":"Cloth"},{"name":"Reedknot Ring","slot":"Finger","req":0,"heal":0,"sp":7,"mp5":0,"int":0,"spi":0,"sta":3,"id":"db141","source":"Quest: Jarl Needs a Blade (from 30)","faction":"Both","armor":"-"},{"name":"Sacristan Band","slot":"Finger","req":0,"heal":6,"sp":0,"mp5":0,"int":0,"spi":0,"sta":7,"id":"db142","source":"Unknown","faction":"Both","armor":"-"},{"name":"Dog Whistle","slot":"Trinket","req":25,"heal":0,"sp":0,"mp5":0,"int":0,"spi":0,"sta":0,"id":"db143","source":"Houndmaster Loksey, SM Library","faction":"Both","other":"Use: summon a hound","armor":"-"},{"name":"Transformative Cocoon","slot":"Trinket","req":0,"heal":0,"sp":0,"mp5":0,"int":0,"spi":0,"sta":0,"id":"db144","source":"Quest: The Broodmother (Mulgore)","faction":"Horde","other":"Use: absorb shield then speed boost","armor":"-"},{"name":"Bottle of Powderfuse Port","slot":"Main hand","req":0,"heal":63,"sp":0,"mp5":0,"int":7,"spi":0,"sta":0,"id":"db145","source":"Unknown","faction":"Both","armor":"-"},{"name":"Lightning's Grasp","slot":"Main hand","req":0,"heal":0,"sp":46,"mp5":0,"int":6,"spi":0,"sta":0,"id":"db146","source":"Shaman quest: The Tempest's Weapons (from 30)","faction":"Both","other":"+1% Lightning Bolt crit","armor":"-"},{"name":"Eye of Paleth","slot":"Off hand","req":0,"heal":13,"sp":0,"mp5":0,"int":0,"spi":0,"sta":0,"id":"db147","source":"Quest: Cleansing the Eye","faction":"Alliance","armor":"-"},{"name":"Alliance Outrunner Healing Rod","slot":"Off hand","req":21,"heal":12,"sp":0,"mp5":0,"int":0,"spi":0,"sta":0,"id":"db148","source":"Aean Swiftriver (rare), The Barrens","faction":"Both","other":"+8 health regen","armor":"-"},{"name":"Orb of Mistmantle","slot":"Off hand","req":23,"heal":9,"sp":0,"mp5":0,"int":0,"spi":4,"sta":0,"id":"db149","source":"World drop / auction house","faction":"Both","armor":"-"},{"name":"Omega Orb","slot":"Off hand","req":0,"heal":0,"sp":9,"mp5":3,"int":0,"spi":0,"sta":0,"id":"db150","source":"Quest: Compendium of the Fallen (from 28)","faction":"Horde","armor":"-"},{"name":"Raptor's Gaze","slot":"Off hand","req":26,"heal":0,"sp":8,"mp5":0,"int":4,"spi":0,"sta":4,"id":"db151","source":"Shadetooth, Excavation Site: Wetlands","faction":"Both","armor":"-"},{"name":"Staff of the Friar","slot":"Two-hand","req":21,"heal":52,"sp":0,"mp5":0,"int":3,"spi":12,"sta":4,"id":"db152","source":"Blackfathom Deeps trash","faction":"Both","other":"Very rare drop","armor":"-"},{"name":"Defiler's Talisman","slot":"Trinket","req":28,"heal":0,"sp":0,"mp5":0,"int":0,"spi":0,"sta":6,"id":"db153","source":"Defilers vendor (Arathi Basin)","faction":"Horde","other":"Use: absorb about 300 physical damage (3 min); needs Defilers Friendly","armor":"-"},{"name":"Satchel of Potions","slot":"Trinket","req":0,"heal":0,"sp":0,"mp5":0,"int":0,"spi":0,"sta":0,"id":"db154","source":"Quest: Changing Tastes (Excavation Site)","faction":"Horde","other":"Use: random potion","armor":"-"}];
  var SCEN = {trash:{t:90,f:70}, boss:{t:120,f:90}, raid:{t:300,f:100}};
  var DEFAULTS = {level:30, pool:2223, heal:200, spi:107, g:10, buff:0, talent:true, pct:50, icon:false, imphw:true,
    smodel:"line", sA:114.0, sB:2666, sbase:30.5, sper:0.626, t:120, f:90, w:70, stw:0, spell:"hw5", edits:{},
    faction:"Horde", maxlvl:0, profs:{}, showAll:false, ws:true, crit:5};
  var KEY = "tidecaller-weights-v1";

  var state = JSON.parse(JSON.stringify(DEFAULTS));
  var items = [];
  try{
    var saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if(saved && saved.state){
      state = Object.assign(state, saved.state);
      var oldDefault = (state.sbase === 37.5 && state.sper === 0.5) || (state.sbase === 32.4 && state.sper === 0.6) ||
        (state.sA === 105.5 && state.sB === 2223) || (state.sA === 107.9 && state.sB === 2347);
      if(oldDefault){ ["smodel","sA","sB","sbase","sper"].forEach(function(k){ state[k] = DEFAULTS[k]; }); }
    }
    if(saved && Array.isArray(saved.items)){ items = saved.items.filter(function(i){ return String(i.id).charAt(0) === "u"; }).map(function(i){ return Object.assign({faction:"Both", req:0, source:"Added by you"}, i, {custom:true}); }); }
  }catch(e){}
  function save(){ try{ localStorage.setItem(KEY, JSON.stringify({state:state, items:items})); }catch(e){} }

  function $(id){ return document.getElementById(id); }
  function num(v, d){ var n = parseFloat(v); return isFinite(n) ? n : d; }
  function clamp(x,a,b){ return Math.max(a, Math.min(b, x)); }
  function fmt(x, d){ if(!isFinite(x)) return "–"; return x.toLocaleString("en-US",{minimumFractionDigits:d, maximumFractionDigits:d}); }

  function spellOf(id){
    var base = SPELLS.filter(function(s){ return s.id === id; })[0] || SPELLS[4];
    var ed = state.edits[base.id] || {};
    return Object.assign({}, base, {base:num(ed.base, base.base), cost:num(ed.cost, base.cost), cast:num(ed.cast, base.cast), edited:!!state.edits[base.id]});
  }
  function spiritRegen(spi){
    var s = Math.max(spi, 1);
    return state.smodel === "line" ? Math.max(0, state.sbase + state.sper * s) : Math.max(0, state.sA - state.sB / s);
  }
  function spiritMarginal(spi){
    var s = Math.max(spi, 1);
    return state.smodel === "line" ? state.sper : state.sB / (s * s);
  }
  function lsq(xs, ys){
    var n = xs.length, mx = 0, my = 0, i;
    for(i = 0; i < n; i++){ mx += xs[i]; my += ys[i]; }
    mx /= n; my /= n;
    var sxx = 0, sxy = 0;
    for(i = 0; i < n; i++){ sxx += (xs[i]-mx)*(xs[i]-mx); sxy += (xs[i]-mx)*(ys[i]-my); }
    var b = sxy / sxx, a = my - b * mx, worst = 0;
    for(i = 0; i < n; i++){ worst = Math.max(worst, Math.abs(ys[i] - (a + b * xs[i]))); }
    return {a:a, b:b, worst:worst};
  }
  function shareKept(L, T){ return clamp(1 - (L - 17 - T) * 0.05, 0, 1); }
  function spellCalc(sp){
    var L = state.level, H = state.heal;
    var coef = Math.min(sp.cast, 3.5) / 3.5;
    var share = shareKept(L, sp.lvl);
    var ce = coef * share;
    var heal = sp.base + ce * H;
    var ct = sp.cast - ((state.imphw && sp.id.indexOf("hw") === 0) ? 0.5 : 0);
    var eff = Math.max(ct, 1.5);
    return {coef:coef, share:share, ce:ce, heal:heal, hpm:heal/sp.cost, hps:heal/eff};
  }

  function compute(){
    var m = state.talent ? clamp(state.pct, 0, 100) / 100 : 0;
    if(state.icon) m += 0.08;
    m = Math.min(m, 1);
    var f = state.f / 100;
    var k = 1 - f * (1 - m);
    var sFull = spiritRegen(state.spi);
    var flat = state.g + state.buff;
    var fullMP5 = flat + sFull, castMP5 = flat + sFull * m, avgMP5 = flat + sFull * k;
    var T = Math.max(1, state.t);
    var E = state.pool + avgMP5 / 5 * T;
    var sp = spellOf(state.spell), c = spellCalc(sp);
    var X = c.ce > 0 ? (T/5) * c.heal / (E * c.ce) : NaN;
    var wf = state.w / 100;
    var spiInMP5 = spiritMarginal(state.spi) * k;
    var intInMP5 = 75 / T;
    var pc = clamp(state.crit, 0, 100) / 100;
    var wsBack = state.ws ? pc * 0.02 * state.pool : 0;
    var cEff = Math.max(1, sp.cost - wsBack);
    var intWS = (state.ws && c.ce > 0) ? c.heal * pc * 0.3 / (c.ce * cEff) : 0;
    var intRaw = intInMP5 * X + intWS;
    return {m:m, k:k, sFull:sFull, fullMP5:fullMP5, castMP5:castMP5, avgMP5:avgMP5, E:E, sp:sp, c:c, X:X, wf:wf, spiInMP5:spiInMP5, intInMP5:intInMP5,
      weights:{heal:1, sp:1, mp5:wf*X, int:wf*intRaw, spi:wf*spiInMP5*X, sta:state.stw},
      raw:{mp5:X, int:intRaw, spi:spiInMP5*X},
      wsBack:wsBack, intWS:intWS, casts:E/cEff};
  }

  var LABELS = {mp5:"MP5", int:"Intellect", spi:"Spirit", heal:"Healing", sp:"Spell Power", sta:"Stamina"};
  function render(){
    var r = compute();
    // inputs
    document.querySelectorAll("[data-k]").forEach(function(el){
      var k = el.getAttribute("data-k");
      if(el.type === "checkbox"){ el.checked = !!state[k]; }
      else if(document.activeElement !== el){ el.value = state[k]; }
    });
    $("pct").disabled = !state.talent;
    $("crit").disabled = !state.ws;
    $("smodel").value = state.smodel;
    var isLine = state.smodel === "line";
    $("sA").disabled = isLine; $("sB").disabled = isLine; $("sbase").disabled = !isLine; $("sper").disabled = !isLine;
    $("fOut").textContent = state.f + "%";
    $("wOut").textContent = state.w + "%";
    document.querySelectorAll("[data-scen]").forEach(function(b){
      var s = SCEN[b.getAttribute("data-scen")];
      b.setAttribute("aria-pressed", String(s.t === state.t && s.f === state.f));
    });

    // weights
    var W = r.weights;
    var order = ["mp5","int","spi","heal","sp","sta"].filter(function(k){ return k !== "sta" || W.sta > 0; });
    var sorted = order.slice().sort(function(a,b){ return W[b] - W[a]; });
    var parts = [];
    sorted.forEach(function(k, i){
      if(i > 0){
        var prev = W[sorted[i-1]];
        var eq = Math.abs(prev - W[k]) <= Math.max(0.03, prev * 0.03);
        parts.push('<span class="op">' + (eq ? "=" : ">") + "</span>");
      }
      parts.push(LABELS[k]);
    });
    $("verdict").innerHTML = isFinite(r.X) ? parts.join("") : "No healing power bonus on this rank";
    var mana = r.wf > 0;
    $("regime").textContent = !isFinite(r.X) ? "Pick a rank that still keeps some of its gear bonus." :
      mana ? ("Mana-bound value scaled by " + state.w + "%. If you never ran out, mana stats would be worth 0; if you always did, MP5 would be " + fmt(r.raw.mp5,2) + ".")
           : "You set mana as never running out, so only Healing and Spell Power count.";
    $("wnote").textContent = "1 Healing = 1.00";
    var max = Math.max.apply(null, order.map(function(k){ return isFinite(W[k]) ? W[k] : 0; })) || 1;
    var sub = {mp5:"gear and buffs", int:state.ws ? "pool and Water Shield" : "15 mana each", spi:"regen", heal:"heals only", sp:"heals and damage", sta:"your setting"};
    $("bars").innerHTML = order.map(function(k){
      var v = isFinite(W[k]) ? W[k] : 0;
      var cls = (k === "heal" || k === "sp") ? "heal" : (k === "sta" ? "stam" : "mana");
      return '<div class="bar"><div class="n">' + LABELS[k] + '<small>' + sub[k] + '</small></div>' +
        '<div class="track"><div class="fill ' + cls + '" style="width:' + (v/max*100).toFixed(1) + '%"></div></div>' +
        '<div class="v">' + fmt(v,2) + '</div></div>';
    }).join("");
    $("conv").innerHTML = [
      ["Next 1 Spirit", fmt(r.spiInMP5,2), "MP5 in this fight"],
      ["1 Intellect", fmt(r.intInMP5,2), "MP5 in this fight"],
      ["Regen not casting", fmt(r.fullMP5,1), "MP5"],
      ["Regen casting", fmt(r.castMP5,1), "MP5"],
      ["Average regen", fmt(r.avgMP5,1), "MP5"],
      ["Mana for the fight", fmt(r.E,0), fmt(r.casts,1) + " casts"],
      ["Water Shield", fmt(r.wsBack,1), "mana back per cast"]
    ].map(function(a){ return '<div class="kv"><div class="k">' + a[0] + '</div><div class="v">' + a[1] + ' <small>' + a[2] + '</small></div></div>'; }).join("");

    // rank table
    var known = SPELLS.filter(function(s){ return s.lvl <= state.level; });
    if(!known.some(function(s){ return s.id === state.spell; })){
      var hw = known.filter(function(s){ return s.id.indexOf("hw") === 0; });
      state.spell = (hw[hw.length-1] || SPELLS[0]).id;
      return render();
    }
    var rows = known.map(function(s){ var sp = spellOf(s.id); return {sp:sp, c:spellCalc(sp)}; });
    var bestHpm = Math.max.apply(null, rows.map(function(x){ return x.c.hpm; }));
    $("ranks").querySelector("tbody").innerHTML = rows.map(function(x){
      var s = x.sp, sel = s.id === state.spell;
      var tags = (x.c.hpm === bestHpm ? '<span class="tag">Best per mana</span>' : "") + ((s.warn && !s.edited) ? '<span class="tag warn">Check</span>' : "") + (s.edited ? '<span class="tag mana">Edited</span>' : "");
      return '<tr class="click' + (sel ? " sel" : "") + '" data-spell="' + s.id + '" tabindex="0" aria-selected="' + sel + '">' +
        '<td class="nm">' + (s.id.indexOf("lhw") === 0 ? "Lesser HW " : "Healing Wave ") + s.rank + tags + '</td>' +
        '<td>' + s.lvl + '</td><td>' + Math.round(x.c.share*100) + '%</td><td>' + fmt(x.c.heal,0) + '</td><td>' + s.cost + '</td>' +
        '<td>' + fmt(x.c.hpm,2) + '</td><td>' + fmt(x.c.hps,0) + '</td></tr>';
    }).join("");
    var cur = spellOf(state.spell);
    if(document.activeElement !== $("eb")) $("eb").value = cur.base;
    if(document.activeElement !== $("ec")) $("ec").value = cur.cost;
    if(document.activeElement !== $("et")) $("et").value = cur.cast;
    $("esrc").textContent = (cur.id.indexOf("lhw") === 0 ? "Lesser Healing Wave " : "Healing Wave ") + cur.rank + ": " + SPELLS.filter(function(s){return s.id===cur.id;})[0].src;

    if(typeof syncFilters === "function") syncFilters();
    renderItems(W);
    renderCal();
    save();
  }

  function score(it, W){
    return (it.heal||0)*W.heal + (it.sp||0)*W.sp + (it.mp5||0)*(isFinite(W.mp5)?W.mp5:0) + (it.int||0)*(isFinite(W.int)?W.int:0) + (it.spi||0)*(isFinite(W.spi)?W.spi:0) + (it.sta||0)*W.sta;
  }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
  function allItems(){ return DB.concat(items); }
  function maxLevel(){ return state.maxlvl > 0 ? state.maxlvl : state.level; }
  function whyNot(i){
    if(i.faction && i.faction !== "Both" && i.faction !== state.faction) return i.faction + " only";
    if((i.req || 0) > maxLevel()) return "Needs level " + i.req;
    if(i.prof && !state.profs[i.prof]) return "Needs " + i.prof;
    return "";
  }
  function srcCell(i){
    var bits = [esc(i.source || "")];
    if(i.prof) bits.push(esc(i.prof) + ", maker only" + (i.prof === "Engineering" ? " to use" : ""));
    if(i.other) bits.push(esc(i.other));
    if(i.faction && i.faction !== "Both") bits.push(esc(i.faction));
    return bits.filter(Boolean).join(" · ");
  }
  function renderItems(W){
    var all = allItems().map(function(i){ return {i:i, s:score(i,W), why:whyNot(i)}; });
    var ok = all.filter(function(x){ return !x.why; });
    // best set
    var pick = {};
    SLOTS.forEach(function(slot){
      pick[slot] = ok.filter(function(x){ return x.i.slot === slot; }).sort(function(a,b){ return b.s - a.s; });
    });
    var rows = [], total = 0, weaponNote = "";
    var mh = pick["Main hand"][0], oh = pick["Off hand"][0], th = pick["Two-hand"][0];
    var pair = (mh ? mh.s : 0) + (oh ? oh.s : 0), two = th ? th.s : -1;
    var useTwo = two > pair;
    weaponNote = th && (mh || oh) ? (useTwo ? "Two-hander beats the best main hand and off hand by " + fmt(two - pair,1) : "Main hand and off hand beat the best two-hander by " + fmt(pair - two,1)) : "";
    var order = ["Head","Neck","Shoulder","Back","Chest","Wrist","Hands","Waist","Legs","Feet","Finger","Finger","Trinket","Trinket"].concat(useTwo ? ["Two-hand"] : ["Main hand","Off hand"]);
    var used = {};
    order.forEach(function(slot){
      var x = pick[slot].filter(function(c){ return !used[c.i.name]; })[0];
      if(x){ used[x.i.name] = true; total += x.s; }
      rows.push('<tr><td class="nm">' + slot + '</td><td>' + (x ? esc(x.i.name) : '<span class="dim">Nothing usable listed</span>') + '</td><td class="score">' + (x ? fmt(x.s,1) : "") + '</td><td class="src">' + (x ? srcCell(x.i) : "") + '</td></tr>');
    });
    $("bestTable").querySelector("tbody").innerHTML = rows.join("");
    $("bestTotal").textContent = fmt(total,1);
    $("bestWeapon").textContent = weaponNote;

    // every candidate
    var html = "";
    var cell = function(v){ return v ? fmt(v,0) : '<span class="dim">·</span>'; };
    SLOTS.forEach(function(slot){
      var list = all.filter(function(x){ return x.i.slot === slot && (state.showAll || !x.why); });
      if(!list.length) return;
      list.sort(function(a,b){ return (a.why ? 1 : 0) - (b.why ? 1 : 0) || b.s - a.s; });
      html += '<tr class="slotgrp"><td class="slot" colspan="11">' + slot + '</td></tr>';
      list.forEach(function(x, idx){
        var i = x.i, top = idx === 0 && !x.why;
        html += '<tr class="' + (top ? "best" : "") + (x.why ? " cant" : "") + '"><td class="nm">' + esc(i.name) + (top ? '<span class="tag">Top</span>' : "") + (i.custom ? '<span class="tag mana">Yours</span>' : "") + '</td>' +
          '<td>' + (i.req ? i.req : '<span class="dim">·</span>') + '</td><td>' + cell(i.heal) + '</td><td>' + cell(i.sp) + '</td><td>' + cell(i.mp5) + '</td><td>' + cell(i.int) + '</td><td>' + cell(i.spi) + '</td><td>' + cell(i.sta) + '</td>' +
          '<td class="score">' + fmt(x.s,1) + '</td><td class="src">' + (x.why ? '<span class="why">' + esc(x.why) + '</span> · ' : "") + srcCell(i) + '</td>' +
          '<td>' + (i.custom ? '<button class="x" type="button" data-del="' + esc(i.id) + '" aria-label="Remove ' + esc(i.name) + '">Remove</button>' : "") + '</td></tr>';
      });
    });
    $("itemTable").querySelector("tbody").innerHTML = html || '<tr><td colspan="11" class="nm dim">Nothing usable with these filters.</td></tr>';
    $("dbnote").textContent = DB.length + " candidates from seven Resto Shaman BiS lists, with Forever beta stats (build 1.60.1). The best set picks the highest score in each slot from gear you can use, with two rings and two trinkets, and checks a two-hander against main hand plus off hand.";
  }

  function renderCal(){
    var S = [], M = [];
    $("readings").value.split(/\n/).forEach(function(line){
      var p = line.trim().split(/[\s,;]+/);
      var s = num(p[0], NaN), m = num(p[1], NaN);
      if(isFinite(s) && isFinite(m) && s > 0){ S.push(s); M.push(m); }
    });
    var n3 = num($("c3n").value, NaN), c3 = num($("c3c").value, NaN);
    var flat = state.g;
    var distinct = S.filter(function(v, i){ return S.indexOf(v) === i; }).length;
    var okRate = distinct >= 2;
    var okShare = isFinite(n3) && isFinite(c3) && (n3 - flat) > 0;
    var msg = [];
    if(okRate){
      var line = lsq(S, M);
      var curve = lsq(S.map(function(s){ return 1/s; }), M);
      msg.push("Levels off: cap <b>" + fmt(curve.a,1) + "</b>, B <b>" + fmt(-curve.b,0) + "</b>, worst miss " + fmt(curve.worst,1) + " MP5.");
      msg.push("Straight line: base <b>" + fmt(line.a,1) + "</b>, <b>" + fmt(line.b,2) + "</b> per Spirit, worst miss " + fmt(line.worst,1) + " MP5.");
      msg.push("The tooltip rounds to whole numbers, so a worst miss under 1 fits.");
      $("calCurve").dataset.a = curve.a; $("calCurve").dataset.b = -curve.b;
      $("calLine").dataset.a = line.a; $("calLine").dataset.b = line.b;
    } else {
      msg.push("Enter at least two readings at different Spirit values.");
    }
    if(okShare){
      var share = (c3 - flat) / (n3 - flat);
      msg.push("Casting keeps <b>" + fmt(share*100,0) + "%</b> of Spirit regen.");
      $("calShare").dataset.share = share;
    }
    $("calCurve").disabled = !okRate; $("calLine").disabled = !okRate; $("calShare").disabled = !okShare;
    $("calres").innerHTML = msg.join(" ");
  }

  // events
  document.addEventListener("input", function(e){
    var el = e.target, k = el.getAttribute && el.getAttribute("data-k");
    if(k){
      if(el.type === "checkbox") state[k] = el.checked;
      else { var v = num(el.value, NaN); if(isFinite(v)) state[k] = v; else return; }
      if(k === "level") state.level = clamp(Math.round(state.level), 1, 60);
      render(); return;
    }
    if(["readings","c3n","c3c"].indexOf(el.id) >= 0){ renderCal(); return; }
    if(["eb","ec","et"].indexOf(el.id) >= 0){
      var v2 = num(el.value, NaN); if(!isFinite(v2) || v2 <= 0) return;
      var key = {eb:"base", ec:"cost", et:"cast"}[el.id];
      state.edits[state.spell] = Object.assign({}, state.edits[state.spell] || {});
      state.edits[state.spell][key] = v2;
      render();
    }
  });
  document.addEventListener("change", function(e){
    var el = e.target, k = el.getAttribute && el.getAttribute("data-k");
    if(k && el.type === "checkbox"){ state[k] = el.checked; render(); }
    if(el.id === "smodel"){ state.smodel = el.value; render(); }
  });
  document.querySelectorAll("[data-scen]").forEach(function(b){
    b.addEventListener("click", function(){ var s = SCEN[b.getAttribute("data-scen")]; state.t = s.t; state.f = s.f; render(); });
  });
  $("ranks").addEventListener("click", function(e){
    var tr = e.target.closest("tr[data-spell]"); if(!tr) return;
    state.spell = tr.getAttribute("data-spell"); render();
  });
  $("ranks").addEventListener("keydown", function(e){
    if(e.key !== "Enter" && e.key !== " ") return;
    var tr = e.target.closest("tr[data-spell]"); if(!tr) return;
    e.preventDefault(); state.spell = tr.getAttribute("data-spell"); render();
    var again = $("ranks").querySelector('tr[data-spell="' + state.spell + '"]'); if(again) again.focus();
  });
  $("eReset").addEventListener("click", function(){ delete state.edits[state.spell]; render(); });
  $("calCurve").addEventListener("click", function(){
    state.smodel = "curve";
    state.sA = Math.round(num(this.dataset.a, state.sA) * 10) / 10;
    state.sB = Math.round(num(this.dataset.b, state.sB));
    render();
  });
  $("calLine").addEventListener("click", function(){
    state.smodel = "line";
    state.sbase = Math.round(num(this.dataset.a, state.sbase) * 10) / 10;
    state.sper = Math.round(num(this.dataset.b, state.sper) * 1000) / 1000;
    render();
  });
  $("calShare").addEventListener("click", function(){
    var s = num(this.dataset.share, NaN); if(!isFinite(s)) return;
    state.talent = true; state.icon = false; state.pct = Math.round(clamp(s,0,1) * 100);
    render();
  });
  $("calReset").addEventListener("click", function(){
    ["smodel","sA","sB","sbase","sper"].forEach(function(k){ state[k] = DEFAULTS[k]; });
    render();
  });

  var slotSel = $("a-slot");
  slotSel.innerHTML = SLOTS.map(function(s){ return '<option>' + s + '</option>'; }).join("");
  $("addForm").addEventListener("submit", function(e){
    e.preventDefault();
    var name = $("a-name").value.trim(); if(!name) return;
    var it = {id:"u" + Date.now(), name:name, slot:slotSel.value, custom:true, faction:"Both", req:0, source:"Added by you"};
    [["heal","a-heal"],["sp","a-sp"],["mp5","a-mp5"],["int","a-int"],["spi","a-spi"],["sta","a-sta"]].forEach(function(p){ it[p[0]] = num($(p[1]).value, 0); });
    items.push(it);
    ["a-name","a-heal","a-sp","a-mp5","a-int","a-spi","a-sta"].forEach(function(id){ $(id).value = ""; });
    $("a-name").focus();
    render();
  });
  $("itemTable").addEventListener("click", function(e){
    var b = e.target.closest("[data-del]"); if(!b) return;
    var id = b.getAttribute("data-del");
    items = items.filter(function(i){ return i.id !== id; });
    render();
  });
  $("faction").addEventListener("change", function(){ state.faction = this.value; render(); });
  $("maxlvl").addEventListener("input", function(){ var v = num(this.value, 0); state.maxlvl = v > 0 ? clamp(Math.round(v),1,60) : 0; render(); });
  document.querySelectorAll("[data-prof]").forEach(function(cb){
    cb.addEventListener("change", function(){ state.profs[cb.getAttribute("data-prof")] = cb.checked; render(); });
  });
  $("showAll").addEventListener("change", function(){ state.showAll = this.checked; render(); });
  function syncFilters(){
    $("faction").value = state.faction;
    if(document.activeElement !== $("maxlvl")) $("maxlvl").value = maxLevel();
    document.querySelectorAll("[data-prof]").forEach(function(cb){ cb.checked = !!state.profs[cb.getAttribute("data-prof")]; });
    $("showAll").checked = !!state.showAll;
  }

  render();
})();
</script>
```

## 14. Owner rulings after the first build (18 Oct 2026)

These supersede sections 4, 5 and 7 where they differ. Everything else in this spec stands.

### 14.1 One level for the character and the gear

Tom: *"the level that you put at the top for your character should be the same level for gear."*
The separate "Usable up to level" filter (`maxlvl`) is removed. An item is usable when its `req`
is at most the character's Level. A saved `maxlvl` is ignored.

### 14.2 Max mana is worked out from level and Intellect, and stays editable

Tom: *"your mana is way off, I think I only have 900 and some ... looking online they should be
highly documented for what the naked and gear based mana is."* Ruled 18 Oct: calculated, but
editable.

- Max mana = base mana for the level + mana from Intellect.
- Mana from Intellect: the first 20 points give 1 mana each and every point after gives 15, so
  `min(20, Int) + 15 * max(0, Int - 20)`. Section 3's "15 mana per point" is the rate above 20.
- Base mana depends on class and level only, never race. The Shaman values documented for
  Classic (Wowpedia and the Vanilla WoW Archive, "Base mana", vanilla table):

| Level | 1 | 7 | 10 | 14 | 15 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 60 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Base mana | 55 | 121 | 175 | 241 | 260 | 370 | 395 | 421 | 448 | 476 | 505 | 535 | 566 | 598 | 631 | 665 | 1520 |

- A level between documented ones is interpolated linearly between its neighbours and rounded,
  and is shown as estimated (for example level 18 reads 326, estimated).
- **Checked at levels 24 and 25** (section 14.4): a naked level 24 Forever Shaman matches exactly,
  and the mana gained at level 25 matches the step from 476 to 505. Other levels are Classic's
  documented values, not yet checked in Forever. A player
  can check their own sheet: max mana minus mana from Intellect is their base mana.
- New input **Intellect** (the total on the character sheet), default **115**: a fully geared
  level 30 (the default best set carries 75 Intellect, plus the character's own). Owner's choice,
  18 Oct.
- Max mana shows the calculated value with its breakdown. Typing a number overrides it, and "Use
  calculated" returns to the calculation. New state keys: `int` (default 115) and `manaAuto`
  (default true); `pool` holds a typed value and is used only while `manaAuto` is false.
- Migration: a saved state without `manaAuto` keeps a typed pool (`manaAuto` false) unless that
  pool is the old default 2223, which becomes calculated (`manaAuto` true).

### 14.3 The defaults' numbers

At the defaults (level 30, Intellect 115, so max mana 665 + 20 + 1,425 = **2,110**, everything else
as section 4), Horde, no professions:

| Preset | E | X (raw MP5) | MP5 | Int | Spirit | Water Shield per cast | Casts | Horde best set total |
|---|---|---|---|---|---|---|---|---|
| Trash pull (90 s, 70%) | 3430.5 | 3.226 | 2.258 | 1.914 | 0.919 | 2.110 | 17.34 | 431.74 |
| Dungeon boss (120 s, 90%) | 3636.8 | 4.057 | 2.840 | 1.808 | 0.978 | 2.110 | 18.38 | 428.41 |
| Raid boss (300 s, 100%) | 5634.5 | 6.546 | 4.582 | 1.178 | 1.434 | 2.110 | 28.47 | 439.22 |

h is unchanged at 526.929. The Dungeon boss priority line reads "MP5 > Intellect > Healing = Spell
Power = Spirit" (Spirit 0.978 is within 0.03 of Healing).

Best set at Dungeon boss defaults (scores to 2 places): Holy Shroud 38.87, Scorn's Icy Choker
17.85, Death Speaker Mantle 25.88, Darkspear Raider's Cloak 18.37, Death Speaker Robes 39.88,
Mindthrust Bracers 17.56, Gloves of Old 20.77, Blightleaf Rope 25.08, Violet Sorcerer's Leggings
40.39, Acidic Walkers 23.37, Philanthropist's Ring 19.04, Sea Giant's Toe Ring 18.00, Roogug's
Severed Head 5.87, Worgenbane Talisman 5.68, Tidebringer's Claw 86.00, Forcestone Buckler 25.82.
Main hand + off hand 111.82 beats the best two-hander (Wind Spirit Staff) 85.64. Total 428.41.
Alliance total 429.74.

Section 7's numbers still hold for the original character (max mana typed in as 2223, so
`manaAuto` false) and stay pinned as the check of the math.

### 14.4 Owner readings: Tom's Orc Shaman with no gear (18 Oct 2026)

| Level | Health | Mana | Strength | Agility | Stamina | Intellect | Spirit |
|---|---|---|---|---|---|---|---|
| 22 | (not shown) | (not shown) | 42 | 26 | 42 | 38 | 43 |
| 24 | 494 | **796** | 44 | 27 | 44 | 40 | 46 |

**Level 24 confirms the mana model in Forever:** 476 base (the documented Classic value) + 20 + 15 x
20 = 796, exactly what the client shows. The level 22 Spirit of 43 is the "no bonus Spirit" reading
in section 3. At level 22 the model predicts a naked max mana of 421 + 20 + 15 x 18 = 711.

**Level 25, 19 Oct 2026** (Tom's level-up message): "You have gained 26 hit points and 44 mana ...
Your Strength increases by 1. Your Stamina increases by 2. Your Intellect increases by 1. Your
Spirit increases by 1." The 44 mana is the base mana step from level 24 to 25 (476 to 505, +29)
plus 15 for the one point of Intellect (above 20, section 14.2), so base mana at level 25 is
confirmed too. Naked at 25 that makes Strength 45, Agility 27, Stamina 46, Intellect 41, Spirit 47.

### 14.5 Wowhead item IDs and icons (links and art only)

Tom, 18 Oct 2026: *"i also need every item link in the game to use wowhead or another popup library"*,
then *"you should also be able to get item art for icons for the tables both on the home page and on
the items page from wowhead as well"*.

The site shows its own item popups, built from section 12, so every number a visitor sees still
comes from this spec. Wowhead is used for two things only:

- a "View on Wowhead" link on each item's page, to `https://www.wowhead.com/forever/item=<id>`;
- the item's icon, shown beside its name. The site serves its own copy of each 56 px icon at
  `/icons/<icon>.jpg`, downloaded once from `https://wow.zamimg.com/images/wow/icons/large/<icon>.jpg`
  by `scripts/wowhead-icons.mjs`. An item with no entry here shows Wowhead's question-mark icon
  (`inv_misc_questionmark`).

Wowhead's stats and quality are never shown or used. Item level and armor are cached in
section 14.6 (Tom's ruling of 19 Oct 2026).

**How the list was made (18 Oct 2026).** IDs were first found through Wowhead search results, then
every one was checked against Wowhead's Forever tooltip data (`nether.wowhead.com`, `dataEnv=16`,
the environment that also holds Forever-only items such as Tidebringer's Claw 280605). All 141
names match this spec's item names exactly, and every required level Wowhead shows agrees with
section 12. Where several items share a name, the one whose required level matches section 12 was
taken: Defiler's Talisman 21120 and Battle Healer's Cloak 19529 (both level 28), Advisor's Ring
19521 (level 28). Invoker's Mantle 215365 is the same ID Season of Discovery uses; Forever's tooltip
data has it under that ID.

```json
{
  "Holy Shroud": {"id": 2721, "icon": "inv_helmet_16"},
  "Enduring Cap": {"id": 3020, "icon": "inv_helmet_15"},
  "Embalmed Shroud": {"id": 7691, "icon": "inv_helmet_28"},
  "Wild Headdress": {"id": 270067, "icon": "inv_belt_25"},
  "Sorrow's Shroud": {"id": 284401, "icon": "inv_helmet_30"},
  "Filigreed Pristine Circlet": {"id": 253975, "icon": "inv_crown_01"},
  "Wisdom's Leather Helm": {"id": 252515, "icon": "inv_helmet_26"},
  "Kaleidoscope Chain": {"id": 13084, "icon": "inv_jewelry_amulet_07"},
  "Archmagister's Faceted Pendant": {"id": 273049, "icon": "inv_misc_necklacea8"},
  "Crystal Starfire Medallion": {"id": 5003, "icon": "inv_jewelry_necklace_02"},
  "Giantstone Medallion": {"id": 281321, "icon": "inv_jewelry_necklace_15"},
  "Mark of the Pack Leader": {"id": 285331, "icon": "inv_jewelry_necklace_04"},
  "Scorn's Icy Choker": {"id": 23169, "icon": "inv_jewelry_necklace_03"},
  "Stygian Bone Amulet": {"id": 6695, "icon": "inv_jewelry_necklace_04"},
  "Explorers' League Commendation": {"id": 7746, "icon": "inv_jewelry_talisman_01"},
  "Death Speaker Mantle": {"id": 6685, "icon": "inv_shoulder_09"},
  "Batwing Mantle": {"id": 6697, "icon": "inv_shoulder_05"},
  "Bloodmage Mantle": {"id": 7684, "icon": "inv_shoulder_05"},
  "Berylline Pads": {"id": 4197, "icon": "inv_shoulder_05"},
  "Magician's Mantle": {"id": 12998, "icon": "inv_shoulder_13"},
  "Ghostly Mantle": {"id": 3324, "icon": "inv_shoulder_09"},
  "Fairywing Mantle": {"id": 9536, "icon": "inv_shoulder_02"},
  "Moonlit Amice": {"id": 11884, "icon": "inv_shoulder_02"},
  "Rose Mantle": {"id": 5274, "icon": "inv_shoulder_09"},
  "Naga Priestess's Mantle": {"id": 279889, "icon": "inv_shoulder_18"},
  "Repairman's Cape": {"id": 9605, "icon": "inv_misc_cape_06"},
  "Brilliant Cloak": {"id": 277206, "icon": "inv_misc_cape_16"},
  "Glowing Thresher Cape": {"id": 6901, "icon": "inv_misc_monsterscales_03"},
  "Tattered Kirin Tor Cloak": {"id": 286994, "icon": "inv_misc_cape_05"},
  "Battle Healer's Cloak": {"id": 19529, "icon": "inv_misc_cape_18"},
  "Windsong Drape": {"id": 15468, "icon": "inv_misc_cape_05"},
  "Thornweaver Drape": {"id": 274149, "icon": "inv_misc_cape_11"},
  "Prelacy Cape": {"id": 7004, "icon": "inv_misc_cape_18"},
  "Death Speaker Robes": {"id": 6682, "icon": "inv_chest_cloth_20"},
  "Beguiler Robes": {"id": 7728, "icon": "inv_chest_cloth_25"},
  "Civinad Robes": {"id": 9623, "icon": "inv_chest_cloth_18"},
  "Pristine Gown": {"id": 253961, "icon": "inv_chest_cloth_32"},
  "Violet Sorcerer's Robes": {"id": 273044, "icon": "inv_chest_cloth_17"},
  "Wisdom's Leather Tunic": {"id": 252511, "icon": "inv_chest_leather_01"},
  "Doomsayer's Robe": {"id": 4746, "icon": "inv_chest_cloth_19"},
  "Zealot's Robe": {"id": 17043, "icon": "inv_chest_cloth_06"},
  "Spidertank Oilrag": {"id": 9448, "icon": "inv_misc_bandage_09"},
  "Mindthrust Bracers": {"id": 1974, "icon": "inv_bracer_07"},
  "Glowing Magical Bracelets": {"id": 13106, "icon": "inv_bracer_19"},
  "Nightsky Wristbands": {"id": 6407, "icon": "inv_bracer_07"},
  "Silkstream Cuffs": {"id": 16791, "icon": "inv_bracer_13"},
  "Knife-Polishing Rag": {"id": 271740, "icon": "inv_bracer_10"},
  "Graveweave Bindings": {"id": 273036, "icon": "inv_bracer_10"},
  "Bridgebreaker Bindings": {"id": 273808, "icon": "inv_bracer_07"},
  "Prospector Gloves": {"id": 4980, "icon": "inv_gauntlets_04"},
  "Truefaith Gloves": {"id": 7049, "icon": "inv_gauntlets_16"},
  "Gloves of Old": {"id": 9395, "icon": "inv_gauntlets_24"},
  "Hotshot Pilot's Gloves": {"id": 9491, "icon": "inv_gauntlets_16"},
  "Restorer's Fine Gloves": {"id": 270059, "icon": "inv_gauntlets_21"},
  "Pristine Gloves": {"id": 253913, "icon": "inv_gauntlets_16"},
  "Wisdom's Leather Gloves": {"id": 252499, "icon": "inv_gauntlets_60"},
  "Naga Battle Gloves": {"id": 888, "icon": "inv_gauntlets_13"},
  "Oilrag Handwraps": {"id": 16741, "icon": "inv_gauntlets_12"},
  "Shilly Mitts": {"id": 9609, "icon": "inv_gauntlets_27"},
  "Mender's Leather Belt": {"id": 252523, "icon": "inv_belt_26"},
  "Blightleaf Rope": {"id": 273039, "icon": "inv_belt_10"},
  "Skycaller's Leather Belt": {"id": 252522, "icon": "inv_belt_39a"},
  "Violet Sash": {"id": 251962, "icon": "inv_belt_04"},
  "Razzeric's Customized Seatbelt": {"id": 6726, "icon": "inv_belt_15"},
  "Belt of Arugal": {"id": 6392, "icon": "inv_belt_10"},
  "Budding Leaf Belt": {"id": 284382, "icon": "inv_belt_03"},
  "Pristine Sash": {"id": 253925, "icon": "inv_belt_43"},
  "Wisdom's Leather Leggings": {"id": 252519, "icon": "inv_pants_02"},
  "Violet Sorcerer's Leggings": {"id": 286988, "icon": "inv_pants_cloth_18"},
  "Pristine Leggings": {"id": 253987, "icon": "inv_pants_01"},
  "Filigreed Pristine Leggings": {"id": 253937, "icon": "inv_pants_01"},
  "Magistrate's Pantaloons": {"id": 270036, "icon": "inv_pants_14"},
  "Wisdom's Leather Pants": {"id": 252503, "icon": "inv_pants_06"},
  "Gaze Dreamer Pants": {"id": 6903, "icon": "inv_pants_02"},
  "Gilded Slippers": {"id": 254001, "icon": "inv_boots_cloth_08"},
  "Renewing Footpads": {"id": 279840, "icon": "inv_boots_03"},
  "Acidic Walkers": {"id": 9454, "icon": "inv_boots_05"},
  "Wisdom's Leather Boots": {"id": 252444, "icon": "inv_boots_chain_03"},
  "Violet Sorcerer's Sandals": {"id": 286987, "icon": "inv_boots_05"},
  "Gnomebot Operating Boots": {"id": 9450, "icon": "inv_boots_03"},
  "Rotmender's Treads": {"id": 271214, "icon": "inv_boots_05"},
  "Everlast Boots": {"id": 10359, "icon": "inv_boots_07"},
  "Philanthropist's Ring": {"id": 281635, "icon": "inv_jewelry_ring_14"},
  "Sea Giant's Toe Ring": {"id": 274746, "icon": "inv_jewelry_ring_02"},
  "Ladimore Heirloom Ring": {"id": 270051, "icon": "inv_jewelry_ring_08"},
  "Solid Gold Band": {"id": 279845, "icon": "inv_jewelry_ring_03"},
  "Runemender's Seal": {"id": 273031, "icon": "inv_jewelry_ring_28"},
  "Snake Hoop": {"id": 6750, "icon": "inv_jewelry_ring_06"},
  "Ring of Power Regulation": {"id": 273030, "icon": "inv_jewelry_ring_28"},
  "Electrocutioner Lagnut": {"id": 9447, "icon": "inv_misc_gear_04"},
  "Advisor's Ring": {"id": 19521, "icon": "inv_jewelry_ring_20"},
  "Minor Recombobulator": {"id": 4381, "icon": "inv_gizmo_07"},
  "Roogug's Severed Head": {"id": 274152, "icon": "inv_misc_head_quillboar_01"},
  "Worgenbane Talisman": {"id": 273643, "icon": "inv_jewelry_talisman_06"},
  "Cursed Murloc Eye": {"id": 273840, "icon": "spell_shadow_evileye"},
  "Lookie's Spyglass": {"id": 273298, "icon": "inv_misc_spyglass_01"},
  "Wind Spirit Staff": {"id": 6689, "icon": "inv_staff_01"},
  "Healer's Staff": {"id": 271767, "icon": "inv_staff_10"},
  "Fallen Dragon's Scepter": {"id": 281312, "icon": "inv_staff_08"},
  "Odo's Ley Staff": {"id": 6318, "icon": "inv_staff_27"},
  "Tidebringer's Claw": {"id": 280605, "icon": "inv_weapon_hand_15"},
  "Royal Diplomatic Scepter": {"id": 9457, "icon": "inv_mace_08"},
  "Death Speaker Scepter": {"id": 2816, "icon": "inv_mace_07"},
  "Forcestone Buckler": {"id": 17508, "icon": "inv_shield_02"},
  "Elementalist's Guard": {"id": 280696, "icon": "inv_shield_09"},
  "Heart of Agamaggan": {"id": 6694, "icon": "inv_shield_02"},
  "Seedcloud Buckler": {"id": 6630, "icon": "inv_shield_10"},
  "Painwalker Buckler": {"id": 274290, "icon": "inv_shield_07"},
  "Salve and Salvation": {"id": 276898, "icon": "inv_misc_book_01"},
  "Orb of Souls": {"id": 249395, "icon": "inv_misc_orb_04"},
  "Geomancer Headdress": {"id": 274155, "icon": "inv_helmet_14"},
  "Pristine Circlet": {"id": 253949, "icon": "inv_crown_01"},
  "Wisdom's Leather Hood": {"id": 252507, "icon": "inv_helmet_33"},
  "Whisperwind Headdress": {"id": 6688, "icon": "inv_helmet_17"},
  "Guardian's Emblem": {"id": 286995, "icon": "spell_arcane_arcaneresilience"},
  "Thermaplugg Medal of Honor": {"id": 274068, "icon": "inv_jewelry_amulet_03"},
  "Pendant of Myzrael": {"id": 4614, "icon": "inv_jewelry_necklace_07"},
  "Glowing Green Talisman": {"id": 5002, "icon": "inv_jewelry_necklace_01"},
  "Invoker's Mantle": {"id": 215365, "icon": "inv_shoulder_02"},
  "Feline Mantle": {"id": 3748, "icon": "inv_shoulder_05"},
  "Heavy Woolen Cloak": {"id": 4311, "icon": "inv_misc_cape_14"},
  "Robes of Arugal": {"id": 6324, "icon": "inv_chest_cloth_31"},
  "Wisdom's Leather Armor": {"id": 252493, "icon": "inv_chest_fur"},
  "Ceremonial Gown": {"id": 270082, "icon": "inv_shirt_13"},
  "Witherbite Bracers": {"id": 271202, "icon": "inv_bracer_07"},
  "Tattered Mittens": {"id": 270030, "icon": "inv_gauntlets_27"},
  "Gloves of Meditation": {"id": 4318, "icon": "inv_gauntlets_05"},
  "Jutebraid Gloves": {"id": 10654, "icon": "inv_gauntlets_21"},
  "Defiler's Cloth Girdle": {"id": 20164, "icon": "inv_belt_17"},
  "Wisdom's Leather Belt": {"id": 252433, "icon": "inv_belt_06"},
  "Daewyn's Girdle": {"id": 271769, "icon": "inv_belt_16"},
  "Earthen Leggings": {"id": 253999, "icon": "inv_pants_09"},
  "Ogre Loincloth": {"id": 273289, "icon": "inv_pants_09"},
  "Kodohide Legguards": {"id": 285338, "icon": "inv_pants_12"},
  "Stormrider's Leather Pants": {"id": 252502, "icon": "inv_pants_10"},
  "Roused Nature Footwraps": {"id": 286991, "icon": "inv_boots_09"},
  "Black Whelp Slippers": {"id": 252424, "icon": "inv_boots_leather_05red"},
  "Wingborne Boots": {"id": 15104, "icon": "inv_boots_07"},
  "Pristine Boots": {"id": 253889, "icon": "inv_boots_cloth_03"},
  "Reedknot Ring": {"id": 9622, "icon": "inv_belt_33"},
  "Dog Whistle": {"id": 3456, "icon": "ability_hunter_beastcall"},
  "Transformative Cocoon": {"id": 276895, "icon": "inv_misc_web_02"},
  "Bottle of Powderfuse Port": {"id": 274948, "icon": "inv_drink_11"},
  "Lightning's Grasp": {"id": 280607, "icon": "inv_weapon_hand_09"},
  "Eye of Paleth": {"id": 2943, "icon": "inv_misc_orb_03"},
  "Alliance Outrunner Healing Rod": {"id": 285348, "icon": "inv_wand_04"},
  "Orb of Mistmantle": {"id": 13031, "icon": "inv_misc_orb_01"},
  "Omega Orb": {"id": 7749, "icon": "inv_misc_orb_03"},
  "Raptor's Gaze": {"id": 273027, "icon": "spell_nature_crystalball"},
  "Staff of the Friar": {"id": 3415, "icon": "inv_staff_32"},
  "Defiler's Talisman": {"id": 21120, "icon": "inv_jewelry_talisman_05"},
  "Satchel of Potions": {"id": 280766, "icon": "inv_misc_bag_08"}
}
```

**Added 19 Oct 2026 (11).** Wowhead's search could not be reached, so the remaining items were
found by reading Wowhead's Forever tooltip data for IDs next to other new Forever items. Each one
added here matches section 12 exactly: name, every stat and the required level.

Items with no ID yet (3): Red Wool Cloak, Darkspear Raider's Cloak, Sacristan Band. Adding one here gives the item its
link, icon, item level and armor with no code change (run `node scripts/wowhead-icons.mjs`, then
`--levels` to refresh section 14.6).

### 14.6 Item level and armor (cached from Wowhead's Forever data)

Tom, 19 Oct 2026: *"item level and armor columns should be cached from wowhead forever, it can be
trusted"*. For every item in section 14.5, its item level and (for Cloth, Leather and Shield items)
its armor value, read from Wowhead's Forever tooltip data (`nether.wowhead.com`, `dataEnv=16`) on
19 Oct 2026 by `node scripts/wowhead-icons.mjs --levels`, and checked: every Cloth, Leather and
Shield item has an armor value, no other item does, and no item level is below the item's required
level. Display only: item level and armor change no score, weight or pick. An item that is not in
section 14.5 has neither. Run `node scripts/wowhead-icons.mjs --check` to compare this list with
Wowhead again.

```json
{
  "Holy Shroud": {"ilvl": 32, "armor": 40},
  "Enduring Cap": {"ilvl": 33, "armor": 88},
  "Embalmed Shroud": {"ilvl": 35, "armor": 42},
  "Wild Headdress": {"ilvl": 39, "armor": 88},
  "Sorrow's Shroud": {"ilvl": 29, "armor": 38},
  "Filigreed Pristine Circlet": {"ilvl": 30, "armor": 38},
  "Wisdom's Leather Helm": {"ilvl": 30, "armor": 84},
  "Kaleidoscope Chain": {"ilvl": 35},
  "Archmagister's Faceted Pendant": {"ilvl": 35},
  "Crystal Starfire Medallion": {"ilvl": 31},
  "Giantstone Medallion": {"ilvl": 32},
  "Mark of the Pack Leader": {"ilvl": 25},
  "Scorn's Icy Choker": {"ilvl": 35},
  "Stygian Bone Amulet": {"ilvl": 34},
  "Explorers' League Commendation": {"ilvl": 40},
  "Death Speaker Mantle": {"ilvl": 32, "armor": 37},
  "Batwing Mantle": {"ilvl": 34, "armor": 38},
  "Bloodmage Mantle": {"ilvl": 35, "armor": 38},
  "Berylline Pads": {"ilvl": 36, "armor": 39},
  "Magician's Mantle": {"ilvl": 25, "armor": 32},
  "Ghostly Mantle": {"ilvl": 27, "armor": 30},
  "Fairywing Mantle": {"ilvl": 32, "armor": 33},
  "Moonlit Amice": {"ilvl": 33, "armor": 34},
  "Rose Mantle": {"ilvl": 27, "armor": 30},
  "Naga Priestess's Mantle": {"ilvl": 40, "armor": 40},
  "Repairman's Cape": {"ilvl": 32, "armor": 22},
  "Brilliant Cloak": {"ilvl": 41, "armor": 27},
  "Glowing Thresher Cape": {"ilvl": 29, "armor": 23},
  "Tattered Kirin Tor Cloak": {"ilvl": 33, "armor": 25},
  "Battle Healer's Cloak": {"ilvl": 33, "armor": 25},
  "Windsong Drape": {"ilvl": 29, "armor": 21},
  "Thornweaver Drape": {"ilvl": 30, "armor": 24},
  "Prelacy Cape": {"ilvl": 26, "armor": 20},
  "Death Speaker Robes": {"ilvl": 31, "armor": 48},
  "Beguiler Robes": {"ilvl": 34, "armor": 50},
  "Civinad Robes": {"ilvl": 37, "armor": 54},
  "Pristine Gown": {"ilvl": 27, "armor": 45},
  "Violet Sorcerer's Robes": {"ilvl": 32, "armor": 49},
  "Wisdom's Leather Tunic": {"ilvl": 27, "armor": 98},
  "Doomsayer's Robe": {"ilvl": 42, "armor": 55},
  "Zealot's Robe": {"ilvl": 38, "armor": 50},
  "Spidertank Oilrag": {"ilvl": 34, "armor": 22},
  "Mindthrust Bracers": {"ilvl": 22, "armor": 17},
  "Glowing Magical Bracelets": {"ilvl": 31, "armor": 21},
  "Nightsky Wristbands": {"ilvl": 33, "armor": 20},
  "Silkstream Cuffs": {"ilvl": 38, "armor": 22},
  "Knife-Polishing Rag": {"ilvl": 33, "armor": 20},
  "Graveweave Bindings": {"ilvl": 31, "armor": 21},
  "Bridgebreaker Bindings": {"ilvl": 29, "armor": 20},
  "Prospector Gloves": {"ilvl": 40, "armor": 69},
  "Truefaith Gloves": {"ilvl": 30, "armor": 27},
  "Gloves of Old": {"ilvl": 34, "armor": 32},
  "Hotshot Pilot's Gloves": {"ilvl": 32, "armor": 31},
  "Restorer's Fine Gloves": {"ilvl": 40, "armor": 33},
  "Pristine Gloves": {"ilvl": 20, "armor": 23},
  "Wisdom's Leather Gloves": {"ilvl": 20, "armor": 53},
  "Naga Battle Gloves": {"ilvl": 27, "armor": 61},
  "Oilrag Handwraps": {"ilvl": 31, "armor": 59},
  "Shilly Mitts": {"ilvl": 32, "armor": 28},
  "Mender's Leather Belt": {"ilvl": 35, "armor": 63},
  "Blightleaf Rope": {"ilvl": 34, "armor": 28},
  "Skycaller's Leather Belt": {"ilvl": 35, "armor": 63},
  "Violet Sash": {"ilvl": 36, "armor": 27},
  "Razzeric's Customized Seatbelt": {"ilvl": 41, "armor": 30},
  "Belt of Arugal": {"ilvl": 28, "armor": 26},
  "Budding Leaf Belt": {"ilvl": 32, "armor": 54},
  "Pristine Sash": {"ilvl": 22, "armor": 22},
  "Wisdom's Leather Leggings": {"ilvl": 30, "armor": 90},
  "Violet Sorcerer's Leggings": {"ilvl": 34, "armor": 44},
  "Pristine Leggings": {"ilvl": 30, "armor": 41},
  "Filigreed Pristine Leggings": {"ilvl": 25, "armor": 37},
  "Magistrate's Pantaloons": {"ilvl": 29, "armor": 41},
  "Wisdom's Leather Pants": {"ilvl": 25, "armor": 82},
  "Gaze Dreamer Pants": {"ilvl": 28, "armor": 40},
  "Gilded Slippers": {"ilvl": 35, "armor": 35},
  "Renewing Footpads": {"ilvl": 36, "armor": 78},
  "Acidic Walkers": {"ilvl": 32, "armor": 34},
  "Wisdom's Leather Boots": {"ilvl": 22, "armor": 61},
  "Violet Sorcerer's Sandals": {"ilvl": 33, "armor": 34},
  "Gnomebot Operating Boots": {"ilvl": 34, "armor": 76},
  "Rotmender's Treads": {"ilvl": 24, "armor": 29},
  "Everlast Boots": {"ilvl": 38, "armor": 35},
  "Philanthropist's Ring": {"ilvl": 35},
  "Sea Giant's Toe Ring": {"ilvl": 35},
  "Ladimore Heirloom Ring": {"ilvl": 35},
  "Solid Gold Band": {"ilvl": 36},
  "Runemender's Seal": {"ilvl": 32},
  "Snake Hoop": {"ilvl": 32},
  "Ring of Power Regulation": {"ilvl": 33},
  "Electrocutioner Lagnut": {"ilvl": 34},
  "Advisor's Ring": {"ilvl": 33},
  "Minor Recombobulator": {"ilvl": 28},
  "Roogug's Severed Head": {"ilvl": 30},
  "Worgenbane Talisman": {"ilvl": 26},
  "Cursed Murloc Eye": {"ilvl": 29},
  "Lookie's Spyglass": {"ilvl": 23},
  "Wind Spirit Staff": {"ilvl": 34},
  "Healer's Staff": {"ilvl": 33},
  "Fallen Dragon's Scepter": {"ilvl": 32},
  "Odo's Ley Staff": {"ilvl": 26},
  "Tidebringer's Claw": {"ilvl": 40},
  "Royal Diplomatic Scepter": {"ilvl": 35},
  "Death Speaker Scepter": {"ilvl": 33},
  "Forcestone Buckler": {"ilvl": 40, "armor": 1078},
  "Elementalist's Guard": {"ilvl": 40, "armor": 1078},
  "Heart of Agamaggan": {"ilvl": 35, "armor": 757},
  "Seedcloud Buckler": {"ilvl": 24, "armor": 547},
  "Painwalker Buckler": {"ilvl": 34, "armor": 738},
  "Salve and Salvation": {"ilvl": 38},
  "Orb of Souls": {"ilvl": 30},
  "Geomancer Headdress": {"ilvl": 30, "armor": 84},
  "Pristine Circlet": {"ilvl": 25, "armor": 35},
  "Wisdom's Leather Hood": {"ilvl": 25, "armor": 76},
  "Whisperwind Headdress": {"ilvl": 34, "armor": 89},
  "Guardian's Emblem": {"ilvl": 33},
  "Thermaplugg Medal of Honor": {"ilvl": 34},
  "Pendant of Myzrael": {"ilvl": 35},
  "Glowing Green Talisman": {"ilvl": 30},
  "Invoker's Mantle": {"ilvl": 30, "armor": 32},
  "Feline Mantle": {"ilvl": 28, "armor": 34},
  "Heavy Woolen Cloak": {"ilvl": 21, "armor": 17},
  "Robes of Arugal": {"ilvl": 28, "armor": 46},
  "Wisdom's Leather Armor": {"ilvl": 20, "armor": 85},
  "Ceremonial Gown": {"ilvl": 42, "armor": 55},
  "Witherbite Bracers": {"ilvl": 20, "armor": 37},
  "Tattered Mittens": {"ilvl": 28, "armor": 26},
  "Gloves of Meditation": {"ilvl": 26, "armor": 25},
  "Jutebraid Gloves": {"ilvl": 30, "armor": 27},
  "Defiler's Cloth Girdle": {"ilvl": 33, "armor": 28},
  "Wisdom's Leather Belt": {"ilvl": 17, "armor": 45},
  "Daewyn's Girdle": {"ilvl": 33, "armor": 25},
  "Earthen Leggings": {"ilvl": 35, "armor": 41},
  "Ogre Loincloth": {"ilvl": 22, "armor": 35},
  "Kodohide Legguards": {"ilvl": 29, "armor": 88},
  "Stormrider's Leather Pants": {"ilvl": 25, "armor": 82},
  "Roused Nature Footwraps": {"ilvl": 32, "armor": 73},
  "Black Whelp Slippers": {"ilvl": 15, "armor": 53},
  "Wingborne Boots": {"ilvl": 39, "armor": 35},
  "Pristine Boots": {"ilvl": 17, "armor": 23},
  "Reedknot Ring": {"ilvl": 35},
  "Dog Whistle": {"ilvl": 30},
  "Transformative Cocoon": {"ilvl": 30},
  "Bottle of Powderfuse Port": {"ilvl": 42},
  "Lightning's Grasp": {"ilvl": 40},
  "Eye of Paleth": {"ilvl": 31},
  "Alliance Outrunner Healing Rod": {"ilvl": 26},
  "Orb of Mistmantle": {"ilvl": 28},
  "Omega Orb": {"ilvl": 40},
  "Raptor's Gaze": {"ilvl": 31},
  "Staff of the Friar": {"ilvl": 26},
  "Defiler's Talisman": {"ilvl": 33},
  "Satchel of Potions": {"ilvl": 33}
}
```

### 14.7 Spell Power before Healing in the priority line

Tom, 19 Oct 2026: *"point for point spell power probably is on the left side and hp on the right,
while they are = to each other SP does influence dmg as well if they are equal, but it should keep
the = sign between them"*.

Healing and Spell Power always have the same weight, so the priority line always joins them with
"=". When weights tie, the line now lists **Spell Power before Healing**: section 5's sort starts
from the base order mp5, int, spi, sp, heal (Stamina last, when its weight is above 0) instead of
mp5, int, spi, heal, sp. The "=" rule is unchanged, no number changes, and the weight bars keep
their order (MP5, Intellect, Spirit, Healing, Spell Power).

This supersedes the tie order in section 5 and the priority line strings quoted in sections 1, 7
and 14.3. They now read:

- Section 7's character at Dungeon boss: "MP5 > Intellect > Spell Power = Healing > Spirit".
- The section 14.3 defaults at Dungeon boss: "MP5 > Intellect > Spell Power = Healing = Spirit".

The reference implementation in section 13 still uses the old order; the comparison with it
reads its priority line with the two names swapped.

### 14.8 Crit chance, worked out, and crit as a stat

Tom, 19 Oct 2026: *"create the exact formula for calculating crit % with the specific gear so that
water shield can be calculated and that stat should go into giving items weight as well, even if
its small. think about 2 items, both 10 int, 5 mp5, one has 33 armor the other has 1% crit, the 1%
crit item should have more points"*.

**Crit chance** (heal crit chance, in %), worked out the way max mana is (section 14.2):

```
critCalc = 2.3 + int / intPerCrit(level) + critExtra
```

- 2.3 is the Shaman base spell crit chance.
- `intPerCrit(level)` is the Intellect a Shaman needs for 1% spell crit. Documented at four levels:

| Level | 25 | 40 | 50 | 60 |
|---|---|---|---|---|
| Crit per Intellect, % | 0.0422 | 0.0262 | 0.0208 | 0.0169 |
| Intellect per 1% crit | 23.697 | 38.168 | 48.077 | 59.172 |

  Between documented levels it is linear in Intellect per 1% crit; below level 25 it is
  `intPerCrit(25) * level / 25`; above 60 it is the level 60 value. Any level not in the table is
  estimated (shown with the Check tag). Level 30 is 28.520 (estimated); level 24 is 22.749
  (estimated).
- Source: the wowsims Season of Discovery simulator's base stats (github.com/wowsims/sod,
  `sim/core/base_stats.go`: `ClassBaseCrit` gives Shaman spell crit 2.3, `CritPerIntAtLevel` the
  rows above), which are Classic game data. The level 60 value is the long-standing Classic figure
  of 59.2 Intellect per 1%. **Not yet checked in Forever.** Tom can check: naked at level 25 with
  41 Intellect, the character sheet's spell crit chance should read 4.03%.
- `critExtra` is the new input "Crit from gear and talents, %", default 0: crit from items (for
  example Tidebringer's Claw's +2% on Healing Wave and Lesser Healing Wave) and from any talent.
- New state keys: `critAuto` (default true), `critExtra` (default 0) and `critStat` (default true;
  it has no control on the page and exists so section 7's checks and the reference comparison can
  run the model without crit). `crit` keeps its meaning, a typed crit chance, and is used only
  while `critAuto` is false.
- The model's crit chance is `pc = clamp((critAuto ? critCalc : crit) / 100, 0, 1)`. Water Shield
  (section 5) uses this `pc`.
- Migration: a saved state without `critAuto` keeps a typed crit (`critAuto` false) unless it is
  the old default 5, which becomes calculated (`critAuto` true).

**Crit as a stat.** The weight of 1% heal crit, in points of Healing, added to section 5 after
`costEff` (`pool` is the effective pool of section 14.2):

```
CRIT_MULT    = 1.5                                         // a heal crit heals for 150%
c            = CRIT_MULT - 1
critHeal     = 0.01 * h * c / (ce * (1 + c * pc))          // more healing from crits
critWS       = ws ? 0.01 * h * 0.02 * pool / (ce * costEff) : 0   // Water Shield mana, mana-bound
weights.crit = critStat ? (ce > 0 ? critHeal + wf * critWS : NaN) : 0
weights.int += critStat ? weights.crit / intPerCrit(level) : 0    // Intellect also buys crit
```

Why it works: when mana runs out, total healing = casts * h * (1 + c * pc), with
casts = E / costEff and costEff = cost - pc * 0.02 * pool. One point of Healing adds
casts * ce * (1 + c * pc). Differentiating total healing by pc and dividing by that gives the two
terms (per unit of pc; times 0.01 for 1%). The healing term holds whether or not mana runs out, so
it is not scaled by w; the Water Shield term is mana, so it is scaled by w like MP5. Section 5's
note that crits cancel still holds for the ratios between the other stats; crit as a stat of its
own is new.

**Items with crit.** `score(item)` (section 7) adds `crit * weights.crit`, with crit from this list:

```json
{
  "Tidebringer's Claw": 2
}
```

Tidebringer's Claw's "+2% crit on Healing Wave and Lesser Healing Wave" counts in full, because
every spell the calculator models is a Healing Wave or Lesser Healing Wave rank. Lightning's
Grasp's "+1% Lightning Bolt crit" does not heal and counts 0. No other item in section 12 has crit
(checked against Wowhead's Forever tooltips on 19 Oct 2026).

**On the page.**
- Character panel: **Crit chance** with its working, like Max mana, for example "Base 2.3% + 4.03%
  from 115 Intellect (28.5 per 1%) + 0% from gear and talents = 6.33%.", with the Check tag while
  `intPerCrit` is estimated. Typing a number overrides it; "Use calculated (6.3%)" returns. New
  input **Crit from gear and talents, %**.
- The Water Shield row loses its own box; its text says it uses the crit chance from the
  Character panel.
- Stat weights: crit is not in the priority line (it is per 1%, the others per point). A readout
  shows it, for example "1% crit: 3.90 points of Healing (heals 2.98, Water Shield 0.92)".
- Unconfirmed in Forever: the 2.3% base, the crit per Intellect table, and CRIT_MULT 1.5.

**Numbers at the new defaults** (Horde, level 30, 115 Intellect, `critAuto` true, `critExtra` 0;
crit chance 6.332% at every preset):

| Preset | E | X | MP5 | Int | Spirit | Crit | WS per cast | Casts | Horde total | Alliance total |
|---|---|---|---|---|---|---|---|---|---|---|
| Trash pull | 3430.5 | 3.226 | 2.258 | 2.060 | 0.919 | 3.900 | 2.672 | 17.38 | 452.21 | 453.40 |
| Dungeon boss | 3636.8 | 4.057 | 2.840 | 1.953 | 0.978 | 3.900 | 2.672 | 18.43 | 448.15 | 449.18 |
| Raid boss | 5634.5 | 6.546 | 4.582 | 1.324 | 1.434 | 3.900 | 2.672 | 28.55 | 452.36 | 444.79 |

- `critHeal` is 2.979 and `critWS` 1.315 at all three presets.
- Priority lines: Trash pull "MP5 > Intellect > Spell Power = Healing > Spirit"; Dungeon boss
  "MP5 > Intellect > Spell Power = Healing = Spirit"; Raid boss "MP5 > Spirit > Intellect > Spell
  Power = Healing".
- Best set at Dungeon boss (scores to 2 places): Holy Shroud 38.87, Scorn's Icy Choker 18.72, Death
  Speaker Mantle 27.48, Darkspear Raider's Cloak 19.54, Death Speaker Robes 41.48, Mindthrust
  Bracers 18.28, Gloves of Old 21.50, Blightleaf Rope 26.53, Violet Sorcerer's Leggings 42.28,
  Acidic Walkers 24.54, Philanthropist's Ring 19.77, Sea Giant's Toe Ring 18.00, Roogug's Severed
  Head 5.87, Worgenbane Talisman 5.68, Tidebringer's Claw 93.80, Forcestone Buckler 25.82. Main hand
  and off hand 119.62 beat the best two-hander (Wind Spirit Staff) 85.64, by 33.98.
- Tom's example at Dungeon boss: an item with 10 Intellect and 5 MP5 scores 33.73 with 33 armor
  (armor is worth 0) and 37.63 with 1% crit instead.
- More checks at Dungeon boss: Water Shield off gives Crit 2.979 and Int 1.879; a typed crit of 10%
  gives Crit 3.855, Int 1.976 and Water Shield 4.220 per cast; `critExtra` 5 gives crit 11.332% and
  Crit 3.839; level 24 with 40 Intellect gives crit 4.058%.

**Sections 7 and 14.3 stay true for the model without crit**, and their tests keep their values:
section 7 runs on `{ ...DEFAULTS, manaAuto: false, pool: 2223, critAuto: false, crit: 5, critStat:
false }`, section 14.3 on `{ ...DEFAULTS, critAuto: false, crit: 5, critStat: false }`. The
reference comparison (section 13) runs the app with `critAuto: false` and `critStat: false`, with
`crit` as each scenario sets it (5 when it sets none).

These numbers come from an independent port of the model (Python, written from this spec), which
also reproduces every number in sections 7 and 14.3.

### 14.9 Item quality and the relic (cached from Wowhead's Forever data)

Tom, 19 Oct 2026, on the character sheet: *"coloring for white/green/blue/purple etc based on
rarity"*, and Wowhead's Forever data *"can be trusted"*. Each item's quality, read from Wowhead's
Forever tooltip data by `node scripts/wowhead-icons.mjs --quality`: 2 is uncommon (green) and 3 is
rare (blue); none of the 152 items in section 14.5 is common or epic. An item not in 14.5 has no
quality and is shown in a neutral colour. The game's colours: 0 poor #9d9d9d, 1 common #ffffff,
2 uncommon #1eff00, 3 rare #0070dd, 4 epic #a335ee, 5 legendary #ff8000.

The relic is section 3's Polished Driftwood Icon (Wowhead 249398, a rare Shaman totem, requires
level 20, "Allows 8% of your Mana regeneration to continue while casting"). The character sheet
shows it in the relic slot while its toggle is on. It is not an item in section 12 and has no score.

```json
{
  "items": {
    "Holy Shroud": 3,
    "Enduring Cap": 3,
    "Embalmed Shroud": 3,
    "Wild Headdress": 2,
    "Sorrow's Shroud": 3,
    "Filigreed Pristine Circlet": 3,
    "Wisdom's Leather Helm": 3,
    "Kaleidoscope Chain": 3,
    "Archmagister's Faceted Pendant": 3,
    "Crystal Starfire Medallion": 2,
    "Giantstone Medallion": 3,
    "Mark of the Pack Leader": 3,
    "Scorn's Icy Choker": 3,
    "Stygian Bone Amulet": 3,
    "Explorers' League Commendation": 3,
    "Death Speaker Mantle": 3,
    "Batwing Mantle": 3,
    "Bloodmage Mantle": 3,
    "Berylline Pads": 3,
    "Magician's Mantle": 3,
    "Ghostly Mantle": 2,
    "Fairywing Mantle": 2,
    "Moonlit Amice": 2,
    "Rose Mantle": 2,
    "Naga Priestess's Mantle": 2,
    "Repairman's Cape": 2,
    "Brilliant Cloak": 2,
    "Glowing Thresher Cape": 3,
    "Tattered Kirin Tor Cloak": 3,
    "Battle Healer's Cloak": 3,
    "Windsong Drape": 2,
    "Thornweaver Drape": 3,
    "Prelacy Cape": 2,
    "Death Speaker Robes": 3,
    "Beguiler Robes": 3,
    "Civinad Robes": 3,
    "Pristine Gown": 3,
    "Violet Sorcerer's Robes": 3,
    "Wisdom's Leather Tunic": 3,
    "Doomsayer's Robe": 2,
    "Zealot's Robe": 2,
    "Spidertank Oilrag": 3,
    "Mindthrust Bracers": 3,
    "Glowing Magical Bracelets": 3,
    "Nightsky Wristbands": 2,
    "Silkstream Cuffs": 2,
    "Knife-Polishing Rag": 2,
    "Graveweave Bindings": 3,
    "Bridgebreaker Bindings": 3,
    "Prospector Gloves": 2,
    "Truefaith Gloves": 2,
    "Gloves of Old": 3,
    "Hotshot Pilot's Gloves": 3,
    "Restorer's Fine Gloves": 2,
    "Pristine Gloves": 3,
    "Wisdom's Leather Gloves": 3,
    "Naga Battle Gloves": 3,
    "Oilrag Handwraps": 2,
    "Shilly Mitts": 2,
    "Mender's Leather Belt": 3,
    "Blightleaf Rope": 3,
    "Skycaller's Leather Belt": 3,
    "Violet Sash": 2,
    "Razzeric's Customized Seatbelt": 2,
    "Belt of Arugal": 3,
    "Budding Leaf Belt": 2,
    "Pristine Sash": 3,
    "Wisdom's Leather Leggings": 3,
    "Violet Sorcerer's Leggings": 3,
    "Pristine Leggings": 3,
    "Filigreed Pristine Leggings": 3,
    "Magistrate's Pantaloons": 3,
    "Wisdom's Leather Pants": 3,
    "Gaze Dreamer Pants": 3,
    "Gilded Slippers": 3,
    "Renewing Footpads": 3,
    "Acidic Walkers": 3,
    "Wisdom's Leather Boots": 3,
    "Violet Sorcerer's Sandals": 3,
    "Gnomebot Operating Boots": 3,
    "Rotmender's Treads": 3,
    "Everlast Boots": 2,
    "Philanthropist's Ring": 3,
    "Sea Giant's Toe Ring": 2,
    "Ladimore Heirloom Ring": 2,
    "Solid Gold Band": 2,
    "Runemender's Seal": 3,
    "Snake Hoop": 2,
    "Ring of Power Regulation": 3,
    "Electrocutioner Lagnut": 3,
    "Advisor's Ring": 3,
    "Minor Recombobulator": 2,
    "Roogug's Severed Head": 3,
    "Worgenbane Talisman": 3,
    "Cursed Murloc Eye": 3,
    "Lookie's Spyglass": 3,
    "Wind Spirit Staff": 3,
    "Healer's Staff": 3,
    "Fallen Dragon's Scepter": 3,
    "Odo's Ley Staff": 3,
    "Tidebringer's Claw": 3,
    "Royal Diplomatic Scepter": 3,
    "Death Speaker Scepter": 3,
    "Forcestone Buckler": 3,
    "Elementalist's Guard": 3,
    "Heart of Agamaggan": 3,
    "Seedcloud Buckler": 3,
    "Painwalker Buckler": 3,
    "Salve and Salvation": 3,
    "Orb of Souls": 3,
    "Geomancer Headdress": 3,
    "Pristine Circlet": 3,
    "Wisdom's Leather Hood": 3,
    "Whisperwind Headdress": 3,
    "Guardian's Emblem": 3,
    "Thermaplugg Medal of Honor": 3,
    "Pendant of Myzrael": 2,
    "Glowing Green Talisman": 2,
    "Invoker's Mantle": 2,
    "Feline Mantle": 3,
    "Heavy Woolen Cloak": 2,
    "Robes of Arugal": 3,
    "Wisdom's Leather Armor": 3,
    "Ceremonial Gown": 2,
    "Witherbite Bracers": 3,
    "Tattered Mittens": 2,
    "Gloves of Meditation": 2,
    "Jutebraid Gloves": 2,
    "Defiler's Cloth Girdle": 3,
    "Wisdom's Leather Belt": 3,
    "Daewyn's Girdle": 2,
    "Earthen Leggings": 2,
    "Ogre Loincloth": 3,
    "Kodohide Legguards": 3,
    "Stormrider's Leather Pants": 3,
    "Roused Nature Footwraps": 3,
    "Black Whelp Slippers": 3,
    "Wingborne Boots": 2,
    "Pristine Boots": 3,
    "Reedknot Ring": 2,
    "Dog Whistle": 3,
    "Transformative Cocoon": 2,
    "Bottle of Powderfuse Port": 2,
    "Lightning's Grasp": 3,
    "Eye of Paleth": 2,
    "Alliance Outrunner Healing Rod": 3,
    "Orb of Mistmantle": 3,
    "Omega Orb": 3,
    "Raptor's Gaze": 3,
    "Staff of the Friar": 3,
    "Defiler's Talisman": 3,
    "Satchel of Potions": 2
  },
  "relic": {"name": "Polished Driftwood Icon", "id": 249398, "icon": "spell_shaman_totemrecall", "quality": 3}
}
```

### 14.10 3D character: races, slots and item models

Tom, 19 Oct 2026, after seeing sixtysim.com: *"i want 3d model charactrers with the gear"*. His
answers the same day: relaying Wowhead's model files through this site is *"fine for now"*; the 3D
character goes on *"the main calculator page"* and the best-in-slot page (`/bis`); *"alliance is
dwarf only"*, and the Horde races come from web research. Race only chooses the model: it changes
no number anywhere.

**Races.** Shamans in Forever can be Orc, Troll, Tauren or Windshaper Skyborne (Horde) and Dwarf
(Alliance only), per Tom and the Forever race guides found by web search on 19 Oct 2026 (Blizzard's
Forever announcement, and the Shaman guides at warcrafttavern.com, talentsforever.com and
mobalytics.gg). Each race's two character models are Wowhead's (`meta/character/<id>.json` on
wow.zamimg.com records the race and gender of each: male is gender 0, female 1). The first race of
a faction is its default, and male is the default gender.

**Viewer slots.** Wowhead's viewer takes each piece of gear as `[slot, display]`: head 1, shoulder
3, back 16, chest 5 (a robe 20), wrist 9, hands 10, waist 6, legs 7, feet 8, every main-hand and
two-hand weapon 21, every off hand (shield or held item) 22. Necks, rings and trinkets show no model
and have no entry.

**Item model numbers** (Wowhead's "display IDs"). Wowhead blocks automated reads of its item pages,
from servers and, after two quick runs on 19 Oct, from Tom's browser too. So the numbers come from
sixtysim.com's item table (read 19 Oct 2026), Tom's choice on 20 Oct. Every number was then checked
against Wowhead's own model files with `node scripts/wowhead-models.mjs --check`: the file exists,
and its inventory type matches the item's section 12 slot (a chest whose model is a robe's gets slot
20). Four models are filed under another armor class than section 12 gives (Bridgebreaker
Bindings, Renewing Footpads, Defiler's Cloth Girdle, Kodohide Legguards); Wowhead files a model that
several items share under one of them, so they are kept. Items with no entry are not drawn: Tattered
Kirin Tor Cloak and Roused Nature Footwraps (not in sixtysim's table), and Red Wool Cloak and
Darkspear Raider's Cloak (no Wowhead ID in section 14.5).

```json
{
  "races": {
    "Horde": [
      {"race": "Orc", "male": 3, "female": 4},
      {"race": "Troll", "male": 15, "female": 16},
      {"race": "Tauren", "male": 11, "female": 12},
      {"race": "Windshaper Skyborne", "male": 218, "female": 219}
    ],
    "Alliance": [
      {"race": "Dwarf", "male": 5, "female": 6}
    ]
  },
  "items": {
    "Holy Shroud": {"display": 16826, "slot": 1},
    "Enduring Cap": {"display": 21292, "slot": 1},
    "Embalmed Shroud": {"display": 15391, "slot": 1},
    "Wild Headdress": {"display": 13323, "slot": 1},
    "Sorrow's Shroud": {"display": 15616, "slot": 1},
    "Filigreed Pristine Circlet": {"display": 747756, "slot": 1},
    "Wisdom's Leather Helm": {"display": 714591, "slot": 1},
    "Death Speaker Mantle": {"display": 11473, "slot": 3},
    "Batwing Mantle": {"display": 5116, "slot": 3},
    "Bloodmage Mantle": {"display": 10791, "slot": 3},
    "Berylline Pads": {"display": 12980, "slot": 3},
    "Magician's Mantle": {"display": 20715, "slot": 3},
    "Ghostly Mantle": {"display": 21457, "slot": 3},
    "Fairywing Mantle": {"display": 18901, "slot": 3},
    "Moonlit Amice": {"display": 9440, "slot": 3},
    "Rose Mantle": {"display": 17135, "slot": 3},
    "Naga Priestess's Mantle": {"display": 9746, "slot": 3},
    "Repairman's Cape": {"display": 23100, "slot": 16},
    "Brilliant Cloak": {"display": 15181, "slot": 16},
    "Glowing Thresher Cape": {"display": 23002, "slot": 16},
    "Battle Healer's Cloak": {"display": 23071, "slot": 16},
    "Windsong Drape": {"display": 28303, "slot": 16},
    "Thornweaver Drape": {"display": 23008, "slot": 16},
    "Prelacy Cape": {"display": 15042, "slot": 16},
    "Death Speaker Robes": {"display": 12216, "slot": 20},
    "Beguiler Robes": {"display": 19109, "slot": 20},
    "Civinad Robes": {"display": 14760, "slot": 20},
    "Pristine Gown": {"display": 715246, "slot": 5},
    "Violet Sorcerer's Robes": {"display": 737494, "slot": 20},
    "Wisdom's Leather Tunic": {"display": 714589, "slot": 5},
    "Doomsayer's Robe": {"display": 12718, "slot": 20},
    "Zealot's Robe": {"display": 15820, "slot": 20},
    "Spidertank Oilrag": {"display": 11204, "slot": 9},
    "Mindthrust Bracers": {"display": 16901, "slot": 9},
    "Glowing Magical Bracelets": {"display": 22593, "slot": 9},
    "Nightsky Wristbands": {"display": 14618, "slot": 9},
    "Silkstream Cuffs": {"display": 17646, "slot": 9},
    "Knife-Polishing Rag": {"display": 22593, "slot": 9},
    "Graveweave Bindings": {"display": 715413, "slot": 9},
    "Bridgebreaker Bindings": {"display": 12955, "slot": 9},
    "Prospector Gloves": {"display": 5435, "slot": 10},
    "Truefaith Gloves": {"display": 11097, "slot": 10},
    "Gloves of Old": {"display": 13348, "slot": 10},
    "Hotshot Pilot's Gloves": {"display": 12468, "slot": 10},
    "Restorer's Fine Gloves": {"display": 11532, "slot": 10},
    "Pristine Gloves": {"display": 715240, "slot": 10},
    "Wisdom's Leather Gloves": {"display": 714587, "slot": 10},
    "Naga Battle Gloves": {"display": 3524, "slot": 10},
    "Oilrag Handwraps": {"display": 9366, "slot": 10},
    "Shilly Mitts": {"display": 18991, "slot": 10},
    "Mender's Leather Belt": {"display": 714448, "slot": 6},
    "Blightleaf Rope": {"display": 737787, "slot": 6},
    "Skycaller's Leather Belt": {"display": 714494, "slot": 6},
    "Violet Sash": {"display": 714142, "slot": 6},
    "Razzeric's Customized Seatbelt": {"display": 4306, "slot": 6},
    "Belt of Arugal": {"display": 11172, "slot": 6},
    "Budding Leaf Belt": {"display": 10269, "slot": 6},
    "Pristine Sash": {"display": 715247, "slot": 6},
    "Wisdom's Leather Leggings": {"display": 714590, "slot": 7},
    "Violet Sorcerer's Leggings": {"display": 737498, "slot": 7},
    "Pristine Leggings": {"display": 715248, "slot": 7},
    "Filigreed Pristine Leggings": {"display": 715248, "slot": 7},
    "Magistrate's Pantaloons": {"display": 27755, "slot": 7},
    "Wisdom's Leather Pants": {"display": 714588, "slot": 7},
    "Gaze Dreamer Pants": {"display": 7587, "slot": 7},
    "Gilded Slippers": {"display": 715316, "slot": 8},
    "Renewing Footpads": {"display": 8348, "slot": 8},
    "Acidic Walkers": {"display": 4623, "slot": 8},
    "Wisdom's Leather Boots": {"display": 714585, "slot": 8},
    "Violet Sorcerer's Sandals": {"display": 21154, "slot": 8},
    "Gnomebot Operating Boots": {"display": 16059, "slot": 8},
    "Rotmender's Treads": {"display": 734651, "slot": 8},
    "Everlast Boots": {"display": 14325, "slot": 8},
    "Wind Spirit Staff": {"display": 20325, "slot": 21},
    "Healer's Staff": {"display": 5554, "slot": 21},
    "Fallen Dragon's Scepter": {"display": 24445, "slot": 21},
    "Odo's Ley Staff": {"display": 20335, "slot": 21},
    "Tidebringer's Claw": {"display": 741039, "slot": 21},
    "Royal Diplomatic Scepter": {"display": 18373, "slot": 21},
    "Death Speaker Scepter": {"display": 19669, "slot": 21},
    "Forcestone Buckler": {"display": 4403, "slot": 22},
    "Elementalist's Guard": {"display": 741451, "slot": 22},
    "Heart of Agamaggan": {"display": 18454, "slot": 22},
    "Seedcloud Buckler": {"display": 2210, "slot": 22},
    "Painwalker Buckler": {"display": 18698, "slot": 22},
    "Salve and Salvation": {"display": 752990, "slot": 22},
    "Orb of Souls": {"display": 21597, "slot": 22},
    "Geomancer Headdress": {"display": 8753, "slot": 1},
    "Pristine Circlet": {"display": 747756, "slot": 1},
    "Wisdom's Leather Hood": {"display": 714592, "slot": 1},
    "Whisperwind Headdress": {"display": 7009, "slot": 1},
    "Invoker's Mantle": {"display": 4904, "slot": 3},
    "Feline Mantle": {"display": 10169, "slot": 3},
    "Heavy Woolen Cloak": {"display": 23093, "slot": 16},
    "Robes of Arugal": {"display": 11528, "slot": 20},
    "Wisdom's Leather Armor": {"display": 714583, "slot": 5},
    "Ceremonial Gown": {"display": 28064, "slot": 5},
    "Witherbite Bracers": {"display": 734653, "slot": 9},
    "Tattered Mittens": {"display": 27753, "slot": 10},
    "Gloves of Meditation": {"display": 4620, "slot": 10},
    "Jutebraid Gloves": {"display": 11985, "slot": 10},
    "Defiler's Cloth Girdle": {"display": 9965, "slot": 6},
    "Wisdom's Leather Belt": {"display": 714584, "slot": 6},
    "Daewyn's Girdle": {"display": 11172, "slot": 6},
    "Earthen Leggings": {"display": 715294, "slot": 7},
    "Ogre Loincloth": {"display": 10098, "slot": 7},
    "Kodohide Legguards": {"display": 13331, "slot": 7},
    "Stormrider's Leather Pants": {"display": 714526, "slot": 7},
    "Black Whelp Slippers": {"display": 714356, "slot": 8},
    "Wingborne Boots": {"display": 14660, "slot": 8},
    "Pristine Boots": {"display": 747019, "slot": 8},
    "Bottle of Powderfuse Port": {"display": 6530, "slot": 21},
    "Lightning's Grasp": {"display": 741038, "slot": 21},
    "Eye of Paleth": {"display": 21596, "slot": 22},
    "Alliance Outrunner Healing Rod": {"display": 13109, "slot": 22},
    "Orb of Mistmantle": {"display": 28803, "slot": 22},
    "Omega Orb": {"display": 15884, "slot": 22},
    "Raptor's Gaze": {"display": 21603, "slot": 22},
    "Staff of the Friar": {"display": 20339, "slot": 21}
  }
}
```
