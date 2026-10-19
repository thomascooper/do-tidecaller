import { ITEMS } from "../data";
import { activePreset, calcCrit, calcPool, compute, effectiveCrit, effectivePool, intPerCrit, PRESETS } from "../lib/model";
import type { PresetId } from "../lib/model";
import { fmt } from "../lib/format";
import { BestSet } from "./BestSet";
import { Candidates } from "./Candidates";
import { Footer } from "./Footer";
import { NumField } from "./NumField";
import { RankTable } from "./RankTable";
import { ShareLink } from "./ShareLink";
import { RegenPanel } from "./RegenPanel";
import { StatWeights } from "./StatWeights";
import { WhatItDoes } from "./WhatItDoes";
import { useCalculator } from "./useCalculator";

const PRESET_IDS = Object.keys(PRESETS) as PresetId[];

export function Calculator() {
  const { state, items, dispatch } = useCalculator();
  const set = (patch: Partial<typeof state>) => dispatch({ type: "set", patch });
  const active = activePreset(state);
  const allItems = [...ITEMS, ...items];
  const r = compute(state);
  const pool = calcPool(state);
  const critCalc = calcCrit(state);
  const trim = (x: number, d: number) => String(Number(x.toFixed(d)));

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <h1>Tidecaller Stat Weights</h1>
          <p className="sub">
            Resto Shaman stat weights for WoW Forever, worked out from your own fight. Every number is in points
            of Healing: a weight of 4 means one point of that stat is worth four points of Healing.
          </p>
        </div>
        <div className="scen" role="group" aria-label="Fight presets">
          {PRESET_IDS.map((id) => (
            <button
              key={id}
              className="chip"
              type="button"
              aria-pressed={active === id}
              onClick={() => dispatch({ type: "preset", id })}
            >
              {PRESETS[id].label}
            </button>
          ))}
        </div>
        <ShareLink state={state} items={items} />
      </header>

      <div className="main">
        <div className="rail">
          <section className="box" aria-labelledby="h-char">
            <h2 id="h-char">
              Character <small>from your character sheet</small>
            </h2>
            <div className="grid2">
              <NumField
                id="level"
                label="Level"
                min={1}
                max={60}
                step={1}
                value={state.level}
                onCommit={(v) => set({ level: Math.max(1, Math.min(60, Math.round(v))) })}
              />
              <NumField id="int" label="Intellect" min={0} step={1} value={state.int} onCommit={(v) => set({ int: Math.max(0, Math.round(v)) })} />
              <NumField id="pool" label="Max mana" min={0} step={1} value={effectivePool(state)} onCommit={(v) => set({ pool: v, manaAuto: false })} />
              <p className="hint row-full" id="poolWork" aria-live="polite">
                {state.manaAuto ? (
                  <>
                    Base {fmt(pool.base, 0)} at level {state.level}
                    {pool.estimated && <span className="tag warn">Check</span>}
                    {pool.estimated && " (estimated)"} + {fmt(pool.fromInt, 0)} from {fmt(state.int, 0)} Intellect = {fmt(pool.total, 0)}.
                  </>
                ) : (
                  <>
                    Using your number.{" "}
                    <button type="button" className="chip" onClick={() => set({ manaAuto: true })}>
                      Use calculated ({fmt(pool.total, 0)})
                    </button>
                  </>
                )}
              </p>
              <NumField
                id="crit"
                label="Crit chance, %"
                min={0}
                max={100}
                step={0.1}
                value={Math.round(effectiveCrit(state) * 10) / 10}
                onCommit={(v) => set({ crit: v, critAuto: false })}
              />
              <NumField
                id="critExtra"
                label="Crit from gear and talents, %"
                min={0}
                max={100}
                step={0.5}
                value={state.critExtra}
                onCommit={(v) => set({ critExtra: v })}
              />
              <p className="hint row-full" id="critWork" aria-live="polite">
                {state.critAuto ? (
                  <>
                    Base {trim(critCalc.base, 1)}% + {trim(critCalc.fromInt, 2)}% from {fmt(state.int, 0)} Intellect (
                    {trim(intPerCrit(state.level).value, 1)} per 1%)
                    {critCalc.estimated && (
                      <>
                        {" "}
                        <span className="tag warn">Check</span>
                      </>
                    )}
                    {critCalc.estimated && " (estimated)"} + {trim(critCalc.extra, 2)}% from gear and talents ={" "}
                    {trim(critCalc.total, 2)}%.
                  </>
                ) : (
                  <>
                    Using your number.{" "}
                    <button type="button" className="chip" onClick={() => set({ critAuto: true })}>
                      Use calculated ({trim(critCalc.total, 1)}%)
                    </button>
                  </>
                )}
              </p>
              <p className="hint row-full">Crit from gear and talents: for example Tidebringer's Claw adds 2% to Healing Wave and Lesser Healing Wave.</p>
              <NumField id="heal" label="Healing power" min={0} step={1} value={state.heal} onCommit={(v) => set({ heal: v })} />
              <NumField id="spi" label="Spirit" min={0} step={1} value={state.spi} onCommit={(v) => set({ spi: v })} />
              <NumField id="g" label="Gear MP5" min={0} step={1} value={state.g} onCommit={(v) => set({ g: v })} />
              <NumField id="buff" label="Buff MP5" min={0} step={1} value={state.buff} onCommit={(v) => set({ buff: v })} />
              <p className="hint field full">
                Healing power is Healing plus Spell Power. Spell Damage on healing items does not heal. Buff MP5
                covers Mana Spring, Blessing of Wisdom and similar. Max mana is base mana for your level (Classic's
                documented Shaman values, which a naked level 24 Forever Shaman matches exactly) plus Intellect: the
                first 20 points give 1 mana each, then 15.
              </p>
            </div>
          </section>

          <RegenPanel state={state} set={set} />

          <section className="box" aria-labelledby="h-fight">
            <h2 id="h-fight">Fight</h2>
            <div className="grid2">
              <NumField id="t" label="Length, seconds" min={10} step={5} value={state.t} onCommit={(v) => set({ t: v })} />
              <NumField id="stw" label="Stamina weight" min={0} step={0.05} value={state.stw} onCommit={(v) => set({ stw: v })} />
              <div className="field full">
                <div className="row">
                  <label htmlFor="f">Time inside the five-second rule</label>
                  <span className="lab" id="fOut">{state.f}%</span>
                </div>
                <input id="f" type="range" min={0} max={100} step={5} value={state.f} onChange={(e) => set({ f: Number(e.target.value) })} />
                <p className="hint">Casting once every five seconds counts as 100%, even if you are only casting half the time.</p>
              </div>
              <div className="field full">
                <div className="row">
                  <label htmlFor="w">Fights where you run out of mana</label>
                  <span className="lab" id="wOut">{state.w}%</span>
                </div>
                <input id="w" type="range" min={0} max={100} step={5} value={state.w} onChange={(e) => set({ w: Number(e.target.value) })} />
                <p className="hint">Mana stats only matter when mana is what stops you. If you always finish with mana left, set this to 0.</p>
              </div>
            </div>
          </section>
        </div>

        <div className="out">
          <StatWeights state={state} r={r} />
          <RankTable state={state} set={set} />
        </div>
      </div>

      <BestSet state={state} items={allItems} weights={r.weights} set={set}>
        <Candidates
          state={state}
          items={allItems}
          userItems={items}
          weights={r.weights}
          setUserItems={(next) => dispatch({ type: "items", items: next })}
        />
      </BestSet>

      <WhatItDoes />

      <Footer />
    </div>
  );
}
