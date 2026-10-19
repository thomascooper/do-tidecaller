import wowheadJson from "../data/wowhead.json";
import type { Item } from "./types";

const ICONS = wowheadJson as Record<string, { id: number; icon: string }>;

export const FALLBACK_ICON = "/icons/inv_misc_questionmark.jpg";

/** The item's icon file in `public/icons/` (spec 14.5), or the question mark when it has no entry. */
export function itemIconSrc(item: Pick<Item, "name">): string {
  const entry = ICONS[item.name];
  return entry ? `/icons/${entry.icon}.jpg` : FALLBACK_ICON;
}
