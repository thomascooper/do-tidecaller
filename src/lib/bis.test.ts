import { describe, expect, it } from "vitest";
import { setDiff, siteSet } from "./bis";

describe("site best sets", () => {
  it("Horde at the Dungeon boss matches spec section 7", () => {
    const set = siteSet();
    expect(set.total).toBeCloseTo(422.62, 2);
    expect(set.rows[0].item?.name).toBe("Holy Shroud");
    expect(set.useTwo).toBe(false);
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

  it("an unchanged set has no diff", () => {
    expect(setDiff(siteSet(), siteSet())).toEqual([]);
  });
});
