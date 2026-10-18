import { Breadcrumbs } from "../components/Breadcrumbs";
import { itemPath } from "../lib/slug";
import { fmt } from "../lib/format";
import { PRESETS, sourceNote } from "../lib/model";
import type { BestSet } from "../lib/model";
import { gainText, PROFESSION_LIST, setDiff, siteSet, siteWeights } from "../lib/bis";
import { SLOTS } from "../data";
import { slotPath } from "../lib/slotPage";
import type { Slot } from "../lib/types";
import type { Crumb } from "../seo/jsonld";

export const BIS_TRAIL: Crumb[] = [
  { name: "Home", path: "/" },
  { name: "Best in slot", path: "/bis" },
];

/** Names of the three highest-scoring Horde picks, for the meta description. */
export function topPicks(): string[] {
  return siteSet()
    .rows.filter((r) => r.item)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((r) => r.item!.name);
}

function SetTable({ id, set }: { id: string; set: BestSet }) {
  return (
    <div className="scroll">
      <table id={id} className="bestset">
        <thead>
          <tr>
            <th>Slot</th>
            <th>Item</th>
            <th>Score</th>
            <th>Where it comes from</th>
          </tr>
        </thead>
        <tbody>
          {set.rows.map((row, n) => (
            <tr key={n}>
              <td className="nm">
                <a href={slotPath(row.slot)}>{row.slot}</a>
              </td>
              <td>{row.item ? <a href={itemPath(row.item)}>{row.item.name}</a> : <span className="dim">Nothing usable listed</span>}</td>
              <td className="score">{row.item ? fmt(row.score, 1) : ""}</td>
              <td className="src">{row.item ? sourceNote(row.item) : ""}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="nm">Total</td>
            <td></td>
            <td className="score">{fmt(set.total, 1)}</td>
            <td className="nm dim">{set.weaponNote}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function Bis() {
  const horde = siteSet();
  const alliance = siteSet({ faction: "Alliance" });
  const fights = (["trash", "raid"] as const).map((id) => ({
    label: PRESETS[id].label,
    changes: setDiff(horde, siteSet({ fight: id }), siteWeights(id)),
  }));
  const crafters = PROFESSION_LIST.map((prof) => ({ prof, changes: setDiff(horde, siteSet({ prof })) }));

  return (
    <div className="wrap page wide">
      <Breadcrumbs trail={BIS_TRAIL} />
      <h1>Resto Shaman best in slot, level 30</h1>
      <p className="lead">
        These are the best usable items for a level 30 Restoration Shaman in World of Warcraft: Forever, with the
        default character and the Dungeon boss fight ({PRESETS.boss.t} seconds, mana empty after {PRESETS.boss.f}%
        of it). Every score is in points of Healing. Your character and fights are different:{" "}
        <a href="/">change them in the calculator</a> and the set updates for you.
      </p>

      <h2>Horde best set</h2>
      <SetTable id="hordeSet" set={horde} />

      <h2>Alliance best set</h2>
      <SetTable id="allianceSet" set={alliance} />

      <h2>Best in slot by slot</h2>
      <p>Every item for one slot, ranked, with the full stats and where it comes from.</p>
      <ul className="slot-list">
        {SLOTS.map((slot: Slot) => (
          <li key={slot}>
            <a href={slotPath(slot)}>{slot}</a>
          </li>
        ))}
      </ul>

      <h2>Does it change for other fights?</h2>
      {fights.map((f) => (
        <div key={f.label}>
          <h3>{f.label}</h3>
          {f.changes.length ? (
            <ul>
              {f.changes.map((c) => (
                <li key={c.slot}>
                  {c.slot}: {c.to} instead of {c.from} ({gainText(c.gain)})
                </li>
              ))}
            </ul>
          ) : (
            <p>No slot changes: the Horde set is the same as for the Dungeon boss.</p>
          )}
        </div>
      ))}

      <h2>Why these weights</h2>
      <p>
        The scores come from the stat weights for this fight. Read <a href="/guides/stat-weights">how Resto Shaman stat
        weights work</a> and <a href="/guides/downranking">how downranking works</a>, and the{" "}
        <a href="/guides/spirit-regen">Spirit and mana regen guide</a>, for the reasoning.
      </p>

      <h2>Crafter upgrades</h2>
      <p>What the Horde set gains when you have the profession (maker only items are usable by the crafter).</p>
      <ul>
        {crafters.map(({ prof, changes }) => (
          <li key={prof}>
            <strong>{prof}:</strong>{" "}
            {changes.length
              ? changes.map((c, i) => (
                  <span key={c.slot}>
                    {i ? "; " : ""}
                    {c.slot}: {c.to} instead of {c.from} ({gainText(c.gain)})
                  </span>
                ))
              : "No change"}
          </li>
        ))}
      </ul>
    </div>
  );
}
