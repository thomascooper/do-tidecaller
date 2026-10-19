import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { ITEMS } from "../data";
import wowhead from "../data/wowhead.json";
import levels from "../data/itemLevels.json";
import { FALLBACK_ICON, itemArmor, itemIconSrc, itemLevel } from "./itemIcon";

describe("itemIconSrc", () => {
  it("names a file in public/icons for all 155 items", () => {
    expect(ITEMS).toHaveLength(155);
    for (const item of ITEMS) {
      const src = itemIconSrc(item);
      expect(existsSync(resolve(__dirname, "../../public", src.slice(1))), `${item.name}: ${src}`).toBe(true);
    }
  });
  it("uses the Wowhead icon, or the question mark without an entry", () => {
    expect(itemIconSrc({ name: "Holy Shroud" })).toBe("/icons/inv_helmet_16.jpg");
    expect(itemIconSrc({ name: "Red Wool Cloak" })).toBe(FALLBACK_ICON);
  });
});

describe("itemLevel and itemArmor (spec 14.6)", () => {
  const byName = new Map(ITEMS.map((i) => [i.name, i]));
  const L = levels as Record<string, { ilvl: number; armor?: number }>;

  it("has an entry for exactly the items in 14.5, all of them real items", () => {
    expect(Object.keys(L).sort()).toEqual(Object.keys(wowhead).sort());
    for (const name of Object.keys(L)) expect(byName.has(name), name).toBe(true);
  });
  it("reads the owner's examples", () => {
    expect(L["Holy Shroud"]).toEqual({ ilvl: 32, armor: 40 });
    expect(itemArmor({ name: "Forcestone Buckler" })).toBe(1078);
    expect(itemLevel({ name: "Reedknot Ring" })).toBe(35);
    expect(itemArmor({ name: "Reedknot Ring" })).toBeUndefined();
  });
  it("has armor exactly for Cloth, Leather and Shield items", () => {
    for (const [name, e] of Object.entries(L)) {
      const type = byName.get(name)!.armor;
      expect(e.armor !== undefined, name).toBe(type === "Cloth" || type === "Leather" || type === "Shield");
    }
  });
  it("never puts an item level below the required level", () => {
    for (const [name, e] of Object.entries(L)) expect(e.ilvl, name).toBeGreaterThanOrEqual(byName.get(name)!.req);
  });
  it("returns undefined for an item with no 14.5 entry", () => {
    expect(itemLevel({ name: "Red Wool Cloak" })).toBeUndefined();
    expect(itemArmor({ name: "Red Wool Cloak" })).toBeUndefined();
  });
});
