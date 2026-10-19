// The calculator against the spec's own reference implementation (docs/spec.md section 13).
// Both pages get the same saved settings, then every number the calculator shows is compared:
// the priority line, the regime text, the weight bars and readouts, the heal rank table, the best
// set with its total and weapon note, every row of the candidate list, and the calibration fits.
// Run after `npm run build`:  node test/reference-diff.mjs   (or `npm run reference`).
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { serveDist } from "../scripts/serve-dist.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const spec = readFileSync(join(ROOT, "docs/spec.md"), "utf8");
const section = spec.slice(spec.indexOf("## 13. Reference implementation"));
const html = section.slice(section.indexOf("```html") + 7, section.indexOf("\n```", section.indexOf("```html") + 7));
if (!html.includes("function compute()")) throw new Error("reference implementation not found in docs/spec.md");
const refFile = join(mkdtempSync(join(tmpdir(), "tidecaller-ref-")), "reference.html");
writeFileSync(refFile, html);
const REF = pathToFileURL(refFile).href;
const KEY = "tidecaller-weights-v1";

const item = { id: "u1", name: "Test Mace", slot: "Main hand", heal: 500, sp: 0, mp5: 0, int: 0, spi: 0, sta: 0, faction: "Both", req: 0, source: "Added by you" };
const SCENARIOS = [
  ["defaults", {}], ["raid boss", { t: 300, f: 100 }], ["trash pull", { t: 90, f: 70 }],
  ["Alliance, Tailoring, Leatherworking", { faction: "Alliance", profs: { Tailoring: true, Leatherworking: true } }],
  ["level 20", { level: 20 }], ["level 25 picks lhw2 (unknown, falls back)", { level: 25, spell: "lhw2" }],
  ["curve shape", { smodel: "curve" }], ["talent off", { talent: false }], ["Icon on, 33%", { icon: true, pct: 33 }],
  ["Water Shield off", { ws: false }], ["crit 20%", { crit: 20 }], ["Stamina weight 2", { stw: 2 }],
  ["never run out of mana", { w: 0 }], ["f 50, 200 s", { f: 50, t: 200 }],
  ["bigger character", { heal: 400, spi: 50, pool: 3000, g: 20, buff: 12 }], ["Lesser HW 1", { spell: "lhw1" }],
  ["edited Healing Wave 4", { edits: { hw4: { base: 300, cost: 150 } }, spell: "hw4" }], ["show gear you can't use", { showAll: true }],
  ["a user item", {}, [item]], ["level 60 hw1 (no bonus)", { level: 60, spell: "hw1" }],
  ["level 40 hw7", { level: 40, spell: "hw7" }], ["Engineering and Enchanting", { profs: { Engineering: true, Enchanting: true } }],
  ["Improved HW off, hw3", { imphw: false, spell: "hw3" }], ["old Spirit default migrates", { sbase: 37.5, sper: 0.5 }],
  ["custom curve", { smodel: "curve", sA: 120, sB: 3000, spi: 200 }], ["Alliance level 22 showing all", { showAll: true, faction: "Alliance", level: 22 }],
];

function extract() {
  const clean = (s) => (s ?? "").replace(/\s+/g, " ").trim();
  const t = (s) => clean(document.querySelector(s)?.textContent);
  const rows = (s) => [...document.querySelectorAll(s)].map((r) => [...r.querySelectorAll("td")].map((td) => clean(td.textContent)).join(" | "));
  const all = (s) => [...document.querySelectorAll(s)].map((b) => clean(b.textContent));
  return {
    // The reference spaces the operators with CSS padding, the app with real spaces.
    verdict: t("#verdict").replace(/\s*([>=])\s*/g, "$1"),
    regime: t("#regime"), // Spec 14.8 renames the Intellect bar's note (crit now counts); the reference keeps the old one.
    bars: all("#bars .bar").map((b) => b.replace("pool, Water Shield and crit", "pool and Water Shield")), conv: all("#conv .kv"), ranks: rows("#ranks tbody tr"),
    best: rows("#bestTable tbody tr"), total: t("#bestTotal"), weapon: t("#bestWeapon"), items: rows("#itemTable tbody tr"), calres: t("#calres"),
  };
}

const server = await serveDist({ port: 0 });
const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });

async function snapshot(url, payload) {
  const ctx = await browser.newContext();
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch {} }, [KEY, payload]);
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
  const r = await page.evaluate(extract);
  await ctx.close();
  return r;
}

let failed = 0;
try {
  for (const [name, state, items] of SCENARIOS) {
    const payload = JSON.stringify({ state, items: items ?? [] });
    // The reference has no manaAuto and always uses its own pool (2223 unless a scenario sets one), so the app
    // is pinned to a typed pool of the same value instead of calculating max mana from level and Intellect.
    // Likewise the reference has no calculated crit and no crit stat (spec 14.8): the app runs on the scenario's
    // typed crit (5 when it sets none) with crit left out of the weights.
    const appPayload = JSON.stringify({ state: { pool: 2223, ...state, manaAuto: false, critAuto: false, critStat: false }, items: items ?? [] });
    const a = await snapshot(REF, payload);
    const b = await snapshot(base, appPayload);
    // Spec 14.7: the app lists Spell Power before Healing; section 13's reference still uses the old tie order.
    a.verdict = a.verdict.replace("Healing=Spell Power", "Spell Power=Healing");
    const diffs = [];
    for (const k of Object.keys(a)) {
      if (JSON.stringify(a[k]) === JSON.stringify(b[k])) continue;
      if (Array.isArray(a[k])) {
        for (let i = 0; i < Math.max(a[k].length, b[k].length); i++) {
          if (a[k][i] !== b[k][i]) diffs.push(`${k}[${i}]\n      reference: ${a[k][i]}\n      app:       ${b[k][i]}`);
        }
      } else diffs.push(`${k}\n      reference: ${a[k]}\n      app:       ${b[k]}`);
    }
    if (a.items.length < 50) diffs.push(`vacuous: the reference showed only ${a.items.length} item rows`);
    if (diffs.length) {
      failed++;
      console.log(`  FAIL ${name}`);
      diffs.slice(0, 10).forEach((d) => console.log("    " + d));
    } else console.log(`  ok   ${name}  (total ${a.total}, ${a.items.length} item rows)`);
  }
} finally {
  await browser.close();
  server.close();
}
console.log(`\n${SCENARIOS.length - failed} of ${SCENARIOS.length} scenarios match the reference`);
process.exit(failed ? 1 : 0);
