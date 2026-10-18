import { describe, expect, it } from "vitest";
import {
  DEFAULTS,
  PRESETS,
  activePreset,
  compute,
  effectiveSpell,
  knownSpells,
  priorityLine,
  shareKept,
  spellCalc,
  spellOf,
  type PresetId,
  type State,
} from "./model";
import { fmt } from "./format";

function at(preset: PresetId, over: Partial<State> = {}): State {
  const { t, f } = PRESETS[preset];
  return { ...DEFAULTS, t, f, ...over };
}

const EXPECTED: Record<PresetId, { k: number; E: number; X: number; mp5: number; int: number; spi: number }> = {
  trash: { k: 0.65, E: 3543.5, X: 3.123, mp5: 2.186, int: 1.854, spi: 0.889 },
  boss: { k: 0.55, E: 3749.8, X: 3.935, mp5: 2.754, int: 1.754, spi: 0.948 },
  raid: { k: 0.5, E: 5747.5, X: 6.418, mp5: 4.492, int: 1.156, spi: 1.406 },
};

describe("spec section 7 test values", () => {
  for (const id of Object.keys(EXPECTED) as PresetId[]) {
    it(`matches at ${PRESETS[id].label}`, () => {
      const r = compute(at(id));
      const e = EXPECTED[id];
      expect(r.k).toBeCloseTo(e.k, 3);
      expect(r.E).toBeCloseTo(e.E, 1);
      expect(r.c.heal).toBeCloseTo(526.929, 3);
      expect(r.X).toBeCloseTo(e.X, 3);
      expect(r.weights.mp5).toBeCloseTo(e.mp5, 3);
      expect(r.weights.int).toBeCloseTo(e.int, 3);
      expect(r.weights.spi).toBeCloseTo(e.spi, 3);
      expect(r.weights.heal).toBe(1);
      expect(r.weights.sp).toBe(1);
    });
  }

  it("Water Shield gives 2.223 mana per cast and 18.96 casts at Dungeon boss", () => {
    const r = compute(at("boss"));
    expect(r.wsBack).toBeCloseTo(2.223, 3);
    expect(r.casts).toBeCloseTo(18.96, 2);
  });
});

describe("presets", () => {
  it("labels and active preset", () => {
    expect(PRESETS.trash.label).toBe("Trash pull");
    expect(PRESETS.boss.label).toBe("Dungeon boss");
    expect(PRESETS.raid.label).toBe("Raid boss");
    expect(activePreset(DEFAULTS)).toBe("boss");
    expect(activePreset({ t: 300, f: 100 })).toBe("raid");
    expect(activePreset({ t: 300, f: 95 })).toBeNull();
  });
});

describe("priorityLine", () => {
  const text = (state: State) => {
    const p = priorityLine(compute(state).weights);
    return p.keys.map((k, i) => (i ? ` ${p.ops[i - 1]} ` : "") + { mp5: "MP5", int: "Intellect", spi: "Spirit", heal: "Healing", sp: "Spell Power", sta: "Stamina" }[k]).join("");
  };

  it("reads as the spec at Dungeon boss defaults", () => {
    expect(text(at("boss"))).toBe("MP5 > Intellect > Healing = Spell Power > Spirit");
  });

  it("puts Stamina first when its weight is 5", () => {
    expect(priorityLine(compute(at("boss", { stw: 5 })).weights).keys[0]).toBe("sta");
  });

  it("leaves Stamina out when its weight is 0", () => {
    expect(priorityLine(compute(at("boss")).weights).keys).not.toContain("sta");
  });

  it("reports a NaN X so the UI can say there is no healing power bonus", () => {
    const r = compute({ ...at("boss"), level: 60, spell: "hw1" });
    expect(r.X).toBeNaN();
    expect(priorityLine(r.weights).ok).toBe(false);
    expect(priorityLine(compute(at("boss")).weights).ok).toBe(true);
  });
});

describe("downranking and spells", () => {
  it("shareKept follows clamp(1 - (L - 17 - T) * 0.05, 0, 1)", () => {
    expect(shareKept(30, 24)).toBe(1);
    expect(shareKept(30, 6)).toBeCloseTo(0.65, 10);
    expect(shareKept(30, 1)).toBeCloseTo(0.4, 10);
    expect(shareKept(60, 1)).toBe(0);
  });

  it("imphw shortens Healing Wave heal per second but not Lesser Healing Wave", () => {
    const on = { ...DEFAULTS, imphw: true };
    const off = { ...DEFAULTS, imphw: false };
    const hw5 = spellOf(on, "hw5");
    // lhw2 casts in 1.5 s, which the global cooldown floor hides, so give it a 3 s cast
    const lhw2 = spellOf({ edits: { lhw2: { cast: 3 } } }, "lhw2");
    expect(spellCalc(on, hw5).hps).toBeGreaterThan(spellCalc(off, hw5).hps);
    expect(spellCalc(on, lhw2).hps).toBe(spellCalc(off, lhw2).hps);
    expect(spellCalc(on, hw5).heal).toBe(spellCalc(off, hw5).heal);
  });

  it("known spells at level 30 are hw1 to hw5, lhw1 and lhw2", () => {
    expect(knownSpells(30).map((s) => s.id)).toEqual(["hw1", "hw2", "hw3", "hw4", "hw5", "lhw1", "lhw2"]);
  });

  it("falls back to the highest known Healing Wave rank", () => {
    expect(effectiveSpell({ level: 20, spell: "hw5" })).toBe("hw4");
    expect(effectiveSpell({ level: 30, spell: "hw5" })).toBe("hw5");
    expect(effectiveSpell({ level: 30, spell: "lhw2" })).toBe("lhw2");
    expect(compute({ ...DEFAULTS, level: 20 }).sp.id).toBe("hw4");
  });

  it("a base edit on hw5 changes h, and non-positive garbage falls back", () => {
    const base = compute(DEFAULTS).c.heal;
    const edited = compute({ ...DEFAULTS, edits: { hw5: { base: 400 } } });
    expect(edited.c.heal).not.toBe(base);
    expect(edited.sp.edited).toBe(true);
    expect(spellOf({ edits: { hw5: { base: NaN } } }, "hw5").base).toBe(spellOf({ edits: {} }, "hw5").base);
  });
});

describe("regen shapes", () => {
  it("curve model uses A - B / Spirit", () => {
    const r = compute({ ...DEFAULTS, smodel: "curve" });
    expect(r.sFull).toBeCloseTo(114 - 2666 / 107, 6);
  });

  it("caps the share kept while casting at 100%", () => {
    expect(compute({ ...DEFAULTS, pct: 100, icon: true }).m).toBe(1);
  });
});

describe("fmt", () => {
  it("formats with fixed decimals and a dash for non-finite", () => {
    expect(fmt(3749.8, 0)).toBe("3,750");
    expect(fmt(2.7543, 2)).toBe("2.75");
    expect(fmt(NaN, 2)).toBe("–");
    expect(fmt(Infinity, 1)).toBe("–");
  });
});

import { ITEMS } from "../data";
import type { Item } from "./types";
import { bestSet, candidates, score, sourceNote, whyNot } from "./model";

const boss = () => at("boss");
const weightsOf = (s: State) => compute(s).weights;

describe("best set at Dungeon boss defaults (spec section 7)", () => {
  const s = boss();
  const set = bestSet(ITEMS, weightsOf(s), s);
  const EXPECTED_SET: [string, number][] = [
    ["Holy Shroud", 38.69],
    ["Scorn's Icy Choker", 17.52],
    ["Death Speaker Mantle", 25.29],
    ["Darkspear Raider's Cloak", 17.83],
    ["Death Speaker Robes", 39.29],
    ["Spidertank Oilrag", 17.26],
    ["Truefaith Gloves", 20.26],
    ["Blightleaf Rope", 24.54],
    ["Violet Sorcerer's Leggings", 39.54],
    ["Acidic Walkers", 22.83],
    ["Philanthropist's Ring", 18.77],
    ["Sea Giant's Toe Ring", 18.0],
    ["Roogug's Severed Head", 5.69],
    ["Worgenbane Talisman", 5.51],
    ["Tidebringer's Claw", 86.0],
    ["Forcestone Buckler", 25.59],
  ];

  it("picks the spec's items in the spec's fill order with their scores", () => {
    expect(set.rows).toHaveLength(EXPECTED_SET.length);
    EXPECTED_SET.forEach(([name, sc], i) => {
      expect(set.rows[i].item?.name).toBe(name);
      expect(set.rows[i].score).toBeCloseTo(sc, 2);
    });
    expect(set.rows.map((r) => r.slot).slice(10, 14)).toEqual(["Finger", "Finger", "Trinket", "Trinket"]);
  });

  it("takes main hand + off hand over the two-hander and totals 422.62", () => {
    expect(set.useTwo).toBe(false);
    expect(set.pair).toBeCloseTo(111.59, 2);
    expect(set.two).toBeCloseTo(85.17, 2);
    expect(set.twoName).toBe("Wind Spirit Staff");
    expect(set.total).toBeCloseTo(422.62, 2);
    expect(set.weaponNote).toBe("Main hand and off hand beat the best two-hander by 26.4");
  });
});

describe("usability", () => {
  const buckler = ITEMS.find((i) => i.name === "Forcestone Buckler")!;

  it("Alliance never gets a Horde-only item", () => {
    const s = { ...boss(), faction: "Alliance" as const };
    expect(whyNot(buckler, s)).toBe("Horde only");
    const set = bestSet(ITEMS, weightsOf(s), s);
    for (const r of set.rows) if (r.item) expect(r.item.faction).not.toBe("Horde");
    expect(set.rows.find((r) => r.slot === "Off hand")?.item?.name).not.toBe("Forcestone Buckler");
  });

  it("the character's level excludes items that need more", () => {
    const s = { ...boss(), level: 25 };
    for (const r of bestSet(ITEMS, weightsOf(s), s).rows) if (r.item) expect(r.item.req).toBeLessThanOrEqual(25);
    expect(whyNot({ ...buckler, faction: "Both", req: 26 }, s)).toBe("Needs level 26");
  });

  it("checks faction, then level, then profession", () => {
    const it: Item = { ...buckler, faction: "Alliance", req: 99, prof: "Tailoring" };
    expect(whyNot(it, boss())).toBe("Alliance only");
    expect(whyNot({ ...it, faction: "Both" }, boss())).toBe("Needs level 99");
    expect(whyNot({ ...it, faction: "Both", req: 1 }, boss())).toBe("Needs Tailoring");
  });

  it("a profession item is unusable until its profession is ticked", () => {
    const tailor = ITEMS.find((i) => i.prof === "Tailoring" && i.req <= 30 && i.faction !== "Alliance")!;
    expect(whyNot(tailor, boss())).toBe("Needs Tailoring");
    expect(whyNot(tailor, { ...boss(), profs: { Tailoring: true } })).toBe("");
  });

  it("a user item named like an existing ring cannot fill both Finger rows", () => {
    const s = boss();
    const ring = ITEMS.find((i) => i.name === "Philanthropist's Ring")!;
    const mine: Item = { ...ring, id: "u1", slug: "mine", custom: true, heal: 500 };
    const rows = bestSet([...ITEMS, mine], weightsOf(s), s).rows.filter((r) => r.slot === "Finger");
    expect(rows[0].item?.id).toBe("u1");
    expect(rows[1].item?.name).not.toBe(ring.name);
  });

  it("returns a null item for a slot with nothing usable", () => {
    const s = boss();
    const rows = bestSet([], weightsOf(s), s).rows;
    expect(rows.every((r) => r.item === null && r.score === 0)).toBe(true);
  });
});

describe("score, source note and candidates", () => {
  it("counts non-finite weights as 0", () => {
    const it = ITEMS.find((i) => i.mp5 > 0)!;
    const W = { ...weightsOf(boss()), mp5: NaN };
    expect(score(it, W)).toBeCloseTo(score({ ...it, mp5: 0 }, W), 10);
  });

  it("builds the source note without HTML", () => {
    const it = { ...ITEMS[0], source: "Boss", prof: "Engineering", other: "Extra", faction: "Horde" } as Item;
    expect(sourceNote(it)).toBe("Boss · Engineering, maker only to use · Extra · Horde");
    expect(sourceNote({ ...it, prof: undefined, other: undefined, faction: "Both" })).toBe("Boss");
  });

  it("groups by slot in SLOTS order, usable first, top flagged once", () => {
    const s = { ...boss(), showAll: true };
    const groups = candidates(ITEMS, weightsOf(s), s);
    expect(groups[0].slot).toBe("Head");
    for (const g of groups) {
      expect(g.list.filter((c) => c.top)).toHaveLength(g.list.some((c) => !c.why) ? 1 : 0);
      const firstBad = g.list.findIndex((c) => c.why);
      if (firstBad >= 0) expect(g.list.slice(firstBad).every((c) => c.why)).toBe(true);
    }
    const hidden = candidates(ITEMS, weightsOf(s), { ...s, showAll: false });
    for (const g of hidden) expect(g.list.every((c) => !c.why)).toBe(true);
    expect(groups.flatMap((g) => g.list).length).toBeGreaterThan(hidden.flatMap((g) => g.list).length);
  });
});
