import spellsJson from "./spells.json";
import itemsJson from "./items.json";
import wowheadJson from "./wowhead.json";
import itemCritJson from "./itemCrit.json";
import { slugify } from "../lib/slug";
import type { Item, Profession, Slot, Spell } from "../lib/types";

export const SPELLS: Spell[] = spellsJson as Spell[];

export const ITEMS: Item[] = (itemsJson as Omit<Item, "id" | "slug">[]).map((item, i) => ({
  ...item,
  id: `db${i}`,
  slug: slugify(item.name),
}));

/** Item name to Wowhead id and icon (spec 14.5): links and art only, never stats. */
export const WOWHEAD = wowheadJson as Record<string, { id: number; icon: string }>;

/** Item name to the heal crit % it adds (spec 14.8); items not listed have none. */
export const ITEM_CRIT = itemCritJson as Record<string, number>;

export function wowheadUrl(item: Pick<Item, "name">): string | undefined {
  const entry = WOWHEAD[item.name];
  return entry ? `https://www.wowhead.com/forever/item=${entry.id}` : undefined;
}

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
