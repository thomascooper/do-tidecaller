import { describe, expect, it } from "vitest";
import { ITEMS, WOWHEAD } from "../data";
import { siteSet } from "../lib/bis";
import models from "../data/models.json";
import { modelId, racesFor, viewerItems } from "./data";

const entries = Object.entries(models.items);
const SHOWN = ["Head", "Shoulder", "Back", "Chest", "Wrist", "Hands", "Waist", "Legs", "Feet", "Main hand", "Off hand", "Two-hand"];

describe("3D model data (spec 14.10)", () => {
  it("has an entry only for section 12 items with a 14.5 entry, in a slot that shows on a character", () => {
    expect(entries).toHaveLength(119);
    for (const [name, e] of entries) {
      const item = ITEMS.find((i) => i.name === name);
      expect(item, name).toBeDefined();
      expect(WOWHEAD[name], name).toBeDefined();
      expect(SHOWN, name).toContain(item!.slot);
      expect(Number.isInteger(e.display) && e.display > 0, name).toBe(true);
    }
  });

  it("uses the right viewer slot for each item slot", () => {
    const want: Record<string, number[]> = {
      Head: [1], Shoulder: [3], Back: [16], Chest: [5, 20], Wrist: [9], Hands: [10], Waist: [6], Legs: [7], Feet: [8],
      "Main hand": [21], "Two-hand": [21], "Off hand": [22],
    };
    for (const [name, e] of entries) {
      expect(want[ITEMS.find((i) => i.name === name)!.slot], name).toContain(e.slot);
    }
  });

  it("gives no Neck, Finger or Trinket item an entry", () => {
    for (const item of ITEMS.filter((i) => ["Neck", "Finger", "Trinket"].includes(i.slot))) {
      expect(models.items, item.name).not.toHaveProperty(item.name);
    }
  });

  it("holds the pinned values and leaves the items with no model out", () => {
    const items = models.items as Record<string, { display: number; slot: number }>;
    expect(items["Holy Shroud"]).toEqual({ display: 16826, slot: 1 });
    expect(items["Death Speaker Robes"]).toEqual({ display: 12216, slot: 20 });
    expect(items["Tidebringer's Claw"]).toEqual({ display: 741039, slot: 21 });
    expect(items["Forcestone Buckler"]).toEqual({ display: 4403, slot: 22 });
    expect(items["Wind Spirit Staff"]).toEqual({ display: 20325, slot: 21 });
    for (const name of ["Tattered Kirin Tor Cloak", "Roused Nature Footwraps", "Red Wool Cloak", "Darkspear Raider's Cloak"]) {
      expect(items, name).not.toHaveProperty(name);
    }
  });

  it("lists the races and model IDs", () => {
    expect(racesFor("Horde").map((r) => [r.race, r.male, r.female])).toEqual([
      ["Orc", 3, 4], ["Troll", 15, 16], ["Tauren", 11, 12], ["Windshaper Skyborne", 218, 219],
    ]);
    expect(racesFor("Alliance").map((r) => [r.race, r.male, r.female])).toEqual([["Dwarf", 5, 6]]);
    expect(modelId(racesFor("Alliance")[0], "female")).toBe(6);
    expect(modelId(racesFor("Horde")[1], "male")).toBe(15);
  });

  it("draws exactly ten pieces for the default Dungeon boss Horde set, in sheet order", () => {
    expect(viewerItems(siteSet())).toEqual([
      [1, 16826], [3, 11473], [20, 12216], [9, 16901], [10, 13348], [6, 737787], [7, 737498], [8, 4623], [21, 741039], [22, 4403],
    ]);
  });

  it("skips custom items and rows with no item", () => {
    const set = siteSet();
    const custom = { ...set, rows: set.rows.map((r) => (r.slot === "Head" && r.item ? { ...r, item: { ...r.item, custom: true } } : r.slot === "Feet" ? { ...r, item: null } : r)) };
    const out = viewerItems(custom);
    expect(out).toHaveLength(8);
    expect(out.find(([s]) => s === 1 || s === 8)).toBeUndefined();
  });
});
