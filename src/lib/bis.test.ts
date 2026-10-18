import { describe, expect, it } from "vitest";
import { DEFAULTS } from "./model";
import { setDiff, siteSet, siteWeights } from "./bis";

/** The spec's original character (section 7): max mana typed in as 2223. */
const ORIG = { ...DEFAULTS, manaAuto: false, pool: 2223 };

describe("site best sets", () => {
  it("Horde at the Dungeon boss matches spec section 7", () => {
    const set = siteSet({ over: ORIG });
    expect(set.total).toBeCloseTo(422.62, 2);
    expect(set.rows[0].item?.name).toBe("Holy Shroud");
    expect(set.useTwo).toBe(false);
  });

  it("the defaults (level 30, 115 Intellect, 2,110 mana) match spec section 14.3", () => {
    expect(siteSet().total).toBeCloseTo(428.41, 2);
    expect(siteSet({ faction: "Alliance" }).total).toBeCloseTo(429.74, 2);
  });

  it("Alliance gets its own off hand and no Horde-only item", () => {
    const names = siteSet({ faction: "Alliance" }).rows.map((r) => r.item?.name);
    expect(names).not.toContain("Forcestone Buckler");
    expect(names).toContain("Holy Shroud");
  });

  it("ticking Tailoring changes exactly Feet", () => {
    const d = setDiff(siteSet(), siteSet({ prof: "Tailoring" }));
    expect(d.map((c) => c.slot)).toEqual(["Feet"]);
    expect(d[0].to).toBe("Gilded Slippers");
    expect(d[0].gain).toBeGreaterThan(0);
  });

  it("a ring or trinket swap with the same two items is not a change", () => {
    const d = setDiff(siteSet(), siteSet({ fight: "raid" }));
    expect(d.map((c) => c.slot)).not.toContain("Trinket");
    expect(d.map((c) => c.slot)).toContain("Finger");
  });

  it("a swap for another fight gains in that fight, scored with that fight's weights", () => {
    for (const fight of ["trash", "raid"] as const) {
      const d = setDiff(siteSet(), siteSet({ fight }), siteWeights(fight));
      expect(d.length).toBeGreaterThan(0);
      for (const c of d) expect(c.gain, `${fight} ${c.slot}`).toBeGreaterThan(0);
    }
  });

  it("an unchanged set has no diff", () => {
    expect(setDiff(siteSet(), siteSet())).toEqual([]);
  });
});
