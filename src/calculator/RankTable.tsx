import { SPELLS } from "../data";
import { effectiveSpell, knownSpells, spellCalc, spellOf } from "../lib/model";
import type { State } from "../lib/model";
import { fmt } from "../lib/format";
import { NumField } from "./NumField";

interface Props {
  state: State;
  set: (patch: Partial<State>) => void;
}

const rankName = (id: string, rank: number, short: boolean) =>
  (id.indexOf("lhw") === 0 ? (short ? "Lesser HW " : "Lesser Healing Wave ") : "Healing Wave ") + rank;

export function RankTable({ state, set }: Props) {
  const selected = effectiveSpell(state);
  const rows = knownSpells(state.level).map((s) => {
    const sp = spellOf(state, s.id);
    return { sp, c: spellCalc(state, sp) };
  });
  const bestHpm = Math.max(...rows.map((x) => x.c.hpm));
  const cur = spellOf(state, selected);
  const srcText = SPELLS.find((s) => s.id === cur.id)?.src ?? "";

  const edit = (key: "base" | "cost" | "cast") => (v: number) => {
    if (v <= 0) return;
    set({ edits: { ...state.edits, [selected]: { ...state.edits[selected], [key]: v } } });
  };
  const restore = () => {
    const next = { ...state.edits };
    delete next[selected];
    set({ edits: next });
  };

  return (
    <section className="box" aria-labelledby="h-spell">
      <h2 id="h-spell">
        The heal you spam <small>click a row to pick it</small>
      </h2>
      <div className="scroll">
        <table id="ranks">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Learned</th>
              <th>Gear bonus kept</th>
              <th>Heals</th>
              <th>Mana</th>
              <th>Heal per mana</th>
              <th>Heal per sec</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ sp, c }) => {
              const sel = sp.id === selected;
              return (
                <tr
                  key={sp.id}
                  className={"click" + (sel ? " sel" : "")}
                  data-spell={sp.id}
                  tabIndex={0}
                  aria-selected={sel}
                  onClick={() => set({ spell: sp.id })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      set({ spell: sp.id });
                    }
                  }}
                >
                  <td className="nm">
                    {rankName(sp.id, sp.rank, true)}
                    {c.hpm === bestHpm && <span className="tag">Best per mana</span>}
                    {sp.warn && !sp.edited && <span className="tag warn">Check</span>}
                    {sp.edited && <span className="tag mana">Edited</span>}
                  </td>
                  <td>{sp.lvl}</td>
                  <td>{Math.round(c.share * 100)}%</td>
                  <td>{fmt(c.heal, 0)}</td>
                  <td>{sp.cost}</td>
                  <td>{fmt(c.hpm, 2)}</td>
                  <td>{fmt(c.hps, 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <details id="editbox">
        <summary>Edit the selected rank's values</summary>
        <div className="grid2">
          <NumField id="eb" label="Average base heal" step={0.5} value={cur.base} onCommit={edit("base")} />
          <NumField id="ec" label="Mana cost" step={1} value={cur.cost} onCommit={edit("cost")} />
          <NumField id="et" label="Base cast time, sec" step={0.1} value={cur.cast} onCommit={edit("cast")} />
          <div className="field">
            <span className="lab">Source</span>
            <span id="esrc" className="hint" style={{ margin: "6px 0 0" }}>
              {rankName(cur.id, cur.rank, false)}: {srcText}
            </span>
          </div>
        </div>
        <div className="row" style={{ justifyContent: "flex-start", marginTop: 10 }}>
          <button className="btn ghost" id="eReset" type="button" onClick={restore}>
            Restore this rank
          </button>
        </div>
      </details>
    </section>
  );
}
