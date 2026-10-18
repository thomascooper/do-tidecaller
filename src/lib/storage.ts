import { SLOTS } from "../data";
import { DEFAULTS, type State } from "./model";
import { slugify } from "./slug";
import type { Item, Slot } from "./types";

export const KEY = "tidecaller-weights-v1";

export interface Saved {
  state: State;
  items: Item[];
}

type StorageLike = Pick<Storage, "getItem" | "setItem">;

const STAT_KEYS = ["heal", "sp", "mp5", "int", "spi", "sta"] as const;

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function num(x: unknown): number {
  return typeof x === "number" && Number.isFinite(x) ? x : 0;
}

/** A user item from untrusted JSON (storage or a share link), or null when unusable. */
export function userItem(raw: unknown): Item | null {
  if (!isRecord(raw)) return null;
  const { id, name, slot } = raw;
  if (typeof id !== "string" || id.charAt(0) !== "u") return null;
  if (typeof name !== "string" || !name) return null;
  if (typeof slot !== "string" || !(SLOTS as readonly string[]).includes(slot)) return null;
  const item: Item = {
    id,
    slug: slugify(name),
    name,
    slot: slot as Slot,
    req: 0,
    heal: 0,
    sp: 0,
    mp5: 0,
    int: 0,
    spi: 0,
    sta: 0,
    source: typeof raw.source === "string" ? raw.source : "Added by you",
    faction: raw.faction === "Horde" || raw.faction === "Alliance" ? raw.faction : "Both",
    armor: "-",
    custom: true,
  };
  for (const k of STAT_KEYS) item[k] = num(raw[k]);
  if (typeof raw.req === "number" && Number.isFinite(raw.req)) item.req = raw.req;
  return item;
}

export function oldSpiritDefault(s: Pick<State, "sbase" | "sper" | "sA" | "sB">): boolean {
  return (
    (s.sbase === 37.5 && s.sper === 0.5) ||
    (s.sbase === 32.4 && s.sper === 0.6) ||
    (s.sA === 105.5 && s.sB === 2223) ||
    (s.sA === 107.9 && s.sB === 2347)
  );
}

export function freshDefaults(): State {
  return JSON.parse(JSON.stringify(DEFAULTS)) as State;
}

/** Keeps a value only when its type matches the default's; objects must be plain records. */
export function mergeState(raw: unknown): State {
  const state = freshDefaults();
  if (!isRecord(raw)) return state;
  const target = state as unknown as Record<string, unknown>;
  for (const key of Object.keys(DEFAULTS)) {
    if (!(key in raw)) continue;
    const want = (DEFAULTS as unknown as Record<string, unknown>)[key];
    const v = raw[key];
    if (typeof want === "number") {
      if (typeof v === "number" && Number.isFinite(v)) target[key] = v;
    } else if (typeof want === "boolean") {
      if (typeof v === "boolean") target[key] = v;
    } else if (typeof want === "string") {
      if (typeof v !== "string") continue;
      if (key === "smodel" && v !== "line" && v !== "curve") continue;
      if (key === "faction" && v !== "Horde" && v !== "Alliance") continue;
      target[key] = v;
    } else if (isRecord(v)) {
      target[key] = v;
    }
  }
  return state;
}

export function loadSaved(storage: StorageLike | undefined): Saved {
  const empty: Saved = { state: freshDefaults(), items: [] };
  try {
    if (!storage) return empty;
    const saved: unknown = JSON.parse(storage.getItem(KEY) || "null");
    if (!isRecord(saved)) return empty;
    const state = isRecord(saved.state) ? mergeState(saved.state) : empty.state;
    if (oldSpiritDefault(state)) {
      for (const k of ["smodel", "sA", "sB", "sbase", "sper"] as const) {
        (state as unknown as Record<string, unknown>)[k] = DEFAULTS[k];
      }
    }
    const items = Array.isArray(saved.items)
      ? saved.items.map(userItem).filter((i): i is Item => i !== null)
      : [];
    return { state, items };
  } catch {
    return empty;
  }
}

export function save(storage: StorageLike | undefined, state: State, items: Item[]): void {
  try {
    storage?.setItem(KEY, JSON.stringify({ state, items }));
  } catch {
    // storage unavailable or full: the page keeps working without persistence
  }
}
