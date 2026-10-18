import { SLOTS, SPELLS } from "../data";
import { fmt } from "./format";
import type { Faction, Item, Profession, Slot, Spell } from "./types";

export type SpiritModel = "line" | "curve";

export interface SpellEdit {
  base?: number;
  cost?: number;
  cast?: number;
}

export interface State {
  level: number;
  /** Intellect, total from the character sheet. */
  int: number;
  /** True while max mana is worked out from level and Intellect; `pool` is used only when false. */
  manaAuto: boolean;
  pool: number;
  heal: number;
  spi: number;
  g: number;
  buff: number;
  talent: boolean;
  pct: number;
  icon: boolean;
  imphw: boolean;
  smodel: SpiritModel;
  sA: number;
  sB: number;
  sbase: number;
  sper: number;
  t: number;
  f: number;
  w: number;
  stw: number;
  spell: string;
  edits: Record<string, SpellEdit>;
  faction: Exclude<Faction, "Both">;
  profs: Partial<Record<Profession, boolean>>;
  showAll: boolean;
  ws: boolean;
  crit: number;
}

export const DEFAULTS: State = {
  level: 30,
  int: 115,
  manaAuto: true,
  pool: 2223,
  heal: 200,
  spi: 107,
  g: 10,
  buff: 0,
  talent: true,
  pct: 50,
  icon: false,
  imphw: true,
  smodel: "line",
  sA: 114.0,
  sB: 2666,
  sbase: 30.5,
  sper: 0.626,
  t: 120,
  f: 90,
  w: 70,
  stw: 0,
  spell: "hw5",
  edits: {},
  faction: "Horde",
  profs: {},
  showAll: false,
  ws: true,
  crit: 5,
};

export type PresetId = "trash" | "boss" | "raid";

export const PRESETS: Record<PresetId, { label: string; t: number; f: number }> = {
  trash: { label: "Trash pull", t: 90, f: 70 },
  boss: { label: "Dungeon boss", t: 120, f: 90 },
  raid: { label: "Raid boss", t: 300, f: 100 },
};

export function activePreset(state: Pick<State, "t" | "f">): PresetId | null {
  for (const id of Object.keys(PRESETS) as PresetId[]) {
    if (PRESETS[id].t === state.t && PRESETS[id].f === state.f) return id;
  }
  return null;
}

function clamp(x: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, x));
}

function num(v: unknown, d: number): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return isFinite(n) ? n : d;
}

/**
 * Base mana of a Shaman by level, as documented for Classic (Wowpedia and the Vanilla WoW Archive,
 * "Base mana", vanilla table). A naked level 24 Forever Shaman matches level 24 exactly (spec section 14.4); other
 * levels are not yet checked in Forever.
 */
export const SHAMAN_BASE_MANA: Record<number, number> = {
  1: 55, 7: 121, 10: 175, 14: 241, 15: 260, 20: 370, 21: 395, 22: 421, 23: 448, 24: 476,
  25: 505, 26: 535, 27: 566, 28: 598, 29: 631, 30: 665, 60: 1520,
};

const BASE_MANA_LEVELS = Object.keys(SHAMAN_BASE_MANA).map(Number).sort((a, b) => a - b);

/** Documented base mana, else a linear estimate between the documented neighbours (level clamped to 1..60). */
export function baseMana(level: number): { value: number; estimated: boolean } {
  const lv = Math.round(clamp(isFinite(level) ? level : 1, 1, 60));
  const known = SHAMAN_BASE_MANA[lv];
  if (known !== undefined) return { value: known, estimated: false };
  const lo = BASE_MANA_LEVELS.filter((l) => l < lv).pop() as number;
  const hi = BASE_MANA_LEVELS.find((l) => l > lv) as number;
  const a = SHAMAN_BASE_MANA[lo];
  const b = SHAMAN_BASE_MANA[hi];
  return { value: Math.round(a + ((b - a) * (lv - lo)) / (hi - lo)), estimated: true };
}

/** The first 20 points of Intellect give 1 mana each, every point after gives 15. */
export function manaFromInt(int: number): number {
  const i = Math.max(0, int);
  return Math.min(20, i) + 15 * Math.max(0, i - 20);
}

export interface PoolCalc {
  base: number;
  fromInt: number;
  total: number;
  estimated: boolean;
}

export function calcPool(state: Pick<State, "level" | "int">): PoolCalc {
  const b = baseMana(state.level);
  const fromInt = manaFromInt(state.int);
  return { base: b.value, fromInt, total: b.value + fromInt, estimated: b.estimated };
}

/** Max mana the model uses: the calculated value, or the typed one while `manaAuto` is false. */
export function effectivePool(state: Pick<State, "level" | "int" | "manaAuto" | "pool">): number {
  return state.manaAuto ? calcPool(state).total : state.pool;
}

export interface EditedSpell extends Spell {
  edited: boolean;
}

export function spellOf(state: Pick<State, "edits">, id: string): EditedSpell {
  const base = SPELLS.find((s) => s.id === id) ?? SPELLS[4];
  const ed = state.edits[base.id] ?? {};
  return {
    ...base,
    base: num(ed.base, base.base),
    cost: num(ed.cost, base.cost),
    cast: num(ed.cast, base.cast),
    edited: !!state.edits[base.id],
  };
}

export function spiritRegen(state: State, spi: number): number {
  const s = Math.max(spi, 1);
  return state.smodel === "line"
    ? Math.max(0, state.sbase + state.sper * s)
    : Math.max(0, state.sA - state.sB / s);
}

export function spiritMarginal(state: State, spi: number): number {
  const s = Math.max(spi, 1);
  return state.smodel === "line" ? state.sper : state.sB / (s * s);
}

export function shareKept(L: number, T: number): number {
  return clamp(1 - (L - 17 - T) * 0.05, 0, 1);
}

export function knownSpells(level: number): Spell[] {
  return SPELLS.filter((s) => s.lvl <= level);
}

/** The spell id actually used: the chosen rank, or the best Healing Wave known at this level. */
export function effectiveSpell(state: Pick<State, "level" | "spell">): string {
  const known = knownSpells(state.level);
  if (known.some((s) => s.id === state.spell)) return state.spell;
  const hw = known.filter((s) => s.id.indexOf("hw") === 0);
  return (hw[hw.length - 1] ?? SPELLS[0]).id;
}

export interface SpellCalc {
  coef: number;
  share: number;
  ce: number;
  heal: number;
  hpm: number;
  hps: number;
}

export function spellCalc(state: State, spell: Spell): SpellCalc {
  const coef = Math.min(spell.cast, 3.5) / 3.5;
  const share = shareKept(state.level, spell.lvl);
  const ce = coef * share;
  const heal = spell.base + ce * state.heal;
  const ct = spell.cast - (state.imphw && spell.id.indexOf("hw") === 0 ? 0.5 : 0);
  const eff = Math.max(ct, 1.5);
  return { coef, share, ce, heal, hpm: heal / spell.cost, hps: heal / eff };
}

export type StatKey = "heal" | "sp" | "mp5" | "int" | "spi" | "sta";
export type Weights = Record<StatKey, number>;

export interface Computed {
  m: number;
  k: number;
  sFull: number;
  fullMP5: number;
  castMP5: number;
  avgMP5: number;
  E: number;
  sp: EditedSpell;
  c: SpellCalc;
  X: number;
  wf: number;
  spiInMP5: number;
  intInMP5: number;
  weights: Weights;
  raw: { mp5: number; int: number; spi: number };
  wsBack: number;
  intWS: number;
  casts: number;
}

export function compute(state: State): Computed {
  let m = state.talent ? clamp(state.pct, 0, 100) / 100 : 0;
  if (state.icon) m += 0.08;
  m = Math.min(m, 1);
  const f = state.f / 100;
  const k = 1 - f * (1 - m);
  const sFull = spiritRegen(state, state.spi);
  const flat = state.g + state.buff;
  const fullMP5 = flat + sFull;
  const castMP5 = flat + sFull * m;
  const avgMP5 = flat + sFull * k;
  const T = Math.max(1, state.t);
  const pool = effectivePool(state);
  const E = pool + (avgMP5 / 5) * T;
  const sp = spellOf(state, effectiveSpell(state));
  const c = spellCalc(state, sp);
  const X = c.ce > 0 ? ((T / 5) * c.heal) / (E * c.ce) : NaN;
  const wf = state.w / 100;
  const spiInMP5 = spiritMarginal(state, state.spi) * k;
  const intInMP5 = 75 / T;
  const pc = clamp(state.crit, 0, 100) / 100;
  const wsBack = state.ws ? pc * 0.02 * pool : 0;
  const cEff = Math.max(1, sp.cost - wsBack);
  const intWS = state.ws && c.ce > 0 ? (c.heal * pc * 0.3) / (c.ce * cEff) : 0;
  const intRaw = intInMP5 * X + intWS;
  return {
    m,
    k,
    sFull,
    fullMP5,
    castMP5,
    avgMP5,
    E,
    sp,
    c,
    X,
    wf,
    spiInMP5,
    intInMP5,
    weights: { heal: 1, sp: 1, mp5: wf * X, int: wf * intRaw, spi: wf * spiInMP5 * X, sta: state.stw },
    raw: { mp5: X, int: intRaw, spi: spiInMP5 * X },
    wsBack,
    intWS,
    casts: E / cEff,
  };
}

export const STAT_LABELS: Record<StatKey, string> = {
  mp5: "MP5",
  int: "Intellect",
  spi: "Spirit",
  heal: "Healing",
  sp: "Spell Power",
  sta: "Stamina",
};

export interface PriorityLine {
  /** Stats from most to least valuable (Stamina only when its weight is above 0). */
  keys: StatKey[];
  /** ops[i] sits between keys[i] and keys[i + 1]. */
  ops: ("=" | ">")[];
  /** False when a weight is not a number (a rank with no healing power bonus). */
  ok: boolean;
}

export function priorityLine(W: Weights): PriorityLine {
  const order = (["mp5", "int", "spi", "heal", "sp", "sta"] as StatKey[]).filter(
    (k) => k !== "sta" || W.sta > 0,
  );
  const ok = order.every((k) => isFinite(W[k]));
  const val = (k: StatKey) => (isFinite(W[k]) ? W[k] : 0);
  const keys = order.slice().sort((a, b) => val(b) - val(a));
  const ops: ("=" | ">")[] = [];
  for (let i = 1; i < keys.length; i++) {
    const prev = val(keys[i - 1]);
    ops.push(Math.abs(prev - val(keys[i])) <= Math.max(0.03, prev * 0.03) ? "=" : ">");
  }
  return { keys, ops, ok };
}

export function score(item: Item, W: Weights): number {
  const f = (v: number) => (isFinite(v) ? v : 0);
  return (
    (item.heal || 0) * f(W.heal) +
    (item.sp || 0) * f(W.sp) +
    (item.mp5 || 0) * f(W.mp5) +
    (item.int || 0) * f(W.int) +
    (item.spi || 0) * f(W.spi) +
    (item.sta || 0) * f(W.sta)
  );
}

type UsableState = Pick<State, "level" | "faction" | "profs">;

/** Empty when the item is usable, otherwise the first reason it is not. */
export function whyNot(item: Item, state: UsableState): string {
  if (item.faction && item.faction !== "Both" && item.faction !== state.faction) return `${item.faction} only`;
  if ((item.req || 0) > state.level) return `Needs level ${item.req}`;
  if (item.prof && !state.profs[item.prof]) return `Needs ${item.prof}`;
  return "";
}

export function sourceNote(item: Item): string {
  const bits = [item.source || ""];
  if (item.prof) bits.push(`${item.prof}, maker only${item.prof === "Engineering" ? " to use" : ""}`);
  if (item.other) bits.push(item.other);
  if (item.faction && item.faction !== "Both") bits.push(item.faction);
  return bits.filter(Boolean).join(" · ");
}

export interface SetRow {
  slot: Slot;
  item: Item | null;
  score: number;
}

export interface BestSet {
  rows: SetRow[];
  total: number;
  useTwo: boolean;
  /** Score of the best main hand plus the best off hand. */
  pair: number;
  /** Score of the best two-hander, or -1 when none is usable. */
  two: number;
  twoName: string;
  weaponNote: string;
}

const SET_ORDER: Slot[] = [
  "Head", "Neck", "Shoulder", "Back", "Chest", "Wrist", "Hands", "Waist", "Legs", "Feet",
  "Finger", "Finger", "Trinket", "Trinket",
];

export function bestSet(items: Item[], W: Weights, state: UsableState): BestSet {
  const ok = items
    .filter((i) => !whyNot(i, state))
    .map((item) => ({ item, s: score(item, W) }));
  const pick = (slot: Slot) => ok.filter((x) => x.item.slot === slot).sort((a, b) => b.s - a.s);
  const mh = pick("Main hand")[0];
  const oh = pick("Off hand")[0];
  const th = pick("Two-hand")[0];
  const pair = (mh ? mh.s : 0) + (oh ? oh.s : 0);
  const two = th ? th.s : -1;
  const useTwo = two > pair;
  const weaponNote =
    th && (mh || oh)
      ? useTwo
        ? `Two-hander beats the best main hand and off hand by ${fmt(two - pair, 1)}`
        : `Main hand and off hand beat the best two-hander by ${fmt(pair - two, 1)}`
      : "";
  const order = SET_ORDER.concat(useTwo ? ["Two-hand"] : ["Main hand", "Off hand"]);
  const used = new Set<string>();
  let total = 0;
  const rows = order.map((slot): SetRow => {
    const x = pick(slot).find((c) => !used.has(c.item.name));
    if (x) {
      used.add(x.item.name);
      total += x.s;
    }
    return { slot, item: x ? x.item : null, score: x ? x.s : 0 };
  });
  return { rows, total, useTwo, pair, two, twoName: th ? th.item.name : "", weaponNote };
}

export interface Candidate {
  item: Item;
  score: number;
  why: string;
  top: boolean;
}

export interface CandidateGroup {
  slot: Slot;
  list: Candidate[];
}

/** Every item by slot: usable first by score, the top usable one flagged. Empty slots are left out. */
export function candidates(items: Item[], W: Weights, state: UsableState & Pick<State, "showAll">): CandidateGroup[] {
  const all = items.map((item) => ({ item, score: score(item, W), why: whyNot(item, state) }));
  const groups: CandidateGroup[] = [];
  for (const slot of SLOTS) {
    const list = all
      .filter((x) => x.item.slot === slot && (state.showAll || !x.why))
      .sort((a, b) => (a.why ? 1 : 0) - (b.why ? 1 : 0) || b.score - a.score)
      .map((x, idx) => ({ ...x, top: idx === 0 && !x.why }));
    if (list.length) groups.push({ slot, list });
  }
  return groups;
}

// Spirit calibration

export interface LsqFit {
  a: number;
  b: number;
  worst: number;
}

export function lsq(xs: number[], ys: number[]): LsqFit {
  const n = xs.length;
  let mx = 0;
  let my = 0;
  for (let i = 0; i < n; i++) {
    mx += xs[i];
    my += ys[i];
  }
  mx /= n;
  my /= n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - mx) * (xs[i] - mx);
    sxy += (xs[i] - mx) * (ys[i] - my);
  }
  const b = sxy / sxx;
  const a = my - b * mx;
  let worst = 0;
  for (let i = 0; i < n; i++) worst = Math.max(worst, Math.abs(ys[i] - (a + b * xs[i])));
  return { a, b, worst };
}

export interface Reading {
  spirit: number;
  mp5: number;
}

export function parseReadings(text: string): Reading[] {
  const out: Reading[] = [];
  for (const line of text.split(/\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) continue;
    const p = trimmed.split(/[\s,;]+/);
    const spirit = parseFloat(p[0]);
    const mp5 = parseFloat(p[1]);
    if (Number.isFinite(spirit) && Number.isFinite(mp5) && spirit > 0) out.push({ spirit, mp5 });
  }
  return out;
}

export interface SpiritFit {
  line: { base: number; rate: number; worst: number };
  curve: { cap: number; B: number; worst: number };
}

/** Unrounded fits; the apply buttons round (base 0.1, rate 0.001, cap 0.1, B integer). */
export function fitSpirit(readings: Reading[]): SpiritFit | null {
  const S = readings.map((r) => r.spirit);
  const M = readings.map((r) => r.mp5);
  if (new Set(S).size < 2) return null;
  const line = lsq(S, M);
  const curve = lsq(S.map((s) => 1 / s), M);
  return {
    line: { base: line.a, rate: line.b, worst: line.worst },
    curve: { cap: curve.a, B: -curve.b, worst: curve.worst },
  };
}

/** Share of Spirit regen kept while casting, from the sheet's two regen figures. */
export function castingShare(N: number, C: number, g: number): number | null {
  if (!Number.isFinite(N) || !Number.isFinite(C) || !(N - g > 0)) return null;
  return (C - g) / (N - g);
}

export const DEFAULT_READINGS = `# 43 53 (no bonus Spirit, sits off the line)
48 60
53 64
56 66
60 68
61 69
65 71
71 75
76 78
81 81
87 85
90 87`;
