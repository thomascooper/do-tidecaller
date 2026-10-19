// Run by hand, not by the build: node scripts/wowhead-icons.mjs [--check | --levels]
//
// No flag: downloads the item icons listed in docs/spec.md section 14.5 into
// public/icons/<icon>.jpg (Wowhead's 56 px "large" icons), plus the question-mark icon used for
// items with no entry. Files already on disk are kept. Commit what it writes.
//
// --levels prints the JSON block for spec section 14.6 (item level and armor of every item in
// 14.5), read from Wowhead's Forever tooltip data. Paste it into the spec, then run
// `node scripts/extract-spec-data.mjs`.
//
// --check asks Wowhead's Forever tooltip data (dataEnv 16) for every ID in section 14.5 and reports
// any name, icon, item level or armor that no longer matches sections 14.5 and 14.6; it changes
// nothing. Exit code 1 on a mismatch.
//
// Needs network access to nether.wowhead.com and wow.zamimg.com. Behind a proxy that Node's
// fetch does not pick up on its own, run it with NODE_USE_ENV_PROXY=1 (Node 22.21 or later).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { jsonBlockUnder } from "./extract-spec-data.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HEADING = "### 14.5 Wowhead item IDs and icons (links and art only)";
const LEVELS_HEADING = "### 14.6 Item level and armor (cached from Wowhead's Forever data)";
export const PLACEHOLDER_ICON = "inv_misc_questionmark";

const spec = readFileSync(resolve(root, "docs/spec.md"), "utf8");
const entries = jsonBlockUnder(spec, HEADING);
const pause = () => new Promise((r) => setTimeout(r, 200));

/** Name, icon, item level and armor (null when the item has none) from Wowhead's Forever tooltip. */
async function tooltip(id) {
  const res = await fetch(`https://nether.wowhead.com/tooltip/item/${id}?dataEnv=16&locale=0`);
  const data = await res.json();
  const html = data.tooltip ?? "";
  const ilvl = html.match(/<!--ilvl-->(\d+)/);
  const armor = html.match(/<!--amr-->(\d+) Armor/);
  return {
    name: data.name ?? data.error,
    icon: data.icon,
    ilvl: ilvl ? Number(ilvl[1]) : null,
    armor: armor ? Number(armor[1]) : null,
  };
}

/** One 14.6 entry: item level always, armor only when the item has some. */
const levelEntry = (t) => (t.armor === null ? { ilvl: t.ilvl } : { ilvl: t.ilvl, armor: t.armor });

if (process.argv.includes("--levels")) {
  const lines = [];
  for (const [name, { id }] of Object.entries(entries)) {
    const t = await tooltip(id);
    if (t.name !== name) throw new Error(`${name} (${id}): Wowhead says ${t.name}`);
    if (t.ilvl === null) throw new Error(`${name} (${id}): no item level in the tooltip`);
    lines.push(`  ${JSON.stringify(name)}: ${JSON.stringify(levelEntry(t)).replace(/,/g, ", ").replace(/:/g, ": ")}`);
    await pause();
  }
  console.log(`{\n${lines.join(",\n")}\n}`);
  process.exit(0);
}

if (process.argv.includes("--check")) {
  const levels = spec.includes(LEVELS_HEADING) ? jsonBlockUnder(spec, LEVELS_HEADING) : {};
  let bad = 0;
  for (const [name, { id, icon }] of Object.entries(entries)) {
    const t = await tooltip(id);
    const want = levels[name];
    const got = levelEntry(t);
    if (t.name !== name || t.icon !== icon || (want && JSON.stringify(want) !== JSON.stringify(got))) {
      bad++;
      console.log(`MISMATCH ${name} (${id}): Wowhead says ${t.name}, icon ${t.icon}, ${JSON.stringify(got)}`);
    }
    await pause();
  }
  console.log(`${Object.keys(entries).length} checked, ${bad} mismatched`);
  process.exit(bad ? 1 : 0);
}

const dir = resolve(root, "public/icons");
mkdirSync(dir, { recursive: true });
const icons = [...new Set([...Object.values(entries).map((e) => e.icon), PLACEHOLDER_ICON])];
let fetched = 0;
for (const icon of icons) {
  const file = resolve(dir, `${icon}.jpg`);
  if (existsSync(file)) continue;
  const res = await fetch(`https://wow.zamimg.com/images/wow/icons/large/${icon}.jpg`);
  if (!res.ok) throw new Error(`${icon}: HTTP ${res.status}`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  fetched++;
  await pause();
}
console.log(`${icons.length} icons, ${fetched} downloaded into public/icons`);
