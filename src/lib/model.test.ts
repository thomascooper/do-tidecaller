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
