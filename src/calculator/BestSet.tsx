import { ItemName } from "./ItemName";
import type { ReactNode } from "react";
import { ITEMS, PROFESSIONS } from "../data";
import { bestSet, sourceNote } from "../lib/model";
import type { State, Weights } from "../lib/model";
import type { Item } from "../lib/types";
import { fmt } from "../lib/format";

interface Props {
  state: State;
  items: Item[];
  weights: Weights;
  set: (patch: Partial<State>) => void;
  children?: ReactNode;
}

export function BestSet({ state, items, weights, set, children }: Props) {
  const best = bestSet(items, weights, state);

  return (
    <section className="box items" aria-labelledby="h-items">
      <div className="head">
        <div>
          <h2 id="h-items" style={{ margin: 0 }}>
            Best set
          </h2>
          <p id="dbnote">
            {ITEMS.length} candidates from seven Resto Shaman BiS lists, with Forever beta stats (build 1.60.1). The
            best set picks the highest score in each slot from gear you can use, with two rings and two trinkets, and
            checks a two-hander against main hand plus off hand.
          </p>
        </div>
      </div>
      <div className="filters">
        <div className="field">
          <label htmlFor="faction">Faction</label>
          <select id="faction" value={state.faction} onChange={(e) => set({ faction: e.target.value as State["faction"] })}>
            <option>Horde</option>
            <option>Alliance</option>
          </select>
        </div>
        <fieldset className="profs">
          <legend className="lab">Your professions</legend>
          {PROFESSIONS.map((p) => (
            <label key={p}>
              <input
                type="checkbox"
                data-prof={p}
                checked={!!state.profs[p]}
                onChange={(e) => set({ profs: { ...state.profs, [p]: e.target.checked } })}
              />{" "}
              {p}
            </label>
          ))}
        </fieldset>
        <label className="showall">
          <input
            type="checkbox"
            id="showAll"
            checked={state.showAll}
            onChange={(e) => set({ showAll: e.target.checked })}
          />{" "}
          Show gear you can't use
        </label>
      </div>
      <div className="scroll">
        <table id="bestTable">
          <thead>
            <tr>
              <th>Slot</th>
              <th>Pick</th>
              <th>Score</th>
              <th>Where it comes from</th>
            </tr>
          </thead>
          <tbody>
            {best.rows.map((row, n) => (
              <tr key={n}>
                <td className="nm">{row.slot}</td>
                <td>{row.item ? <ItemName item={row.item} /> : <span className="dim">Nothing usable listed</span>}</td>
                <td className="score">{row.item ? fmt(row.score, 1) : ""}</td>
                <td className="src">{row.item ? sourceNote(row.item) : ""}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="nm">Total</td>
              <td></td>
              <td className="score" id="bestTotal">
                {fmt(best.total, 1)}
              </td>
              <td className="nm dim" id="bestWeapon">
                {best.weaponNote}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      {children}
    </section>
  );
}
