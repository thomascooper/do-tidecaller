// Extracts the spells, items, Wowhead, item level and item crit JSON blocks from docs/spec.md into src/data/.
// Re-run after a spec update: node scripts/extract-spec-data.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function jsonBlockUnder(spec, heading) {
  const start = spec.indexOf(heading);
  if (start < 0) throw new Error(`Heading not found: ${heading}`);
  const open = spec.indexOf("```json", start);
  if (open < 0) throw new Error(`No json block under: ${heading}`);
  const bodyStart = spec.indexOf("\n", open) + 1;
  const close = spec.indexOf("\n```", bodyStart);
  if (close < 0) throw new Error(`Unterminated json block under: ${heading}`);
  return JSON.parse(spec.slice(bodyStart, close));
}

export function extract(spec) {
  return {
    spells: jsonBlockUnder(spec, "## 11. Data: spells.json"),
    items: jsonBlockUnder(spec, "## 12. Data: items.json (155 items)"),
    wowhead: jsonBlockUnder(spec, "### 14.5 Wowhead item IDs and icons (links and art only)"),
    itemLevels: jsonBlockUnder(spec, "### 14.6 Item level and armor (cached from Wowhead's Forever data)"),
    itemCrit: jsonBlockUnder(spec, "### 14.8 Crit chance, worked out, and crit as a stat"),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const spec = readFileSync(resolve(root, "docs/spec.md"), "utf8");
  const { spells, items, wowhead, itemLevels, itemCrit } = extract(spec);
  mkdirSync(resolve(root, "src/data"), { recursive: true });
  writeFileSync(resolve(root, "src/data/spells.json"), JSON.stringify(spells, null, 2) + "\n");
  writeFileSync(resolve(root, "src/data/items.json"), JSON.stringify(items, null, 2) + "\n");
  writeFileSync(resolve(root, "src/data/wowhead.json"), JSON.stringify(wowhead, null, 2) + "\n");
  writeFileSync(resolve(root, "src/data/itemLevels.json"), JSON.stringify(itemLevels, null, 2) + "\n");
  writeFileSync(resolve(root, "src/data/itemCrit.json"), JSON.stringify(itemCrit, null, 2) + "\n");
  console.log(`item levels: ${Object.keys(itemLevels).length}, wowhead: ${Object.keys(wowhead).length}, spells: ${spells.length}, items: ${items.length}`);
}
