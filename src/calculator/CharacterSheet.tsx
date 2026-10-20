import { useEffect, useRef, useState } from "react";
import { createViewer, hasWebGL, type ViewerHandle } from "../model3d/viewer";
import { modelId, racesFor, viewerItems, type Gender } from "../model3d/data";
import { raceFor, readLook, saveLook, type Look } from "../model3d/look";
import { itemIconSrc, itemQuality, RELIC } from "../lib/itemIcon";
import { fmt } from "../lib/format";
import { itemPath } from "../lib/slug";
import type { BestSet } from "../lib/model";
import type { Item } from "../lib/types";

type SheetSlot = "Head" | "Neck" | "Shoulder" | "Back" | "Chest" | "Shirt" | "Tabard" | "Wrist" | "Hands" | "Waist" | "Legs" | "Feet" | "Finger" | "Trinket" | "Main hand" | "Off hand" | "Relic";

const LEFT: SheetSlot[] = ["Head", "Neck", "Shoulder", "Back", "Chest", "Shirt", "Tabard", "Wrist"];
const RIGHT: SheetSlot[] = ["Hands", "Waist", "Legs", "Feet", "Finger", "Finger", "Trinket", "Trinket"];
const BOTTOM: SheetSlot[] = ["Main hand", "Off hand", "Relic"];

interface Props {
  set: BestSet;
  level: number;
  faction: string;
  /** Healing power, max mana and crit chance for the line under the name; left out, the line is not shown. */
  heal?: number;
  maxMana?: number;
  crit?: number;
  /** Whether the Polished Driftwood Icon relic is on. */
  relic: boolean;
  /** What the empty relic slot says; the calculator tells the visitor how to turn the Icon on. */
  relicNote?: string;
}

interface Cell {
  label: string;
  item?: Item;
  score?: number;
  note?: string;
  relic?: boolean;
}

function cells(set: BestSet, relic: boolean, relicNote: string): Cell[] {
  const used = { Finger: 0, Trinket: 0 };
  const rows = set.rows;
  const find = (slot: string, nth = 0) => rows.filter((r) => r.slot === slot)[nth];
  const slots = [...LEFT, ...RIGHT, ...BOTTOM];
  return slots.map((slot): Cell => {
    if (slot === "Shirt" || slot === "Tabard") return { label: slot, note: "Empty" };
    if (slot === "Relic") {
      return relic ? { label: slot, relic: true } : { label: slot, note: relicNote };
    }
    let row;
    if (slot === "Finger" || slot === "Trinket") row = find(slot, used[slot]++);
    else if (slot === "Main hand") row = set.useTwo ? find("Two-hand") : find("Main hand");
    else if (slot === "Off hand") {
      if (set.useTwo) return { label: slot, note: "Two-hand" };
      row = find("Off hand");
    } else row = find(slot);
    return row?.item ? { label: slot, item: row.item, score: row.score } : { label: slot, note: "Empty" };
  });
}

function Slot({ cell, side }: { cell: Cell; side: "l" | "r" | "b" }) {
  const cls = `slot ${side}`;
  if (cell.relic) {
    return (
      <li className={`${cls} q${RELIC.quality}`} data-slot={cell.label}>
        <span className="ic">
          <img src={`/icons/${RELIC.icon}.jpg`} width={40} height={40} alt="" />
        </span>
        <span className="tx">
          <span className="nm">{RELIC.name}</span>
          <span className="sub">Relic</span>
        </span>
      </li>
    );
  }
  if (cell.item) {
    const item = cell.item;
    const q = itemQuality(item);
    return (
      <li className={`${cls} ${q === undefined ? "qn" : "q" + q}`} data-slot={cell.label}>
        <span className="ic">
          <img src={itemIconSrc(item)} width={40} height={40} alt="" loading="lazy" decoding="async" />
        </span>
        <span className="tx">
          {item.custom ? <span className="nm">{item.name}</span> : <a className="nm" href={itemPath(item)}>{item.name}</a>}
          <span className="sub">
            {cell.label} · <b>{fmt(cell.score ?? 0, 1)}</b>
          </span>
        </span>
      </li>
    );
  }
  return (
    <li className={`${cls} empty`} data-slot={cell.label}>
      <span className="ic" />
      <span className="tx">
        <span className="nm">{cell.label}</span>
        <span className="sub">{cell.note}</span>
      </span>
    </li>
  );
}

/** The 3D character over the totem art. Loads when the sheet nears the viewport; any failure leaves the art. */
function Figure({ set, faction }: { set: BestSet; faction: string }) {
  const box = useRef<HTMLDivElement>(null);
  const handle = useRef<ViewerHandle | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [look, setLook] = useState<Look>(readLook);
  const race = raceFor(faction, look);
  const items = viewerItems(set);
  const key = JSON.stringify(items);
  const latest = useRef(items);
  latest.current = items;

  useEffect(() => {
    const el = box.current;
    if (!el || !hasWebGL() || !window.matchMedia("(min-width: 761px)").matches) return;
    let dead = false;
    const model = modelId(race, look.gender);
    const watch = new IntersectionObserver(
      (seen) => {
        if (!seen.some((e) => e.isIntersecting)) return;
        watch.disconnect();
        createViewer(el, model, latest.current).then(
          (h) => {
            if (dead) return h.destroy();
            handle.current = h;
            h.setItems(latest.current);
            setReady(true);
          },
          (e) => {
            setReady(false);
            console.warn("3D character unavailable:", e);
          },
        );
      },
      { rootMargin: "200px" },
    );
    watch.observe(el);
    return () => {
      dead = true;
      watch.disconnect();
      handle.current?.destroy();
      handle.current = undefined;
    };
  }, [race.race, look.gender]);

  useEffect(() => handle.current?.setItems(latest.current), [key]);

  const choose = (next: Look) => {
    setLook(next);
    saveLook(next);
  };

  return (
    <div className={`fig${ready ? " live" : ""}`}>
      <img src="/art/totem-figure.svg" alt="" width={360} height={440} />
      <div className="viewer" ref={box} />
      {ready && (
        <div className="look" role="group" aria-label="Race and gender">
          {racesFor(faction).map((r) => (
            <button key={r.race} type="button" title={r.race} aria-pressed={r.race === race.race} onClick={() => choose({ ...look, race: r.race })}>
              {r.race}
            </button>
          ))}
          {(["male", "female"] as Gender[]).map((g) => (
            <button key={g} type="button" aria-pressed={g === look.gender} onClick={() => choose({ ...look, gender: g })}>
              {g === "male" ? "Male" : "Female"}
            </button>
          ))}
        </div>
      )}
      {ready && <p className="hint">Drag to turn. Ctrl + scroll to zoom.</p>}
    </div>
  );
}

/** The best set laid out like the game's character sheet. Always dark, like the game's frame. */
export function CharacterSheet({ set, level, faction, heal, maxMana, crit, relic, relicNote = "Relic: turn on Polished Driftwood Icon" }: Props) {
  const all = cells(set, relic, relicNote);
  const left = all.slice(0, 8);
  const right = all.slice(8, 16);
  const bottom = all.slice(16);
  const score = (
    <>
      Set score<b className="set-score">{fmt(set.total, 1)}</b>
    </>
  );
  const stats = [
    heal === undefined ? "" : `Healing power ${fmt(heal, 0)}`,
    maxMana === undefined ? "" : `Max mana ${fmt(maxMana, 0)}`,
    crit === undefined ? "" : `Crit chance ${fmt(crit, 1)}%`,
  ].filter(Boolean);
  return (
    <div className="doll" id="sheet" role="group" aria-label="Best set as a character sheet">
      <div className="total phone">{score}</div>
      <div className="grid">
        <ul className="left">
          {left.map((c, n) => (
            <Slot key={n} cell={c} side="l" />
          ))}
        </ul>
        <div className="centre">
          <Figure set={set} faction={faction} />
          <div className="who">
            <div className="t">
              Level {level} Shaman, {faction}
            </div>
            {stats.length > 0 && <div className="s">{stats.join(" · ")}</div>}
            <div className="total">{score}</div>
          </div>
        </div>
        <ul className="right">
          {right.map((c, n) => (
            <Slot key={n} cell={c} side="r" />
          ))}
        </ul>
      </div>
      <div className="bottom">
        <ul>
          {bottom.map((c, n) => (
            <Slot key={n} cell={c} side="b" />
          ))}
        </ul>
      </div>
    </div>
  );
}
