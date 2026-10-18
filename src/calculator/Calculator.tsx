import { ITEMS } from "../data";
import { activePreset, compute, PRESETS } from "../lib/model";
import type { PresetId } from "../lib/model";
import { BestSet } from "./BestSet";
import { NumField } from "./NumField";
import { RankTable } from "./RankTable";
import { RegenPanel } from "./RegenPanel";
import { StatWeights } from "./StatWeights";
import { useCalculator } from "./useCalculator";

const PRESET_IDS = Object.keys(PRESETS) as PresetId[];

export function Calculator() {
  const { state, items, dispatch } = useCalculator();
  const set = (patch: Partial<typeof state>) => dispatch({ type: "set", patch });
  const active = activePreset(state);
  const r = compute(state);

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
              <NumField id="pool" label="Max mana" min={0} step={1} value={state.pool} onCommit={(v) => set({ pool: v })} />
              <NumField id="heal" label="Healing power" min={0} step={1} value={state.heal} onCommit={(v) => set({ heal: v })} />
              <NumField id="spi" label="Spirit" min={0} step={1} value={state.spi} onCommit={(v) => set({ spi: v })} />
              <NumField id="g" label="Gear MP5" min={0} step={1} value={state.g} onCommit={(v) => set({ g: v })} />
              <NumField id="buff" label="Buff MP5" min={0} step={1} value={state.buff} onCommit={(v) => set({ buff: v })} />
              <p className="hint field full">
                Healing power is Healing plus Spell Power. Spell Damage on healing items does not heal. Buff MP5
                covers Mana Spring, Blessing of Wisdom and similar.
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

      <BestSet state={state} items={[...ITEMS, ...items]} weights={r.weights} set={set} />
    </div>
  );
}
