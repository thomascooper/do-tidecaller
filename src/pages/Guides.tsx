import { Breadcrumbs } from "../components/Breadcrumbs";
import { fmt } from "../lib/format";
import { compute, DEFAULTS, knownSpells, PRESETS, priorityLine, shareKept, spellCalc, STAT_LABELS } from "../lib/model";
import type { PresetId, State } from "../lib/model";
import { SPELLS } from "../data";
import type { Crumb } from "../seo/jsonld";

export const GUIDES_TRAIL: Crumb[] = [
  { name: "Home", path: "/" },
  { name: "Guides", path: "/guides" },
];

export const STAT_WEIGHTS_TRAIL: Crumb[] = [...GUIDES_TRAIL, { name: "Stat weights", path: "/guides/stat-weights" }];
export const DOWNRANKING_TRAIL: Crumb[] = [...GUIDES_TRAIL, { name: "Downranking", path: "/guides/downranking" }];

export const GUIDE_LIST = [
  {
    path: "/guides/stat-weights",
    title: "How Resto Shaman stat weights work",
    summary: "What a weight means, why mana stats are scaled by how often mana runs out, and the weights for three fights.",
  },
  {
    path: "/guides/downranking",
    title: "Healing Wave downranking",
    summary: "How much of your gear bonus each heal rank keeps at your level, with every rank worked out.",
  },
];

export const GUIDES_DESCRIPTION =
  "Guides to Resto Shaman stat weights and Healing Wave downranking in WoW Forever, with the formulas and worked numbers.";
export const STAT_WEIGHTS_DESCRIPTION =
  "How Resto Shaman stat weights work in WoW Forever: what a weight means, why mana stats depend on your fight, and the weights for three fights.";
export const DOWNRANKING_DESCRIPTION =
  "How Healing Wave downranking works in WoW Forever: the gear bonus each rank keeps at level 20, 25 and 30, with heal and heal per mana for every rank.";

export function Guides() {
  return (
    <div className="wrap page">
      <Breadcrumbs trail={GUIDES_TRAIL} />
      <h1>Resto Shaman guides</h1>
      <p className="lead">
        Short explanations of how the numbers on Tidecaller are made, with real values from the level 30 game data.
      </p>
      <ul className="guide-list">
        {GUIDE_LIST.map((g) => (
          <li key={g.path}>
            <h2>
              <a href={g.path}>{g.title}</a>
            </h2>
            <p>{g.summary}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

const PRESET_IDS: PresetId[] = ["trash", "boss", "raid"];

function presetState(id: PresetId): State {
  return { ...DEFAULTS, t: PRESETS[id].t, f: PRESETS[id].f };
}

export function StatWeightsGuide() {
  const rows = PRESET_IDS.map((id) => {
    const r = compute(presetState(id));
    const line = priorityLine(r.weights);
    return { id, r, line };
  });
  return (
    <div className="wrap page wide">
      <Breadcrumbs trail={STAT_WEIGHTS_TRAIL} />
      <h1>How Resto Shaman stat weights work</h1>
      <p className="lead">
        A stat weight says how much one point of a stat is worth. On Tidecaller every weight is in points of Healing, so
        1 Healing is always 1.00 and a weight of 4 means one point of that stat is worth four points of Healing. Try
        your own numbers in <a href="/">the calculator</a>.
      </p>

      <h2>Why mana stats depend on your fight</h2>
      <p>
        When mana runs out, your total healing is your total mana times your healing per mana. One point of Healing
        adds a little to every heal. One MP5 adds mana, and more mana means more casts. The ratio of the two is the
        raw value of MP5 in points of Healing. Crits and percent talents multiply both sides equally, so they cancel.
      </p>
      <p>
        When mana never runs out, extra mana does nothing, so mana stats are worth 0. That is why the mana weights are
        scaled by how often mana runs out in the fight (the &ldquo;run out of mana&rdquo; slider). At 0% the MP5,
        Intellect and Spirit weights are all 0. At 100% they are the full mana-bound values.
      </p>

      <h2>The weights for three fights</h2>
      <p>
        These use the calculator defaults at level 30 with Healing Wave rank 5 ({DEFAULTS.heal} Healing power,{" "}
        {DEFAULTS.pool} mana, {DEFAULTS.spi} Spirit). Fights differ in length and in how often mana runs out.
      </p>
      <div className="scroll">
        <table id="presetWeights">
          <thead>
            <tr>
              <th>Fight</th>
              <th>Length</th>
              <th>Casting</th>
              <th>Mana runs out</th>
              <th>MP5</th>
              <th>Intellect</th>
              <th>Spirit</th>
              <th>Priority</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ id, r, line }) => (
              <tr key={id}>
                <td className="nm">{PRESETS[id].label}</td>
                <td className="score">{PRESETS[id].t} s</td>
                <td className="score">{PRESETS[id].f}%</td>
                <td className="score">{DEFAULTS.w}%</td>
                <td className="score">{fmt(r.weights.mp5, 2)}</td>
                <td className="score">{fmt(r.weights.int, 2)}</td>
                <td className="score">{fmt(r.weights.spi, 2)}</td>
                <td>
                  {line.keys.map((k, i) => (
                    <span key={k}>
                      {STAT_LABELS[k]}
                      {i < line.ops.length ? ` ${line.ops[i]} ` : ""}
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Casting is the share of the fight spent inside the five-second rule. Mana runs out is the slider that scales
        the mana weights, left at its default of {DEFAULTS.w}% here. The longer the fight, the more each point of mana
        regen is worth.
      </p>

      <h2>What moves the weights</h2>
      <ul>
        <li>
          <strong>Fight length.</strong> Regen over a longer fight adds more mana, and Intellect&rsquo;s 15 mana is
          spread over more seconds, so Intellect is worth less as MP5 the longer the fight lasts.
        </li>
        <li>
          <strong>Time inside the five-second rule.</strong> Spirit regen stops for five seconds after you spend mana,
          except for the share a talent lets through. The more of the fight you spend casting, the less each point of
          Spirit is worth.
        </li>
        <li>
          <strong>The regen talent.</strong> Mindfulness lets 17%, 33% or 50% of Spirit regen continue while casting.
          The more it lets through, the more Spirit is worth. The Polished Driftwood Icon adds 8%, assumed to stack.
        </li>
        <li>
          <strong>Water Shield and crit.</strong> Each crit restores 2% of your maximum mana, so a higher crit chance
          adds to the value of Intellect, which raises your maximum mana.
        </li>
        <li>
          <strong>Stamina.</strong> It does not heal, so its weight is a personal choice you set yourself. It is shown
          only when above 0.
        </li>
      </ul>
      <p>
        Spirit regen itself comes from your own tooltip readings: see the calibration box in{" "}
        <a href="/">the calculator</a>. For which rank to cast, read <a href="/guides/downranking">the downranking guide</a>.
      </p>
    </div>
  );
}

const LEVELS = [20, 25, 30] as const;

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

export function DownrankingGuide() {
  const base: State = { ...DEFAULTS, level: 30, heal: 200 };
  const hw2 = SPELLS.find((s) => s.id === "hw2")!;
  const ranks = SPELLS;
  return (
    <div className="wrap page wide">
      <Breadcrumbs trail={DOWNRANKING_TRAIL} />
      <h1>Healing Wave downranking</h1>
      <p className="lead">
        Casting a lower rank costs less mana, but a rank you learned long ago keeps less and less of your gear bonus as
        you level. This guide shows the rule and the numbers for every rank. The calculator uses the same rule on{" "}
        <a href="/">its heal rank table</a>.
      </p>

      <h2>The rule</h2>
      <p>
        A rank keeps <code>clamp(1 - (L - 17 - T) * 0.05, 0, 1)</code> of its coefficient, where L is your level and T
        is the level the rank is learned. In words: up to level T + 17 the rank keeps all of it, then it loses 5
        percentage points of the gear bonus for every level after that, until nothing is left. This was measured in the
        beta from level 18 to 30.
      </p>
      <p>
        Worked example: Healing Wave rank 2 is learned at level {hw2.lvl}. At level 30, L - 17 - T = 30 - 17 - {hw2.lvl}{" "}
        = {30 - 17 - hw2.lvl}, so it keeps 1 - {30 - 17 - hw2.lvl} * 0.05 = {pct(shareKept(30, hw2.lvl))} of its
        coefficient.
      </p>

      <h2>The coefficient</h2>
      <p>
        A heal&rsquo;s spell coefficient is its base cast time divided by 3.5, with the cast time capped at 3.5 seconds.
        Healing Wave rank 1 casts in 1.5 seconds, so its coefficient is 1.5 / 3.5 = 0.429. Improved Healing Wave
        shortens the cast but not the coefficient. The heal is the average base heal plus the coefficient, times the
        share kept, times your Healing power.
      </p>

      <h2>Every rank</h2>
      <p>
        Gear bonus kept is shown at levels 20, 25 and 30. Heal and heal per mana are at level 30 with 200 Healing
        power, for the ranks known by level 30. Values marked Check are not yet confirmed.
      </p>
      <div className="scroll">
        <table id="rankTable">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Learned</th>
              <th>Base heal</th>
              <th>Mana</th>
              <th>Cast</th>
              <th>Coefficient</th>
              {LEVELS.map((l) => (
                <th key={l}>Kept at {l}</th>
              ))}
              <th>Heal at 30</th>
              <th>Heal per mana</th>
            </tr>
          </thead>
          <tbody>
            {ranks.map((s) => {
              const known = knownSpells(30).includes(s);
              const c = spellCalc(base, s);
              return (
                <tr key={s.id}>
                  <td className="nm">
                    {s.name} {s.rank}
                    {s.warn ? <span className="tag warn">Check</span> : null}
                  </td>
                  <td className="score">{s.lvl}</td>
                  <td className="score">{fmt(s.base, 1)}</td>
                  <td className="score">{s.cost}</td>
                  <td className="score">{fmt(s.cast, 1)} s</td>
                  <td className="score">{fmt(c.coef, 3)}</td>
                  {LEVELS.map((l) => (
                    <td key={l} className="score">
                      {l >= s.lvl ? pct(shareKept(l, s.lvl)) : <span className="dim">not learned</span>}
                    </td>
                  ))}
                  <td className="score">{known ? fmt(c.heal, 1) : <span className="dim">not learned</span>}</td>
                  <td className="score">{known ? fmt(c.hpm, 2) : <span className="dim">not learned</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p>
        Ranks above level 30 are listed for completeness. The right rank to spam depends on your mana as well as your
        heal: the stat weights change with the rank you pick, so compare them in <a href="/">the calculator</a> and
        read <a href="/guides/stat-weights">how stat weights work</a>.
      </p>
    </div>
  );
}
