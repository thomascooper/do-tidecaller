// Run by hand, not by the build: node scripts/wowhead-icons.mjs [--check]
//
// Downloads the item icons listed in docs/spec.md section 14.5 into public/icons/<icon>.jpg
// (Wowhead's 56 px "large" icons), plus the question-mark icon used for items with no entry.
// Files already on disk are kept. Commit what it writes.
//
// --check also asks Wowhead's Forever tooltip data (dataEnv 16) for every ID in section 14.5 and
// reports any name or icon that no longer matches; it changes nothing. Exit code 1 on a mismatch.
//
// Needs network access to nether.wowhead.com and wow.zamimg.com. Behind a proxy that Node's
// fetch does not pick up on its own, run it with NODE_USE_ENV_PROXY=1 (Node 22.21 or later).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { jsonBlockUnder } from "./extract-spec-data.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HEADING = "### 14.5 Wowhead item IDs and icons (links and art only)";
export const PLACEHOLDER_ICON = "inv_misc_questionmark";

const spec = readFileSync(resolve(root, "docs/spec.md"), "utf8");
const entries = jsonBlockUnder(spec, HEADING);
const pause = () => new Promise((r) => setTimeout(r, 200));

if (process.argv.includes("--check")) {
  let bad = 0;
  for (const [name, { id, icon }] of Object.entries(entries)) {
    const res = await fetch(`https://nether.wowhead.com/tooltip/item/${id}?dataEnv=16&locale=0`);
    const data = await res.json();
    if (data.name !== name || data.icon !== icon) {
      bad++;
      console.log(`MISMATCH ${name} (${id}): Wowhead says ${data.name ?? data.error}, icon ${data.icon}`);
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
