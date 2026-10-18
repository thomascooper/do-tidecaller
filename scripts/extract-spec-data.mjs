// Extracts the spells and items JSON blocks from docs/spec.md into src/data/.
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
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const spec = readFileSync(resolve(root, "docs/spec.md"), "utf8");
  const { spells, items } = extract(spec);
  mkdirSync(resolve(root, "src/data"), { recursive: true });
  writeFileSync(resolve(root, "src/data/spells.json"), JSON.stringify(spells, null, 2) + "\n");
  writeFileSync(resolve(root, "src/data/items.json"), JSON.stringify(items, null, 2) + "\n");
  console.log(`spells: ${spells.length}, items: ${items.length}`);
}
