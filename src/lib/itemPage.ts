import { SLOTS } from "../data";
import { itemPath } from "./slug";
import { slotRows } from "./slotPage";
import type { SlotRow } from "./slotPage";
import type { Item } from "./types";

export interface ItemInfo {
  item: Item;
  /** Every built-in item in the slot, best Dungeon boss score first. */
  rows: SlotRow[];
  /** Position of the item in `rows` (0 is first). */
  index: number;
  n: number;
  trash: number;
  boss: number;
  raid: number;
  /** 1-based rank in the slot under each fight; equal scores share a rank. */
  rankTrash: number;
  rankBoss: number;
  rankRaid: number;
}

const rankOf = (values: number[], v: number) => 1 + values.filter((x) => x > v + 1e-9).length;

export function itemInfo(item: Item): ItemInfo {
  const rows = slotRows(item.slot);
  const index = rows.findIndex((r) => r.item.id === item.id);
  const row = rows[index];
  return {
    item,
    rows,
    index,
    n: rows.length,
    trash: row.trash,
    boss: row.boss,
    raid: row.raid,
    rankTrash: rankOf(rows.map((r) => r.trash), row.trash),
    rankBoss: rankOf(rows.map((r) => r.boss), row.boss),
    rankRaid: rankOf(rows.map((r) => r.raid), row.raid),
  };
}

/** Every built-in item with its Dungeon boss score, grouped by slot in `SLOTS` order. */
export function itemsBySlot() {
  return SLOTS.map((slot) => ({ slot, rows: slotRows(slot) })).filter((g) => g.rows.length > 0);
}

