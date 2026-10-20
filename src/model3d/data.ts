// The 3D character's data (spec 14.10): races, model IDs and the viewer's item list.
// Plain TypeScript with no React and no data/index.ts import, so a standalone script can use it.
import modelsJson from "../data/models.json";
import type { BestSet } from "../lib/model";

export type Gender = "male" | "female";

export interface Race {
  race: string;
  male: number;
  female: number;
}

/** A viewer slot and the item's display ID, as the viewer's `items` option takes them. */
export type ViewerItem = [slot: number, display: number];

const RACES = modelsJson.races as Record<string, Race[]>;
const ITEMS = modelsJson.items as Record<string, { display: number; slot: number }>;

/** The races a faction's Shaman can be, default first (spec 14.10). Both is treated as Horde. */
export function racesFor(faction: string): Race[] {
  return RACES[faction] ?? RACES.Horde;
}

/** The character model ID for a race and gender;. */
export function modelId(race: Race, gender: Gender): number {
  return race[gender];
}

/** Which row of the sheet an item shows on, in the order the viewer is given them. */
const ORDER = ["Head", "Shoulder", "Back", "Chest", "Wrist", "Hands", "Waist", "Legs", "Feet"] as const;

/** The viewer's item list for a set in sheet order; rows with no item, custom items and items with no entry are left out. */
export function viewerItems(set: BestSet): ViewerItem[] {
  const out: ViewerItem[] = [];
  const add = (name: string | undefined, custom: boolean | undefined) => {
    const entry = name && !custom ? ITEMS[name] : undefined;
    if (entry) out.push([entry.slot, entry.display]);
  };
  for (const slot of ORDER) {
    const item = set.rows.find((r) => r.slot === slot)?.item;
    add(item?.name, item?.custom);
  }
  const hand = set.rows.find((r) => r.slot === (set.useTwo ? "Two-hand" : "Main hand"))?.item;
  add(hand?.name, hand?.custom);
  if (!set.useTwo) {
    const off = set.rows.find((r) => r.slot === "Off hand")?.item;
    add(off?.name, off?.custom);
  }
  return out;
}
