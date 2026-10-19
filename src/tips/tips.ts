// The item popup: one small script on every page, no framework, no third-party request.
// Event delegation on `document` for item links, so links React renders later get popups too.
import items from "../data/items.json";
import { equipText, noteText } from "../lib/itemFacts";
import { itemArmor, itemIconSrc, itemLevel, itemQuality } from "../lib/itemIcon";
import { slugify } from "../lib/slug";
import type { Item } from "../lib/types";

type Fact = Omit<Item, "id" | "slug">;

const BY_SLUG = new Map<string, Fact>((items as Fact[]).map((item) => [slugify(item.name), item]));

const TIP_ID = "item-tip";
const SHOW_DELAY = 80;
const OFFSET = 16;
const MARGIN = 8;
const HAS_HOVER = window.matchMedia("(hover: hover)");

let tip: HTMLElement | null = null;
let current: HTMLAnchorElement | null = null;
let timer = 0;

function itemLink(target: EventTarget | null): HTMLAnchorElement | null {
  if (!(target instanceof Element)) return null;
  const a = target.closest<HTMLAnchorElement>('a[href^="/items/"]');
  return a && BY_SLUG.has(a.getAttribute("href")!.slice(7)) ? a : null;
}

function line(parent: HTMLElement, className: string, text: string): HTMLElement {
  const div = document.createElement("div");
  div.className = className;
  div.textContent = text;
  parent.append(div);
  return div;
}

const PRIMARY: [keyof Fact, string][] = [
  ["int", "Intellect"],
  ["spi", "Spirit"],
  ["sta", "Stamina"],
];
const SECONDARY: [keyof Fact, string, string][] = [
  ["heal", "Healing", "+"],
  ["sp", "Spell Power", "+"],
  ["mp5", "MP5", "+"],
];

function profLine(item: Fact): string {
  if (!item.prof) return "";
  return item.prof === "Engineering" ? "Needs Engineering to use" : `Only a ${item.prof} crafter can wear it`;
}

function build(item: Fact): HTMLElement {
  const el = document.createElement("div");
  el.id = TIP_ID;
  el.className = "tip";
  el.setAttribute("role", "tooltip");
  const head = document.createElement("div");
  head.className = "tip-head";
  const icon = document.createElement("img");
  icon.className = "icon";
  icon.src = itemIconSrc(item);
  const quality = String(itemQuality(item) ?? "none");
  icon.dataset.q = quality;
  icon.width = icon.height = 40;
  icon.alt = "";
  const text = document.createElement("div");
  head.append(icon, text);
  el.append(head);
  line(text, "tip-name", item.name).dataset.q = quality;
  const ilvl = itemLevel(item);
  if (ilvl !== undefined) line(text, "tip-ilvl", `Item Level ${ilvl}`);
  const slot = line(text, "tip-slot", item.slot);
  if (item.armor !== "-") {
    const armor = document.createElement("span");
    armor.textContent = item.armor;
    slot.append(armor);
  }
  const ac = itemArmor(item);
  if (ac !== undefined) line(el, "tip-armor", `${ac} Armor`);
  for (const [key, label] of PRIMARY) if (item[key]) line(el, "tip-stat", `+${item[key]} ${label}`);
  for (const [key, label] of SECONDARY) if (item[key]) line(el, "tip-stat tip-green", `+${item[key]} ${label}`);
  const equip = equipText(item);
  if (equip) line(el, "tip-green", equip);
  if (item.req > 0) line(el, "tip-req", `Requires level ${item.req}`);
  const note = noteText(item);
  if (note) line(el, "tip-muted", note);
  line(el, "tip-muted", `Source: ${item.source}`);
  if (item.faction !== "Both") line(el, "tip-faction", `${item.faction} only`);
  const prof = profLine(item);
  if (prof) line(el, "tip-muted", prof);
  return el;
}

function place(x: number, y: number, avoid: DOMRect | null) {
  if (!tip) return;
  const w = tip.offsetWidth;
  const h = tip.offsetHeight;
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  let left = x + OFFSET;
  let top = y + OFFSET;
  if (left + w > vw - MARGIN) left = (avoid ? avoid.right : x) - OFFSET - w;
  if (top + h > vh - MARGIN) top = (avoid ? avoid.top : y) - OFFSET - h;
  tip.style.left = `${Math.max(MARGIN, Math.min(left, vw - w - MARGIN))}px`;
  tip.style.top = `${Math.max(MARGIN, Math.min(top, vh - h - MARGIN))}px`;
}

function show(a: HTMLAnchorElement, x: number, y: number, avoid: DOMRect | null) {
  hide();
  const item = BY_SLUG.get(a.getAttribute("href")!.slice(7))!;
  tip = build(item);
  document.body.append(tip);
  current = a;
  a.setAttribute("aria-describedby", TIP_ID);
  place(x, y, avoid);
}

function hide() {
  window.clearTimeout(timer);
  tip?.remove();
  tip = null;
  current?.removeAttribute("aria-describedby");
  current = null;
}

document.addEventListener("mouseover", (e) => {
  const a = itemLink(e.target);
  if (!a || a === current || !HAS_HOVER.matches) return;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => show(a, e.clientX, e.clientY, null), SHOW_DELAY);
});

document.addEventListener("mouseout", (e) => {
  const a = itemLink(e.target);
  if (a && !a.contains(e.relatedTarget as Node | null)) hide();
});

document.addEventListener("mousemove", (e) => {
  if (tip && current && current.matches(":hover")) place(e.clientX, e.clientY, null);
});

document.addEventListener("focusin", (e) => {
  const a = itemLink(e.target);
  if (!a) return;
  const r = a.getBoundingClientRect();
  show(a, r.left, r.bottom - OFFSET + 4, r);
});

document.addEventListener("focusout", (e) => {
  if (itemLink(e.target)) hide();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") hide();
});
