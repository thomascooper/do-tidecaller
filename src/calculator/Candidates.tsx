import { ItemName } from "./ItemName";
import { useState } from "react";
import type { FormEvent } from "react";
import { SLOTS } from "../data";
import { candidates, sourceNote } from "../lib/model";
import type { State, Weights } from "../lib/model";
import { slugify } from "../lib/slug";
import type { Item, Slot } from "../lib/types";
import { fmt } from "../lib/format";

interface Props {
  state: State;
  items: Item[];
  userItems: Item[];
  weights: Weights;
  setUserItems: (items: Item[]) => void;
}

const STAT_FIELDS = [
  ["heal", "Healing"],
  ["sp", "Spell Pwr"],
  ["mp5", "MP5"],
  ["int", "Int"],
  ["spi", "Spirit"],
  ["sta", "Stam"],
] as const;

type StatKey = (typeof STAT_FIELDS)[number][0];
const EMPTY_STATS: Record<StatKey, string> = { heal: "", sp: "", mp5: "", int: "", spi: "", sta: "" };

const stat = (v: number) => (v ? fmt(v, 0) : <span className="dim">·</span>);

export function Candidates({ state, items, userItems, weights, setUserItems }: Props) {
  const groups = candidates(items, weights, state);
  const [name, setName] = useState("");
  const [slot, setSlot] = useState<Slot>(SLOTS[0]);
  const [stats, setStats] = useState(EMPTY_STATS);

  const add = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const n = (v: string) => (Number.isFinite(Number(v)) && v.trim() !== "" ? Number(v) : 0);
    const item: Item = {
      id: "u" + Date.now(),
      slug: slugify(trimmed),
      name: trimmed,
      slot,
      req: 0,
      heal: n(stats.heal),
      sp: n(stats.sp),
      mp5: n(stats.mp5),
      int: n(stats.int),
      spi: n(stats.spi),
      sta: n(stats.sta),
      source: "Added by you",
      faction: "Both",
      armor: "-",
      custom: true,
    };
    setUserItems([...userItems, item]);
    setName("");
    setStats(EMPTY_STATS);
    document.getElementById("a-name")?.focus();
  };

  return (
    <>
      <h2 id="h-cand" style={{ margin: "22px 0 4px" }}>
        Every candidate <small>score is in points of Healing</small>
      </h2>
      <details className="addbox">
        <summary>Add your own item</summary>
        <form className="add" id="addForm" autoComplete="off" onSubmit={add}>
          <div className="field nmf">
            <label htmlFor="a-name">Item</label>
            <input id="a-name" type="text" placeholder="Item name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="a-slot">Slot</label>
            <select id="a-slot" value={slot} onChange={(e) => setSlot(e.target.value as Slot)}>
              {SLOTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          {STAT_FIELDS.map(([key, label]) => (
            <div className="field" key={key}>
              <label htmlFor={`a-${key}`}>{label}</label>
              <input
                id={`a-${key}`}
                type="number"
                step={1}
                value={stats[key]}
                onChange={(e) => setStats({ ...stats, [key]: e.target.value })}
              />
            </div>
          ))}
          <button className="btn" type="submit">
            Add item
          </button>
        </form>
      </details>
      <div className="scroll">
        <table id="itemTable">
          <thead>
            <tr>
              <th>Item</th>
              <th>Req</th>
              <th>Healing</th>
              <th>Spell Pwr</th>
              <th>MP5</th>
              <th>Int</th>
              <th>Spirit</th>
              <th>Stam</th>
              <th>Score</th>
              <th>Where it comes from</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 && (
              <tr>
                <td colSpan={11} className="nm dim">
                  Nothing usable with these filters.
                </td>
              </tr>
            )}
            {groups.map((g) => [
              <tr className="slotgrp" key={g.slot}>
                <td className="slot" colSpan={11}>
                  {g.slot}
                </td>
              </tr>,
              ...g.list.map(({ item: i, score, why, top }) => (
                <tr key={i.id} className={(top ? "best" : "") + (why ? " cant" : "")}>
                  <td className="nm">
                    <ItemName item={i} />
                    {top && <span className="tag">Top</span>}
                    {i.custom && <span className="tag mana">Yours</span>}
                  </td>
                  <td>{i.req ? i.req : <span className="dim">·</span>}</td>
                  <td>{stat(i.heal)}</td>
                  <td>{stat(i.sp)}</td>
                  <td>{stat(i.mp5)}</td>
                  <td>{stat(i.int)}</td>
                  <td>{stat(i.spi)}</td>
                  <td>{stat(i.sta)}</td>
                  <td className="score">{fmt(score, 1)}</td>
                  <td className="src">
                    {why && (
                      <>
                        <span className="why">{why}</span> ·{" "}
                      </>
                    )}
                    {sourceNote(i)}
                  </td>
                  <td>
                    {i.custom && (
                      <button
                        className="x"
                        type="button"
                        data-del={i.id}
                        aria-label={`Remove ${i.name}`}
                        onClick={() => setUserItems(userItems.filter((u) => u.id !== i.id))}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              )),
            ])}
          </tbody>
        </table>
      </div>
    </>
  );
}
