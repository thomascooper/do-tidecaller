import { describe, expect, it } from "vitest";
import items from "../data/items.json";
import type { Item } from "./types";
import { equipText, noteText, whereShort } from "./itemFacts";

const ALL = items as unknown as Item[];
const byName = (name: string) => {
  const item = ALL.find((i) => i.name === name);
  if (!item) throw new Error(`no item ${name}`);
  return item;
};

const WHERE: [string, string][] = [
  ["World drop / auction house", "World drop"],
  ["Crafted: Tailoring 125 (pattern drops in RFK)", "Crafted, Tailoring"],
  ["Crafted: Tailoring (bind on equip)", "Crafted, Tailoring"],
  ["Quest: Wanted! Marez Cowl (Arathi)", "Quest, Arathi"],
  ["Quest: A Vengeful Fate (RFK, from 29)", "Quest, RFK"],
  ["Quest: Solution to Doom (from 30)", "Quest"],
  ["Quest: Rig Wars (Gnomeregan final boss)", "Quest, Gnomeregan"],
  ["Quest: Greater Friend of the Library (20 books)", "Quest"],
  ["Quest: Elder Knowledge, Excavation Site: Wetlands", "Quest, Excavation Site: Wetlands"],
  ["Quest: Data Rescue", "Quest"],
  ["Shaman quest: The Tempest's Weapons (from 30)", "Shaman quest"],
  ["Myzrael quest chain, Arathi", "Quest, Arathi"],
  ["Fallen Champion (rare), SM Graveyard", "SM Graveyard"],
  ["Scorn, SM Graveyard (Classic event boss)", "SM Graveyard"],
  ["Scarlet Monastery trash", "Scarlet Monastery"],
  ["Gnomeregan trash (rare)", "Gnomeregan"],
  ["City of Dalaran drop", "City of Dalaran"],
  ["Vendor: Gezzy Gunkgear, Booty Bay", "Vendor, Booty Bay"],
  ["Defilers vendor (Arathi Basin)", "Vendor, Arathi Basin"],
  ["Darkspear Raiders vendor", "Vendor, Darkspear Raiders"],
  ["Warsong Outriders reputation (Classic)", "Reputation, Warsong Outriders"],
  ["Unknown (bind on equip)", "Unknown"],
];

describe("whereShort", () => {
  it.each(WHERE)("%s -> %s", (source, expected) => {
    const item = ALL.find((i) => i.source === source);
    expect(item, `an item with source ${source}`).toBeDefined();
    expect(whereShort(item!)).toBe(expected);
  });

  const KINDS = ["World drop", "Quest", "Shaman quest", "Vendor", "Reputation", "Unknown"];

  it("is a known shape and never invents a place, for all 155 items", () => {
    expect(ALL).toHaveLength(155);
    for (const item of ALL) {
      const where = whereShort(item);
      if (KINDS.includes(where)) continue;
      const crafted = where.match(/^Crafted, (.+)$/);
      if (crafted) {
        expect(item.source, item.name).toContain(crafted[1]);
        continue;
      }
      const kindPlace = KINDS.find((k) => where.startsWith(`${k}, `));
      const place = kindPlace ? where.slice(kindPlace.length + 2) : where;
      expect(place, item.name).not.toBe("");
      expect(item.source, item.name).toContain(place);
    }
  });
});

describe("equipText and noteText", () => {
  it("gives every item with `other` exactly one of the two", () => {
    for (const item of ALL) {
      const set = [equipText(item), noteText(item)].filter(Boolean);
      expect(set, item.name).toHaveLength(item.other ? 1 : 0);
      if (item.other) expect(set[0]).toBe(item.other);
    }
  });

  it("splits the named examples", () => {
    expect(equipText(byName("Tidebringer's Claw"))).toBe("+2% crit on Healing Wave and Lesser Healing Wave");
    expect(equipText(byName("Satchel of Potions"))).toBe("Use: random potion");
    expect(equipText(byName("Painwalker Buckler"))).toBe("Proc when struck: 12 mp5 for 10 sec");
    expect(noteText(byName("Ghostly Mantle"))).toBe("Nerfed Oct 8");
    expect(noteText(byName("Runemender's Seal"))).toBe("Unique");
    expect(equipText(byName("Ghostly Mantle"))).toBe("");
  });
});
