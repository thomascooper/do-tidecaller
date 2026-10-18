import spellsJson from "./spells.json";
import itemsJson from "./items.json";
import { slugify } from "../lib/slug";
import type { Item, Profession, Slot, Spell } from "../lib/types";

export const SPELLS: Spell[] = spellsJson as Spell[];

export const ITEMS: Item[] = (itemsJson as Omit<Item, "id" | "slug">[]).map((item, i) => ({
  ...item,
  id: `db${i}`,
  slug: slugify(item.name),
}));

export const SLOTS: Slot[] = [
  "Head",
  "Neck",
  "Shoulder",
  "Back",
  "Chest",
  "Wrist",
  "Hands",
  "Waist",
  "Legs",
  "Feet",
  "Finger",
  "Trinket",
  "Main hand",
  "Off hand",
  "Two-hand",
];

export const PROFESSIONS: Profession[] = ["Tailoring", "Leatherworking", "Enchanting", "Engineering"];

const BY_SLUG = new Map(ITEMS.map((item) => [item.slug, item]));

export function itemBySlug(slug: string): Item | undefined {
  return BY_SLUG.get(slug);
}
