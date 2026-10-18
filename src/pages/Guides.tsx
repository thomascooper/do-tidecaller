import { Breadcrumbs } from "../components/Breadcrumbs";
import { fmt } from "../lib/format";
import { compute, DEFAULTS, effectivePool, knownSpells, PRESETS, priorityLine, shareKept, spellCalc, STAT_LABELS } from "../lib/model";
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
  {
    path: "/guides/spirit-regen",
    title: "Spirit and mana regen",
    summary: "The five-second rule, Mindfulness, the twelve measured Spirit readings and the fitted formula.",
  },
];

export const GUIDES_DESCRIPTION =
  "Guides to Resto Shaman stat weights, Healing Wave downranking and Spirit regen in WoW Forever, with the formulas and worked numbers.";
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
        {fmt(effectivePool(DEFAULTS), 0)} mana, {DEFAULTS.spi} Spirit). Fights differ in length and in how often mana runs out.
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
        Spirit regen itself comes from tooltip readings: read <a href="/guides/spirit-regen">the Spirit and mana regen
        guide</a>, and use the calibration box in <a href="/">the calculator</a> for your own. For which rank to cast, read <a href="/guides/downranking">the downranking guide</a>.
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

export const SPIRIT_REGEN_TRAIL: Crumb[] = [...GUIDES_TRAIL, { name: "Spirit and mana regen", path: "/guides/spirit-regen" }];
export const SPIRIT_REGEN_DESCRIPTION =
  "How Spirit and mana regen work in WoW Forever: the five-second rule, Mindfulness, the measured Spirit readings, the fitted line and what is still unconfirmed.";

/** The owner's twelve tooltip readings (spec section 3), level 22 Orc Shaman, MP5 while not casting. */
const READINGS: [number, number][] = [
  [43, 53], [48, 60], [53, 64], [56, 66], [60, 68], [61, 69], [65, 71], [71, 75], [76, 78], [81, 81], [87, 85], [90, 87],
];
const EXCLUDED_SPIRIT = 43;

const CHART = { w: 640, h: 360, l: 56, r: 16, t: 16, b: 48, x0: 40, x1: 95, y0: 40, y1: 100 };

function cx(spirit: number): number {
  return CHART.l + ((spirit - CHART.x0) / (CHART.x1 - CHART.x0)) * (CHART.w - CHART.l - CHART.r);
}
function cy(mp5: number): number {
  return CHART.h - CHART.b - ((mp5 - CHART.y0) / (CHART.y1 - CHART.y0)) * (CHART.h - CHART.t - CHART.b);
}

function path(f: (s: number) => number): string {
  const pts: string[] = [];
  for (let s = CHART.x0; s <= CHART.x1; s += 1) pts.push(`${pts.length ? "L" : "M"}${cx(s).toFixed(1)} ${cy(f(s)).toFixed(1)}`);
  return pts.join(" ");
}

function SpiritChart() {
  const line = (s: number) => DEFAULTS.sbase + DEFAULTS.sper * s;
  const curve = (s: number) => DEFAULTS.sA - DEFAULTS.sB / s;
  const xs = [40, 50, 60, 70, 80, 90];
  const ys = [40, 50, 60, 70, 80, 90, 100];
  const baseY = CHART.h - CHART.b;
  return (
    <figure className="chart">
      <svg id="spiritChart" viewBox={`0 0 ${CHART.w} ${CHART.h}`} role="img" aria-labelledby="spiritChartT spiritChartD">
        <title id="spiritChartT">Mana regen while not casting against Spirit</title>
        <desc id="spiritChartD">
          Twelve measured readings from 43 to 90 Spirit, rising from 53 to 87 MP5. The straight line 30.5 plus 0.626
          times Spirit stays within 0.6 MP5 of the eleven readings from 48 to 90 Spirit. The levels-off curve 114.0
          minus 2666 divided by Spirit fits worse. The 43 Spirit reading sits off the line and is excluded. The table
          below holds the same data.
        </desc>
        {ys.map((y) => (
          <g key={y}>
            <line className="grid" x1={CHART.l} x2={CHART.w - CHART.r} y1={cy(y)} y2={cy(y)} />
            <text className="tick" x={CHART.l - 8} y={cy(y) + 4} textAnchor="end">{y}</text>
          </g>
        ))}
        {xs.map((x) => (
          <text key={x} className="tick" x={cx(x)} y={baseY + 18} textAnchor="middle">{x}</text>
        ))}
        <line className="axis" x1={CHART.l} x2={CHART.w - CHART.r} y1={baseY} y2={baseY} />
        <line className="axis" x1={CHART.l} x2={CHART.l} y1={CHART.t} y2={baseY} />
        <text className="axis-label" x={(CHART.l + CHART.w - CHART.r) / 2} y={CHART.h - 8} textAnchor="middle">Spirit</text>
        <text className="axis-label" transform={`translate(14 ${(CHART.t + baseY) / 2}) rotate(-90)`} textAnchor="middle">
          MP5 while not casting
        </text>
        <path className="fit-curve" d={path(curve)} fill="none" />
        <path className="fit-line" d={path(line)} fill="none" />
        {READINGS.map(([s, m]) => (
          <circle key={s} className={s === EXCLUDED_SPIRIT ? "pt excluded" : "pt"} cx={cx(s)} cy={cy(m)} r={5} />
        ))}
        <text className="note" x={cx(EXCLUDED_SPIRIT) + 6} y={cy(53) + 24}>43 excluded</text>
        <g transform={`translate(${CHART.l + 14} ${CHART.t + 8})`}>
          <line className="fit-line" x1={0} x2={22} y1={0} y2={0} />
          <text className="note" x={30} y={4}>Line 30.5 + 0.626 × Spirit</text>
          <line className="fit-curve" x1={0} x2={22} y1={18} y2={18} />
          <text className="note" x={30} y={22}>Levels off 114.0 − 2666 ÷ Spirit</text>
        </g>
      </svg>
      <figcaption>
        Measured Spirit readings (points), the fitted line and the levels-off curve. The table below has the same
        numbers.
      </figcaption>
    </figure>
  );
}

export function SpiritRegenGuide() {
  const worstLine = Math.max(...READINGS.filter(([s]) => s !== EXCLUDED_SPIRIT).map(([s, m]) => Math.abs(DEFAULTS.sbase + DEFAULTS.sper * s - m)));
  const worstCurve = Math.max(...READINGS.map(([s, m]) => Math.abs(DEFAULTS.sA - DEFAULTS.sB / s - m)));
  // "Within X" is an upper bound, so round up: 0.55 reads 0.6 and 2.62 reads 2.7, the spec's own figures.
  const upTo1 = (x: number) => fmt(Math.ceil(x * 10 - 1e-9) / 10, 1);
  return (
    <div className="wrap page wide">
      <Breadcrumbs trail={SPIRIT_REGEN_TRAIL} />
      <h1>Spirit and mana regen in Forever</h1>
      <p className="lead">
        What is measured about Spirit and mana regen in the Forever beta, the formula Tidecaller uses for it, and what
        is still unconfirmed.
      </p>

      <h2>The five-second rule and regen while casting</h2>
      <p>
        Mana regen in Forever is continuous: there are no two-second ticks. The five-second rule still applies, so
        regen from Spirit stops for five seconds after you spend mana. Gear MP5 keeps working inside the five-second
        rule: a level 20 mage&apos;s casting regen equalled exactly the staff&apos;s +2 MP5.
      </p>
      <p>
        The Shaman talent Mindfulness lets 17%, 33% or 50% of Spirit regen continue while casting, for 1, 2 or 3
        points. Every healer class has an equivalent talent. The Polished Driftwood Icon, a relic, lets 8% of regen
        continue while casting. Whether it adds to Mindfulness is unconfirmed: Tidecaller assumes it adds, capped at
        100%.
      </p>

      <h2>Intellect and mana</h2>
      <p>
        Intellect does not change Spirit regen: 56 Spirit gave 66 MP5 at both 50 and 64 Intellect. Each point of
        Intellect gives 15 mana.
      </p>

      <h2>The measured readings</h2>
      <p>
        These are readings of the Spirit tooltip, &quot;Mana Regeneration by N per 5 sec while not casting&quot;, from a
        level 22 Orc Shaman. The tooltip rounds to whole numbers.
      </p>
      <SpiritChart />
      <div className="scroll">
        <table id="spiritReadings">
          <thead>
            <tr>
              <th>Spirit</th>
              <th>MP5 not casting</th>
              <th>Line fit</th>
              <th>Levels-off fit</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {READINGS.map(([s, m]) => (
              <tr key={s}>
                <td className="score">{s}</td>
                <td className="score">{m}</td>
                <td className="score">{fmt(DEFAULTS.sbase + DEFAULTS.sper * s, 1)}</td>
                <td className="score">{fmt(DEFAULTS.sA - DEFAULTS.sB / s, 1)}</td>
                <td className="src">{s === EXCLUDED_SPIRIT ? "Excluded: no bonus Spirit, sits off the line" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>The fitted line</h2>
      <p>
        From 48 to 90 Spirit the readings are a straight line: <strong>30.5 + 0.626 × Spirit</strong> MP5, within{" "}
        {upTo1(worstLine)} MP5 of every reading. A worst miss under 1 fits, because the tooltip rounds.
      </p>
      <p>
        The 43 reading has no bonus Spirit and sits off the line, so it is left out of the default fit.
      </p>

      <h2>The levels-off alternative</h2>
      <p>
        Tidecaller also offers a curve that levels off, <strong>114.0 − 2666 ÷ Spirit</strong>, fitted to all twelve
        readings. It fits worse: its worst miss is {upTo1(worstCurve)} MP5. The calibration box in the calculator
        fits both shapes to readings you type in, so you can check them against your own character.
      </p>

      <h2>What is unconfirmed</h2>
      <ul>
        <li>The Spirit rate above 90 Spirit, and at other levels. The readings come from a level 22 character.</li>
        <li>Whether the Polished Driftwood Icon adds to Mindfulness.</li>
      </ul>
      <p>
        Try your own numbers in <a href="/">the calculator</a>, and read{" "}
        <a href="/guides/stat-weights">how stat weights work</a> to see how regen turns into a weight.
      </p>
    </div>
  );
}
