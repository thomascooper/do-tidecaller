import { fmt } from "../lib/format";
import { priorityLine, STAT_LABELS } from "../lib/model";
import type { Computed, State, StatKey } from "../lib/model";

const BAR_ORDER: StatKey[] = ["mp5", "int", "spi", "heal", "sp", "sta"];

const SUB_LABELS = (ws: boolean): Record<StatKey, string> => ({
  mp5: "gear and buffs",
  int: ws ? "pool, Water Shield and crit" : "15 mana each",
  spi: "regen",
  heal: "heals only",
  sp: "heals and damage",
  sta: "your setting",
});

const FILL_CLASS: Record<StatKey, string> = {
  mp5: "mana",
  int: "mana",
  spi: "mana",
  heal: "heal",
  sp: "heal",
  sta: "stam",
};

export function StatWeights({ state, r }: { state: State; r: Computed }) {
  const W = r.weights;
  const line = priorityLine(W);
  const order = BAR_ORDER.filter((k) => k !== "sta" || W.sta > 0);
  const val = (k: StatKey) => (isFinite(W[k]) ? W[k] : 0);
  const max = Math.max(...order.map(val)) || 1;
  const sub = SUB_LABELS(state.ws);
  const manaBound = r.wf > 0;
  const regime = !isFinite(r.X)
    ? "Pick a rank that still keeps some of its gear bonus."
    : manaBound
      ? `Mana-bound value scaled by ${state.w}%. If you never ran out, mana stats would be worth 0; if you always did, MP5 would be ${fmt(r.raw.mp5, 2)}.`
      : "You set mana as never running out, so only Healing and Spell Power count.";
  const readouts: [string, string, string][] = [
    ["Next 1 Spirit", fmt(r.spiInMP5, 2), "MP5 in this fight"],
    ["1 Intellect", fmt(r.intInMP5, 2), "MP5 in this fight"],
    ["Regen not casting", fmt(r.fullMP5, 1), "MP5"],
    ["Regen casting", fmt(r.castMP5, 1), "MP5"],
    ["Average regen", fmt(r.avgMP5, 1), "MP5"],
    ["Mana for the fight", fmt(r.E, 0), `${fmt(r.casts, 1)} casts`],
    ["Water Shield", fmt(r.wsBack, 1), "mana back per cast"],
  ];
  if (state.critStat) {
    readouts.push(["1% crit", fmt(W.crit, 2), `points of Healing (heals ${fmt(r.critHeal, 2)}, Water Shield ${fmt(W.crit - r.critHeal, 2)})`]);
  }

  return (
    <section className="box" aria-labelledby="h-w">
      <h2 id="h-w">
        Stat weights <small id="wnote">1 Healing = 1.00</small>
      </h2>
      <p className="verdict" id="verdict">
        {line.ok
          ? line.keys.map((k, i) => (
              <span key={k}>
                {i > 0 && (
                  <>
                    {" "}
                    <span className="op">{line.ops[i - 1]}</span>{" "}
                  </>
                )}
                {STAT_LABELS[k]}
              </span>
            ))
          : "No healing power bonus on this rank"}
      </p>
      <p className="regime" id="regime">{regime}</p>
      <div className="bars" id="bars">
        {order.map((k) => (
          <div className="bar" key={k} data-stat={k}>
            <div className="n">
              {STAT_LABELS[k]}
              <small>{sub[k]}</small>
            </div>
            <div className="track">
              <div className={`fill ${FILL_CLASS[k]}`} style={{ width: `${((val(k) / max) * 100).toFixed(1)}%` }} />
            </div>
            <div className="v">{fmt(val(k), 2)}</div>
          </div>
        ))}
      </div>
      <div className="conv" id="conv">
        {readouts.map(([k, v, small]) => (
          <div className="kv" key={k}>
            <div className="k">{k}</div>
            <div className="v">
              {v} <small>{small}</small>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
