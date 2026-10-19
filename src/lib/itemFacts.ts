import type { Item } from "./types";

type Facts = Pick<Item, "other" | "source">;

const EQUIP_START = /^(\+|Use:|Proc)/;

/** An item's `other` text when it is an equip effect (starts with +, Use: or Proc). */
export function equipText(item: Pick<Item, "other">): string {
  return item.other && EQUIP_START.test(item.other) ? item.other : "";
}

/** An item's `other` text when it is a note rather than an equip effect. */
export function noteText(item: Pick<Item, "other">): string {
  return item.other && !EQUIP_START.test(item.other) ? item.other : "";
}

/** Drops a trailing "(...)" group and the words "trash" or "drop". */
function bare(text: string): string {
  return text
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/\s+(trash|drop)$/, "")
    .trim();
}

/** The place in a quest source: the last "(...)" group or the text after a comma, if it names one. */
function questPlace(rest: string): string {
  const paren = rest.match(/\(([^)]*)\)\s*$/);
  if (paren) {
    const place = paren[1].split(", ")[0].replace(/ final boss$/, "");
    return /^from\b|\d/.test(place) ? "" : place;
  }
  const comma = rest.indexOf(", ");
  return comma >= 0 ? rest.slice(comma + 2) : "";
}

function withPlace(kind: string, place: string): string {
  return place ? `${kind}, ${place}` : kind;
}

/**
 * A short "where": a kind, a place or "kind, place". Derived from `source` alone, and every
 * place is text copied verbatim from it.
 */
export function whereShort(item: Pick<Facts, "source">): string {
  const s = item.source;
  if (s.startsWith("Unknown")) return "Unknown";
  if (s === "World drop / auction house") return "World drop";
  const crafted = s.match(/^Crafted: (\w+)/);
  if (crafted) return `Crafted, ${crafted[1]}`;
  if (s.startsWith("Shaman quest")) return "Shaman quest";
  if (s.startsWith("Quest: ")) return withPlace("Quest", questPlace(s.slice(7)));
  if (/ quest chain, /.test(s)) return withPlace("Quest", s.slice(s.indexOf(", ") + 2));
  if (s.startsWith("Vendor: ")) return withPlace("Vendor", bare(s.slice(s.lastIndexOf(", ") + 2)));
  const rep = s.match(/^(.+?) (vendor|reputation)\b/);
  if (rep) {
    const kind = rep[2] === "vendor" ? "Vendor" : "Reputation";
    const paren = s.match(/\(([^)]*)\)$/);
    const place = rep[2] === "vendor" && paren && paren[1] !== "Classic" ? paren[1] : rep[1];
    return withPlace(kind, place);
  }
  const comma = s.lastIndexOf(", ");
  return bare(comma >= 0 ? s.slice(comma + 2) : s);
}
