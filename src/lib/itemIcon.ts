import wowheadJson from "../data/wowhead.json";
import qualityJson from "../data/quality.json";
import levelsJson from "../data/itemLevels.json";
import type { Item } from "./types";

const ICONS = wowheadJson as Record<string, { id: number; icon: string }>;

export const FALLBACK_ICON = "/icons/inv_misc_questionmark.jpg";

/** The item's icon file in `public/icons/` (spec 14.5), or the question mark when it has no entry. */
export function itemIconSrc(item: Pick<Item, "name">): string {
  const entry = ICONS[item.name];
  return entry ? `/icons/${entry.icon}.jpg` : FALLBACK_ICON;
}

const LEVELS = levelsJson as Record<string, { ilvl: number; armor?: number }>;

/** The item's item level (spec 14.6), or undefined without an entry. */
export function itemLevel(item: Pick<Item, "name">): number | undefined {
  return LEVELS[item.name]?.ilvl;
}

/** The item's armor (spec 14.6), or undefined when it has none or no entry. */
export function itemArmor(item: Pick<Item, "name">): number | undefined {
  return LEVELS[item.name]?.armor;
}

const QUALITY = qualityJson.items as Record<string, number>;

/** The item's quality, 0 poor to 5 legendary (spec 14.9), or undefined without an entry. */
export function itemQuality(item: Pick<Item, "name">): number | undefined {
  return QUALITY[item.name];
}

/** The relic slot's Polished Driftwood Icon (spec 14.9). It is not an item in section 12. */
export const RELIC = qualityJson.relic;
