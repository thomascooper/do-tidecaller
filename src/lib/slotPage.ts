import { ITEMS, SLOTS } from "../data";
import { compute, PRESETS, score, whyNot } from "./model";
import type { PresetId, State } from "./model";
import { SITE_STATE, siteSet } from "./bis";
import { SLOT_SLUGS } from "./slug";
import type { Item, Slot } from "./types";

export interface SlotRow {
  item: Item;
  trash: number;
  boss: number;
  raid: number;
}

const FIGHTS: PresetId[] = ["trash", "boss", "raid"];

function stateFor(fight: PresetId, faction: State["faction"] = "Horde"): State {
  return { ...SITE_STATE, t: PRESETS[fight].t, f: PRESETS[fight].f, faction };
}

/** Every built-in item in a slot with its score under each fight, best Dungeon boss score first. */
export function slotRows(slot: Slot): SlotRow[] {
  const W = Object.fromEntries(FIGHTS.map((f) => [f, compute(stateFor(f)).weights])) as Record<PresetId, ReturnType<typeof compute>["weights"]>;
  return ITEMS.filter((i) => i.slot === slot)
    .map((item) => ({
      item,
      trash: score(item, W.trash),
      boss: score(item, W.boss),
      raid: score(item, W.raid),
    }))
    .sort((a, b) => b.boss - a.boss);
}

/** The best item a faction can use in a slot (no profession), by Dungeon boss score. */
export function topFor(rows: SlotRow[], faction: "Horde" | "Alliance"): SlotRow | undefined {
  const st = { ...SITE_STATE, faction };
  return rows.find((r) => !whyNot(r.item, st));
}

export function slotTitleCase(slot: Slot): string {
  return slot.replace(/(^|[ -])([a-z])/g, (_, sep: string, c: string) => sep + c.toUpperCase());
}

export const slotPath = (slot: Slot) => `/bis/${SLOT_SLUGS[slot]}`;

export function neighbours(slot: Slot): { prev?: Slot; next?: Slot } {
  const i = SLOTS.indexOf(slot);
  return { prev: SLOTS[i - 1], next: SLOTS[i + 1] };
}

export interface WeaponCompare {
  /** Best main hand plus best off hand and the best two-hander for a faction, from the Dungeon boss set. */
  pair: number;
  two: number;
  twoName: string;
  useTwo: boolean;
}

export function weaponCompare(faction: "Horde" | "Alliance"): WeaponCompare {
  const set = siteSet({ faction });
  return { pair: set.pair, two: set.two, twoName: set.twoName, useTwo: set.useTwo };
}

export { SLOTS };
