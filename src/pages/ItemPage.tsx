import { Breadcrumbs } from "../components/Breadcrumbs";
import { ItemIcon } from "../calculator/ItemIcon";
import { ItemName } from "../calculator/ItemName";
import { wowheadUrl } from "../data";
import { fmt } from "../lib/format";
import { itemInfo, itemsBySlot } from "../lib/itemPage";
import { equipText, whereShort } from "../lib/itemFacts";
import { itemPath } from "../lib/slug";
import { STAT_LABELS } from "../lib/model";
import type { StatKey } from "../lib/model";
import { slotPath } from "../lib/slotPage";
import type { Item } from "../lib/types";
import type { Crumb } from "../seo/jsonld";

export const ITEMS_TRAIL: Crumb[] = [
  { name: "Home", path: "/" },
  { name: "Items", path: "/items" },
];

export const itemTrail = (item: Item): Crumb[] => [...ITEMS_TRAIL, { name: item.name, path: itemPath(item) }];

export const itemTitle = (item: Item) => `${item.name}, Resto Shaman Value | Tidecaller`;

export function itemDescription(item: Item): string {
  const info = itemInfo(item);
  return `${item.name}: ${fmt(info.boss, 1)} points of Healing for a Resto Shaman, ${info.rankBoss} of ${info.n} ${item.slot} items at level 30 in WoW Forever.`;
}

const STAT_ORDER: StatKey[] = ["heal", "sp", "mp5", "int", "spi", "sta"];

const article = (word: string) => (/^[aeiou]/i.test(word) ? "an" : "a");

function factionText(item: Item): string {
  if (item.faction === "Both") return "Both factions can use it.";
  return `${item.faction} only.`;
}

function profText(item: Item): string | null {
  if (!item.prof) return null;
  if (item.prof === "Engineering") return "It needs Engineering to use.";
  return `Only a ${item.prof} crafter can wear it: crafted items with a profession are bind on pickup.`;
}

export function ItemPage({ item }: { item: Item }) {
  const info = itemInfo(item);
  const { rows, index } = info;
  const kind = [item.armor === "-" ? "" : item.armor, item.slot].filter(Boolean).join(" ");
  const stats = STAT_ORDER.filter((k) => item[k] !== 0);
  const top = rows[0];
  const near = [...rows.slice(Math.max(0, index - 3), index), ...rows.slice(index + 1, index + 4)];
  const fights = [
    { label: "Trash pull", score: info.trash, rank: info.rankTrash },
    { label: "Dungeon boss", score: info.boss, rank: info.rankBoss },
    { label: "Raid boss", score: info.raid, rank: info.rankRaid },
  ];
  const prof = profText(item);
  const wowhead = wowheadUrl(item);
  return (
    <div className="wrap page wide">
      <Breadcrumbs trail={itemTrail(item)} />
      <h1 className="item-h1">
        <ItemIcon item={item} size={56} />
        {item.name}
      </h1>
      <p className="lead">
        {item.name} is {article(kind)} {kind} item{" "}
        {item.req > 0 ? `for level ${item.req} and up` : "with no level requirement"}. At Tidecaller&apos;s default settings it
        is worth {fmt(info.boss, 1)} points of Healing to a level 30 Resto Shaman, {info.rankBoss} of {info.n} {item.slot} items.
      </p>

      <h2>Stats</h2>
      {stats.length > 0 && (
        <div className="scroll">
          <table id="itemStats">
            <thead>
              <tr>
                <th>Stat</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((k) => (
                <tr key={k}>
                  <td className="nm">{STAT_LABELS[k]}</td>
                  <td>{item[k]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {item.other && <p>{item.other}</p>}
      {stats.length === 0 && !item.other && <p>This item has no stats that count toward Healing.</p>}

      <h2>By fight</h2>
      <div className="scroll">
        <table id="itemFights">
          <thead>
            <tr>
              <th>Fight</th>
              <th>Score</th>
              <th>Rank in slot</th>
            </tr>
          </thead>
          <tbody>
            {fights.map((f) => (
              <tr key={f.label}>
                <td className="nm">{f.label}</td>
                <td className="score">{fmt(f.score, 1)}</td>
                <td>
                  {f.rank} of {info.n} {item.slot} items
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>Scores are points of Healing for a level 30 Horde Shaman with no professions, at the calculator defaults.</p>

      <h2>Who can use it</h2>
      <ul>
        <li>{factionText(item)}</li>
        <li>{item.req > 0 ? `Needs level ${item.req}.` : "No level requirement."}</li>
        {prof && <li>{prof}</li>}
      </ul>

      <h2>Where it comes from</h2>
      <p>{item.source || "No source is listed."}</p>
      {wowhead && (
        <p>
          <a href={wowhead} target="_blank" rel="noopener noreferrer">
            View {item.name} on Wowhead
          </a>
          . Wowhead&rsquo;s numbers can differ from Tidecaller&rsquo;s, which come from the Forever beta client, build
          1.60.1.
        </p>
      )}

      <h2>In this slot</h2>
      {index === 0 ? (
        <p>
          {item.name} is the top {item.slot} item at the Dungeon boss settings.
        </p>
      ) : (
        <p>
          The top {item.slot} item is <a href={itemPath(top.item)}>{top.item.name}</a> at {fmt(top.boss, 1)}, which is{" "}
          {fmt(top.boss - info.boss, 1)} more than {item.name}.
        </p>
      )}
      {near.length > 0 && (
        <ul id="itemNear">
          {near.map((r) => (
            <li key={r.item.id}>
              <a href={itemPath(r.item)}>{r.item.name}</a> ({fmt(r.boss, 1)})
            </li>
          ))}
        </ul>
      )}
      <p>
        See every <a href={slotPath(item.slot)}>best {item.slot.toLowerCase()} item</a>, or{" "}
        <a href="/">change the character or fight in the calculator</a>.
      </p>
    </div>
  );
}

export const itemsH1 = "Every Resto Shaman item, level 30";
export const ITEMS_TITLE = "Resto Shaman Gear List, Level 30 WoW Forever | Tidecaller";
export const ITEMS_DESCRIPTION =
  "Every Resto Shaman item at level 30 in WoW Forever, grouped by slot and scored in points of Healing, each with its own page.";

export function ItemsIndex() {
  const groups = itemsBySlot();
  return (
    <div className="wrap page wide">
      <Breadcrumbs trail={ITEMS_TRAIL} />
      <h1>{itemsH1}</h1>
      <p className="lead">
        Every item in the game data, grouped by slot. The columns are the required level (Lvl), Intellect (Int), Spirit (Spr),
        Spell Power (SP), Healing (Heal), mana per 5 seconds (MP5), the equip effect, where it comes from and its score. A blank
        cell means none. Scores are points of Healing for a Dungeon boss fight at the calculator defaults. Open an item for its
        full stats and who can use it.
      </p>
      {groups.map((g) => (
        <section key={g.slot}>
          <h2>
            <a href={slotPath(g.slot)}>{g.slot}</a>
          </h2>
          <div className="scroll">
            <table className="items">
              <thead>
                <tr>
                  <th>Item</th>
                  <th><abbr title="Required level">Lvl</abbr></th>
                  <th><abbr title="Intellect">Int</abbr></th>
                  <th><abbr title="Spirit">Spr</abbr></th>
                  <th><abbr title="Spell Power">SP</abbr></th>
                  <th><abbr title="Healing">Heal</abbr></th>
                  <th><abbr title="Mana per 5 seconds">MP5</abbr></th>
                  <th className="src">Equip</th>
                  <th className="src">Where</th>
                  <th><abbr title="Dungeon boss score in points of Healing">Score</abbr></th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r) => {
                  const i = r.item;
                  return (
                    <tr key={i.id}>
                      <td className="nm">
                        <ItemName item={i} />
                        {i.faction !== "Both" && <span className="tag">{i.faction}</span>}
                      </td>
                      <td>{i.req || ""}</td>
                      <td>{i.int || ""}</td>
                      <td>{i.spi || ""}</td>
                      <td>{i.sp || ""}</td>
                      <td>{i.heal || ""}</td>
                      <td>{i.mp5 || ""}</td>
                      <td className="src eq">{equipText(i)}</td>
                      <td className="src wh" title={i.source}>{whereShort(i)}</td>
                      <td className="score">{fmt(r.boss, 1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
