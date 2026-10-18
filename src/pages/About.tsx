import { Breadcrumbs } from "../components/Breadcrumbs";
import type { Crumb } from "../seo/jsonld";
import { DATA_UPDATED, DATA_VERSION } from "../site";

export const ABOUT_TRAIL: Crumb[] = [
  { name: "Home", path: "/" },
  { name: "About", path: "/about" },
];

const SOURCES: { name: string; url?: string; note: string }[] = [
  {
    name: "ForeverChanges: Resto Shaman BiS",
    url: "https://foreverchanges.pro/bis/shaman/restoration",
    note: "item tooltips and Resto best in slot",
  },
  { name: "ForeverChanges: downranking", url: "https://foreverchanges.pro/downranking", note: "downranking measurements" },
  { name: "The Forever Era: Resto Shaman BiS", url: "https://theforeverera.com/en/bis/shaman/restoration/30/", note: "best in slot list" },
  {
    name: "wowtbc.gg: Resto Shaman BiS (expanded)",
    url: "https://wowtbc.gg/warcraftforever/bis-list/restoration-shaman/",
    note: "best in slot list",
  },
  {
    name: "Wowhead: level 30 healer overview",
    url: "https://www.wowhead.com/forever/guide/classes/shaman/restoration/level-30-healer-overview",
    note: "level 30 healer overview",
  },
  { name: "ManaMaster addon notes", url: "https://github.com/olav9/ManaMaster/blob/main/CLAUDE.md", note: "regen behavior" },
  { name: "StatRat: mana regeneration", url: "https://statrat.info/mechanics/mana-regeneration/", note: "regen behavior" },
];

export function About() {
  return (
    <div className="wrap page">
      <Breadcrumbs trail={ABOUT_TRAIL} />
      <h1>About Tidecaller</h1>
      <p className="lead">
        Tidecaller is a stat weight calculator and best in slot guide for the Restoration Shaman in World of Warcraft:
        Forever. It is for healers who want to know which stat to chase and which item to wear at level 30, worked out
        for their own character and the fights they actually run. Every number is in points of Healing.
      </p>

      <h2>How the numbers are made</h2>
      <p>
        Each stat is turned into points of Healing using your Healing power, your mana pool, your regen and the length
        of your fight, so a weight of 4 means one point of that stat is worth four points of Healing. Items are scored
        with those weights and the best usable set is picked for your faction, level and professions. Change anything
        in <a href="/">the calculator</a> and the weights and the set update at once.
      </p>

      <h2>Data version</h2>
      <p>
        Game data: {DATA_VERSION}. Data last updated {DATA_UPDATED}. The beta changes, so a value that is not yet
        confirmed is marked Check on the calculator.
      </p>

      <h2>Values not yet confirmed</h2>
      <ul>
        <li>Healing Wave rank 4 base heal (read from a chart).</li>
        <li>Mana cost of Healing Wave rank 10 and Lesser Healing Wave rank 1 (Classic values).</li>
        <li>Spirit rate above 90 Spirit and at other levels.</li>
        <li>Whether the Polished Driftwood Icon stacks with Mindfulness.</li>
        <li>
          Base mana uses Classic&apos;s documented Shaman values, not yet confirmed in Forever, and levels between
          documented values are estimated.
        </li>
      </ul>
      <p>Each of these stays editable in the calculator.</p>

      <h2>Sources</h2>
      <ul>
        {SOURCES.map((s) => (
          <li key={s.name}>
            <a href={s.url} rel="noopener">
              {s.name}
            </a>{" "}
            ({s.note})
          </li>
        ))}
        <li>wowvendor, classicwowforever.com and wowclassicforever.info Resto BiS lists.</li>
        <li>Base mana by level: the Wowpedia and Vanilla WoW Archive &ldquo;Base mana&rdquo; pages.</li>
        <li>Mindfulness ranks: Wowhead Forever spell 1223033.</li>
        <li>Spirit readings and the Water Shield tooltip: measured in the beta by the site owner.</li>
      </ul>

      <h2>Privacy</h2>
      <p>
        There are no accounts. Your settings and any items you add stay in your own browser and are never sent
        anywhere. The site counts anonymous page views, without cookies, to see how many people use it.
      </p>

      <h2>Trademark</h2>
      <p>Not affiliated with Blizzard Entertainment. World of Warcraft is a trademark of Blizzard Entertainment.</p>
    </div>
  );
}
