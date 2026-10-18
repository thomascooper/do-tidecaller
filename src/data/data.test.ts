import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ITEMS, PROFESSIONS, SLOTS, SPELLS, itemBySlug } from "./index";
import { SLOT_SLUGS, slotFromSlug, slugify } from "../lib/slug";
import { extract } from "../../scripts/extract-spec-data.mjs";

const count = <T,>(xs: T[], key: (x: T) => string | undefined) => {
  const out: Record<string, number> = {};
  for (const x of xs) {
    const k = key(x);
    if (k !== undefined) out[k] = (out[k] ?? 0) + 1;
  }
  return out;
};

describe("spells", () => {
  it("has 12 spells with unique ids", () => {
    expect(SPELLS).toHaveLength(12);
    expect(new Set(SPELLS.map((s) => s.id)).size).toBe(12);
  });
});

describe("items", () => {
  it("has 155 items with ids db0..db154 in data order", () => {
    expect(ITEMS).toHaveLength(155);
    expect(ITEMS[0].id).toBe("db0");
    expect(ITEMS[154].id).toBe("db154");
  });

  it("matches the per-slot counts", () => {
    expect(count(ITEMS, (i) => i.slot)).toEqual({
      Hands: 13,
      Neck: 12,
      Shoulder: 12,
      Feet: 12,
      "Off hand": 12,
      Head: 11,
      Back: 11,
      Chest: 11,
      Waist: 11,
      Legs: 11,
      Finger: 11,
      Wrist: 9,
      Trinket: 9,
      "Two-hand": 5,
      "Main hand": 5,
    });
  });

  it("matches the faction and profession counts", () => {
    expect(count(ITEMS, (i) => i.faction)).toEqual({ Both: 117, Alliance: 19, Horde: 19 });
    expect(count(ITEMS, (i) => i.prof)).toEqual({
      Leatherworking: 13,
      Tailoring: 9,
      Engineering: 1,
      Enchanting: 1,
    });
  });

  it("uses only known slots, factions, professions and armor values", () => {
    for (const item of ITEMS) {
      expect(SLOTS).toContain(item.slot);
      expect(["Both", "Horde", "Alliance"]).toContain(item.faction);
      if (item.prof) expect(PROFESSIONS).toContain(item.prof);
      expect(["-", "Cloth", "Leather", "Shield"]).toContain(item.armor);
    }
  });

  it("has unique names and unique slugs", () => {
    expect(new Set(ITEMS.map((i) => i.name)).size).toBe(155);
    expect(new Set(ITEMS.map((i) => i.slug)).size).toBe(155);
  });

  it("looks items up by slug", () => {
    expect(itemBySlug("scorns-icy-choker")?.name).toBe("Scorn's Icy Choker");
    expect(itemBySlug("nope")).toBeUndefined();
  });
});

describe("slugs", () => {
  it("slugifies names", () => {
    expect(slugify("Scorn's Icy Choker")).toBe("scorns-icy-choker");
    expect(slugify("  Sea Giant's Toe-Ring!! ")).toBe("sea-giants-toe-ring");
  });

  it("maps every slot to a slug and back", () => {
    expect(SLOTS).toHaveLength(15);
    for (const slot of SLOTS) expect(slotFromSlug(SLOT_SLUGS[slot])).toBe(slot);
    expect(SLOT_SLUGS["Main hand"]).toBe("main-hand");
  });
});

describe("extractor", () => {
  it("produces exactly the spec's JSON", () => {
    const spec = readFileSync(resolve(__dirname, "../../docs/spec.md"), "utf8");
    const { spells, items } = extract(spec);
    const onDisk = (f: string) => JSON.parse(readFileSync(resolve(__dirname, f), "utf8"));
    expect(onDisk("spells.json")).toEqual(spells);
    expect(onDisk("items.json")).toEqual(items);
    expect(items).toHaveLength(155);
  });
});
