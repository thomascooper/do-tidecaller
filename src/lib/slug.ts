import type { Slot } from "./types";

/** Lowercase, apostrophes removed, every other run of non-alphanumerics becomes "-", trimmed. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const SLOT_SLUGS: Record<Slot, string> = {
  Head: "head",
  Neck: "neck",
  Shoulder: "shoulder",
  Back: "back",
  Chest: "chest",
  Wrist: "wrist",
  Hands: "hands",
  Waist: "waist",
  Legs: "legs",
  Feet: "feet",
  Finger: "finger",
  Trinket: "trinket",
  "Main hand": "main-hand",
  "Off hand": "off-hand",
  "Two-hand": "two-hand",
};

const SLOT_BY_SLUG = Object.fromEntries(
  Object.entries(SLOT_SLUGS).map(([slot, slug]) => [slug, slot as Slot]),
) as Record<string, Slot>;

export function slotFromSlug(slug: string): Slot | undefined {
  return SLOT_BY_SLUG[slug];
}

export const itemPath = (item: { slug: string }) => `/items/${item.slug}`;
