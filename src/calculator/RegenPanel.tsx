import { useState } from "react";
import { fmt } from "../lib/format";
import { castingShare, DEFAULT_READINGS, DEFAULTS, fitSpirit, parseReadings } from "../lib/model";
import type { State } from "../lib/model";
import { NumField } from "./NumField";

interface Props {
  state: State;
  set: (patch: Partial<State>) => void;
}

type ToggleKey = "talent" | "icon" | "imphw" | "ws";

export function RegenPanel({ state, set }: Props) {
  const [readings, setReadings] = useState(DEFAULT_READINGS);
  const [sheetN, setSheetN] = useState("");
  const [sheetC, setSheetC] = useState("");

  const fit = fitSpirit(parseReadings(readings));
  const N = parseFloat(sheetN);
  const C = parseFloat(sheetC);
  const share = castingShare(N, C, state.g);
  const isLine = state.smodel === "line";
  const round = (x: number, d: number) => Math.round(x * d) / d;

  const labelled = (text: string, disabled: boolean, field: React.ReactNode) => (
    <div className={disabled ? "pctf off" : "pctf"}>
      <span aria-hidden="true">{text}</span>
      {field}
    </div>
  );

  const toggle = (key: ToggleKey, title: string, desc: string, aria: string, extra?: React.ReactNode) => (
    <div className="tog">
      <div className="t">
        <b>{title}</b>
        <span>{desc}</span>
      </div>
      {extra}
      <label className="sw" htmlFor={key}>
        <input id={key} type="checkbox" aria-label={aria} checked={state[key]} onChange={(e) => set({ [key]: e.target.checked })} />
        <i></i>
      </label>
    </div>
  );

  return (
    <section className="box" aria-labelledby="h-reg">
      <h2 id="h-reg">Regen while casting</h2>
      {toggle(
        "talent",
        "Spirit regen talent",
        "Mindfulness for Shaman. Every caster has one; 3/3 keeps 50%.",
        "Spirit regen talent",
        <>
          {labelled(
            "Kept %",
            !state.talent,
            <NumField
              id="pct"
              className="pct"
              ariaLabel="Share kept while casting, percent"
              min={0}
              max={100}
              step={1}
              list="pcts"
              disabled={!state.talent}
              value={state.pct}
              onCommit={(v) => set({ pct: v })}
            />,
          )}
          <datalist id="pcts">
            <option value="17"></option>
            <option value="33"></option>
            <option value="50"></option>
          </datalist>
        </>,
      )}
      {toggle("icon", "Polished Driftwood Icon", "Relic, +8% kept while casting. Assumed to add to the talent.", "Polished Driftwood Icon")}
      {toggle("imphw", "Improved Healing Wave 5/5", "Healing Wave casts 0.5 sec faster. Affects heals per second only.", "Improved Healing Wave")}
      {toggle(
        "ws",
        "Water Shield",
        "Each heal crit returns 2% of max mana. Uses your crit chance from the Character panel.",
        "Water Shield",
      )}

      <details id="spiritbox">
        <summary>Spirit formula and calibration</summary>
        <div className="grid2">
          <div className="field full">
            <label htmlFor="smodel">Shape</label>
            <select id="smodel" value={state.smodel} onChange={(e) => set({ smodel: e.target.value as State["smodel"] })}>
              <option value="line">Straight line: base plus rate × Spirit</option>
              <option value="curve">Levels off: cap minus B ÷ Spirit</option>
            </select>
          </div>
          <NumField id="sA" label="Cap, MP5" step={0.1} disabled={isLine} value={state.sA} onCommit={(v) => set({ sA: v })} />
          <NumField id="sB" label="B" step={1} disabled={isLine} value={state.sB} onCommit={(v) => set({ sB: v })} />
          <NumField id="sbase" label="Line base, MP5" step={0.1} disabled={!isLine} value={state.sbase} onCommit={(v) => set({ sbase: v })} />
          <NumField id="sper" label="Line MP5 per Spirit" step={0.01} disabled={!isLine} value={state.sper} onCommit={(v) => set({ sper: v })} />
          <p className="hint field full">
            The default is a straight line fitted to eleven level 22 Orc readings from 48 to 90 Spirit: about 0.63 MP5 per
            Spirit, within 0.6 MP5 of every reading. The 43 Spirit reading (no bonus Spirit) sits off the line and is left
            out. Intellect does not change the result. Add a reading per line: your Spirit, then the Spirit tooltip's
            "Mana Regeneration by N per 5 sec while not casting". Lines starting with # are ignored.
          </p>
          <div className="field full">
            <label htmlFor="readings">Readings (Spirit, mana regen)</label>
            <textarea id="readings" rows={9} spellCheck={false} value={readings} onChange={(e) => setReadings(e.target.value)} />
          </div>
          <p className="hint field full">
            Casting share (optional): if your sheet shows total mana regen while casting and not casting, enter both. Gear
            MP5 above is subtracted.
          </p>
          <div className="field">
            <label htmlFor="c3n">Sheet regen not casting</label>
            <input id="c3n" type="number" step={0.1} value={sheetN} onChange={(e) => setSheetN(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="c3c">Sheet regen casting</label>
            <input id="c3c" type="number" step={0.1} value={sheetC} onChange={(e) => setSheetC(e.target.value)} />
          </div>
        </div>
        <p className="calres" id="calres">
          {fit ? (
            <>
              Levels off: cap <b>{fmt(fit.curve.cap, 1)}</b>, B <b>{fmt(fit.curve.B, 0)}</b>, worst miss{" "}
              {fmt(fit.curve.worst, 1)} MP5. Straight line: base <b>{fmt(fit.line.base, 1)}</b>,{" "}
              <b>{fmt(fit.line.rate, 2)}</b> per Spirit, worst miss {fmt(fit.line.worst, 1)} MP5. The tooltip rounds to
              whole numbers, so a worst miss under 1 fits.
            </>
          ) : (
            "Enter at least two readings at different Spirit values."
          )}
          {share !== null && (
            <>
              {" "}
              Casting keeps <b>{fmt(share * 100, 0)}%</b> of Spirit regen.
            </>
          )}
        </p>
        <div className="row" style={{ justifyContent: "flex-start", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <button
            className="btn"
            id="calCurve"
            type="button"
            disabled={!fit}
            onClick={() => fit && set({ smodel: "curve", sA: round(fit.curve.cap, 10), sB: Math.round(fit.curve.B) })}
          >
            Use levels-off fit
          </button>
          <button
            className="btn ghost"
            id="calLine"
            type="button"
            disabled={!fit}
            onClick={() => fit && set({ smodel: "line", sbase: round(fit.line.base, 10), sper: round(fit.line.rate, 1000) })}
          >
            Use straight-line fit
          </button>
          <button
            className="btn ghost"
            id="calShare"
            type="button"
            disabled={share === null}
            onClick={() => share !== null && set({ talent: true, icon: false, pct: Math.round(Math.min(1, Math.max(0, share)) * 100) })}
          >
            Use measured casting share
          </button>
          <button
            className="btn ghost"
            id="calReset"
            type="button"
            onClick={() => set({ smodel: DEFAULTS.smodel, sA: DEFAULTS.sA, sB: DEFAULTS.sB, sbase: DEFAULTS.sbase, sper: DEFAULTS.sper })}
          >
            Restore defaults
          </button>
        </div>
      </details>
    </section>
  );
}
