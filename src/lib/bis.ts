import { ITEMS } from "../data";
import { fmt } from "./format";
import { bestSet, compute, DEFAULTS, PRESETS } from "./model";
import type { BestSet, PresetId, State } from "./model";
import type { Profession } from "./types";

/** The settings every build-time page uses: the calculator defaults, level 30, the Dungeon boss fight. */
export const SITE_STATE: State = { ...DEFAULTS, t: PRESETS.boss.t, f: PRESETS.boss.f };

export const PROFESSION_LIST: Profession[] = ["Tailoring", "Leatherworking", "Enchanting", "Engineering"];

/** The best set from the built-in items for the site's default character under a fight and faction. */
export function siteSet(opts: { fight?: PresetId; faction?: State["faction"]; prof?: Profession } = {}): BestSet {
  const fight = PRESETS[opts.fight ?? "boss"];
  const state: State = {
    ...SITE_STATE,
    t: fight.t,
    f: fight.f,
    faction: opts.faction ?? "Horde",
    profs: opts.prof ? { [opts.prof]: true } : {},
  };
  return bestSet(ITEMS, compute(state).weights, state);
}

export interface PickChange {
  slot: string;
  from: string;
  to: string;
  gain: number;
}

/** The slots whose picks differ between two sets, with the score change. Ring and trinket pairs compare as sets. */
export function setDiff(base: BestSet, other: BestSet): PickChange[] {
  const bySlot = (set: BestSet) => {
    const m = new Map<string, { names: string[]; score: number }>();
    for (const r of set.rows) {
      const g = m.get(r.slot) ?? { names: [], score: 0 };
      if (r.item) g.names.push(r.item.name);
      g.score += r.score;
      m.set(r.slot, g);
    }
    return m;
  };
  const a = bySlot(base);
  const b = bySlot(other);
  const out: PickChange[] = [];
  for (const [slot, g] of a) {
    const o = b.get(slot);
    if (!o) continue;
    const from = g.names.filter((n) => !o.names.includes(n));
    const to = o.names.filter((n) => !g.names.includes(n));
    if (from.length || to.length) out.push({ slot, from: from.join(" and "), to: to.join(" and "), gain: o.score - g.score });
  }
  return out;
}

export const gainText = (g: number) => `${g >= 0 ? "+" : "-"}${fmt(Math.abs(g), 1)}`;
