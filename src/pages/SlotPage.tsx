import { Breadcrumbs } from "../components/Breadcrumbs";
import { fmt } from "../lib/format";
import { itemPath } from "../lib/slug";
import { neighbours, slotPath, slotRows, slotTitleCase, topFor, weaponCompare } from "../lib/slotPage";
import type { SlotRow } from "../lib/slotPage";
import type { Item, Slot } from "../lib/types";
import type { Crumb } from "../seo/jsonld";
import { BIS_TRAIL } from "./Bis";

export const slotTrail = (slot: Slot): Crumb[] => [
  ...BIS_TRAIL,
  { name: slotTitleCase(slot), path: slotPath(slot) },
];

export const slotTitle = (slot: Slot) => `Best Resto Shaman ${slotTitleCase(slot)}, Level 30 WoW Forever | Tidecaller`;
export const slotH1 = (slot: Slot) => `Best Resto Shaman ${slot.toLowerCase()} gear, level 30`;

/** Top picks as plain text, shared by the lead sentence and the meta description. */
export function slotPicks(slot: Slot): { horde?: SlotRow; alliance?: SlotRow } {
  const rows = slotRows(slot);
  return { horde: topFor(rows, "Horde"), alliance: topFor(rows, "Alliance") };
}

export function slotDescription(slot: Slot): string {
  const { horde, alliance } = slotPicks(slot);
  const name = slotTitleCase(slot).toLowerCase();
  if (!horde || !alliance) return `Every Resto Shaman ${name} item at level 30 in WoW Forever, scored in points of Healing.`;
  const who =
    horde.item.name === alliance.item.name
      ? `${horde.item.name} for both factions`
      : `${horde.item.name} for Horde, ${alliance.item.name} for Alliance`;
  return `Best Resto Shaman ${name} at level 30 in WoW Forever: ${who}. Scored in points of Healing.`;
}

function where(item: Item): string {
  const bits = [item.source || ""];
  if (item.prof) bits.push(`${item.prof}, maker only${item.prof === "Engineering" ? " to use" : ""}`);
  if (item.other) bits.push(item.other);
  return bits.filter(Boolean).join(" · ");
}

const WEAPON_LINKS: { slot: Slot; text: string }[] = [
  { slot: "Main hand", text: "main hand" },
  { slot: "Off hand", text: "off hand" },
  { slot: "Two-hand", text: "two-hand" },
];

function Weapons({ slot }: { slot: Slot }) {
  const others = WEAPON_LINKS.filter((w) => w.slot !== slot);
  const horde = weaponCompare("Horde");
  const alliance = weaponCompare("Alliance");
  const line = (who: string, w: ReturnType<typeof weaponCompare>) =>
    w.two < 0
      ? `${who}: no two-hander is usable.`
      : `${who}: ${w.twoName} alone scores ${fmt(w.two, 1)}, the best main hand plus the best off hand score ${fmt(w.pair, 1)}, so ${
          w.useTwo ? "the two-hander" : "main hand plus off hand"
        } wins by ${fmt(Math.abs(w.two - w.pair), 1)}.`;
  return (
    <>
      <h2>Two-hander or main hand and off hand?</h2>
      <p>A two-hander fills both hands, so it is compared with the best main hand plus the best off hand (Dungeon boss scores).</p>
      <ul>
        <li>{line("Horde", horde)}</li>
        <li>{line("Alliance", alliance)}</li>
      </ul>
      <p>
        See also the{" "}
        {others.map((o, i) => (
          <span key={o.slot}>
            {i ? " and " : ""}
            <a href={slotPath(o.slot)}>best {o.text}</a>
          </span>
        ))}{" "}
        page.
      </p>
    </>
  );
}

export function SlotPage({ slot }: { slot: Slot }) {
  const rows = slotRows(slot);
  const { horde, alliance } = slotPicks(slot);
  const { prev, next } = neighbours(slot);
  const lower = slot.toLowerCase();
  const both = horde && alliance && horde.item.name === alliance.item.name;
  return (
    <div className="wrap page wide">
      <Breadcrumbs trail={slotTrail(slot)} />
      <h1>{slotH1(slot)}</h1>
      <p className="lead">
        {horde && alliance ? (
          both ? (
            <>
              The best {lower} for a level 30 Resto Shaman is <strong>{horde.item.name}</strong> for both factions, at{" "}
              {fmt(horde.boss, 1)} points of Healing in a Dungeon boss fight.
            </>
          ) : (
            <>
              The best {lower} for a level 30 Resto Shaman is <strong>{horde.item.name}</strong> for Horde (
              {fmt(horde.boss, 1)} points of Healing in a Dungeon boss fight) and <strong>{alliance.item.name}</strong> for
              Alliance ({fmt(alliance.boss, 1)}).
            </>
          )
        ) : (
          <>Every {lower} item below is scored in points of Healing in a Dungeon boss fight.</>
        )}{" "}
        <a href="/">Change the character or fight in the calculator</a> and the ranking follows.
      </p>
      {(slot === "Finger" || slot === "Trinket") && (
        <p>
          You wear two {lower === "finger" ? "rings" : "trinkets"}, so the best two different items are the top two
          you can use. The same item cannot be worn twice.
        </p>
      )}
      {(slot === "Main hand" || slot === "Off hand" || slot === "Two-hand") && <Weapons slot={slot} />}

      <h2>Every {lower} item</h2>
      <div className="scroll">
        <table id="slotItems">
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
              <th>Trash</th>
              <th>Dungeon</th>
              <th>Raid</th>
              <th>Faction</th>
              <th>Where it comes from</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.item.id}>
                <td className="nm">
                  <a href={itemPath(r.item)}>{r.item.name}</a>
                </td>
                <td>{r.item.req}</td>
                <td>{r.item.heal || ""}</td>
                <td>{r.item.sp || ""}</td>
                <td>{r.item.mp5 || ""}</td>
                <td>{r.item.int || ""}</td>
                <td>{r.item.spi || ""}</td>
                <td>{r.item.sta || ""}</td>
                <td className="score">{fmt(r.trash, 1)}</td>
                <td className="score">{fmt(r.boss, 1)}</td>
                <td className="score">{fmt(r.raid, 1)}</td>
                <td>{r.item.faction}</td>
                <td className="src">{where(r.item)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <nav className="slot-nav" aria-label="Other slots">
        <p>
          {prev && (
            <>
              Previous: <a href={slotPath(prev)}>{prev}</a>
              {" · "}
            </>
          )}
          <a href="/bis">All best in slot</a>
          {next && (
            <>
              {" · "}Next: <a href={slotPath(next)}>{next}</a>
            </>
          )}
        </p>
      </nav>
    </div>
  );
}
