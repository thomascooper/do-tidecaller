import { DEFAULTS, type State } from "./model";
import { mergeState, userItem } from "./storage";
import type { Item } from "./types";

export const MAX_SHARE_LENGTH = 6000;

export interface ShareCode {
  code: string;
  /** True when the user items did not fit and were left out of the code. */
  itemsOmitted: boolean;
}

export interface Shared {
  state: State;
  items: Item[];
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(code: string): string {
  if (!/^[A-Za-z0-9_-]*$/.test(code)) throw new Error("not base64url");
  const bin = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export function encodeShare(state: State, items: Item[]): ShareCode {
  const s: Record<string, unknown> = {};
  const base = DEFAULTS as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(state)) {
    if (JSON.stringify(v) !== JSON.stringify(base[k])) s[k] = v;
  }
  // a stale pool means nothing while max mana is calculated, and would read as typed in a link without manaAuto
  if (state.manaAuto) delete s.pool;
  const user = items.filter((i) => i.id.charAt(0) === "u");
  const full = toBase64Url(JSON.stringify({ v: 1, s, i: user }));
  if (full.length <= MAX_SHARE_LENGTH) return { code: full, itemsOmitted: false };
  return { code: toBase64Url(JSON.stringify({ v: 1, s, i: [] })), itemsOmitted: user.length > 0 };
}

export function decodeShare(text: string): Shared | null {
  try {
    const data: unknown = JSON.parse(fromBase64Url(text));
    if (typeof data !== "object" || data === null || Array.isArray(data)) return null;
    const d = data as Record<string, unknown>;
    if (d.v !== 1) return null;
    if (typeof d.s !== "object" || d.s === null || Array.isArray(d.s)) return null;
    const items = Array.isArray(d.i)
      ? d.i.map(userItem).filter((i): i is Item => i !== null)
      : [];
    return { state: mergeState(d.s), items };
  } catch {
    return null;
  }
}

