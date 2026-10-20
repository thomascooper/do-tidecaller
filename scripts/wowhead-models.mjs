// Run by hand, not by the build. The 3D character's item model numbers (spec section 14.10).
//
// Wowhead refuses its item pages to cloud servers, so the model numbers (Wowhead's "display IDs")
// are read in a home browser:
//
//   node scripts/wowhead-models.mjs
//     prints a script to paste into the browser console on any www.wowhead.com page. It reads
//     Wowhead's Forever item data for every ID in spec section 14.5 and prints the result
//     ({ id: [display, inventory slot, name, source] }) as one line to copy (also on window.TC).
//
//   node scripts/wowhead-models.mjs --apply <pasted.json>
//     checks the pasted result and prints the "items" object for section 14.10. For every item it
//     checks the name Wowhead gave against section 12, then asks Wowhead's model files
//     (wow.zamimg.com) for that model number: the file must exist for the item's slot. A model file
//     whose armor class differs from the spec's armor type is only a warning, because Wowhead files
//     a model shared by several items under one of them. Exit code 1 if anything fails.
//
//   node scripts/wowhead-models.mjs --check
//     runs the same model-file checks on the numbers already in section 14.10.
//
// Needs network access to wow.zamimg.com for --apply and --check. Behind a proxy that Node's fetch
// does not pick up on its own, run it with NODE_USE_ENV_PROXY=1 (Node 22.21 or later).
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { jsonBlockUnder } from "./extract-spec-data.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const spec = readFileSync(resolve(root, "docs/spec.md"), "utf8");
const ids = jsonBlockUnder(spec, "### 14.5 Wowhead item IDs and icons (links and art only)");
const items = jsonBlockUnder(spec, "## 12. Data: items.json (155 items)");
const MODELS_HEADING = "### 14.10 3D character: races, slots and item models";
const META = "https://wow.zamimg.com/modelviewer/classicplus/meta";

/** Wowhead inventory types each section 12 slot may have; slots with no model on a character are absent. */
const INV_TYPES = {
  Head: [1], Shoulder: [3], Back: [16], Chest: [5, 20], Wrist: [9], Hands: [10], Waist: [6], Legs: [7], Feet: [8],
  "Main hand": [13, 21], "Two-hand": [17], "Off hand": [14, 22, 23],
};
/** The viewer's slot number for each inventory type (a robe keeps its own 20, every weapon is 21, every off hand 22). */
const VIEWER_SLOT = { 1: 1, 3: 3, 16: 16, 5: 5, 20: 20, 9: 9, 10: 10, 6: 6, 7: 7, 8: 8, 13: 21, 17: 21, 21: 21, 14: 22, 22: 22, 23: 22 };
/** Item class and subclass Wowhead's model file must show for each section 12 armor type. */
const ARMOR_CLASS = { Cloth: [4, 1], Leather: [4, 2], Shield: [4, 6] };
const WEAPON_SLOTS = new Set(["Main hand", "Two-hand", "Off hand"]);

function consoleScript() {
  const list = Object.values(ids).map((e) => e.id).join(",");
  return (
    `(async()=>{const ids=[${list}];const out={};let n=0;for(const id of ids){let d=null,s=null,nm=null,src='x';` +
    "try{const t=await(await fetch(`/forever/item=${id}&xml`)).text();d=t.match(/displayId=\"(\\d+)\"/)?.[1];" +
    "s=t.match(/inventorySlot id=\"(\\d+)\"/)?.[1];nm=t.match(/<name><!\\[CDATA\\[(.*?)\\]\\]>/)?.[1];" +
    "if(!d){const h=await(await fetch(`/forever/item=${id}`)).text();const i=h.indexOf(`\"${id}\":{`);" +
    "if(i>=0){const c=h.slice(i,i+4000);d=c.match(/\"displayid\":(\\d+)/)?.[1];s=s||c.match(/\"slotbak\":(\\d+)/)?.[1];" +
    "nm=nm||c.match(/\"name_enus\":\"(.*?)\"/)?.[1];src='p'}}}catch(e){src='e'}out[id]=[d?+d:null,s?+s:null,nm,src];" +
    "if(++n%25==0)console.log(n+' of '+ids.length);await new Promise(r=>setTimeout(r,150))}window.TC=JSON.stringify(out);" +
    "console.log('Done: '+Object.values(out).filter(v=>v[0]).length+' of '+ids.length+' have a model number. Copy the line below and paste it to Claude.');" +
    "console.log(window.TC)})()"
  );
}

async function json(url) {
  const res = await fetch(url);
  return res.ok ? res.json() : null;
}

/** Checks one model number against Wowhead's model files. Resolves to { slot, warning? } or { error }. */
async function checkModel(item, display) {
  const allowed = INV_TYPES[item.slot];
  if (!allowed) return { error: `${item.slot} shows no model on a character` };
  let meta = null;
  if (WEAPON_SLOTS.has(item.slot)) meta = await json(`${META}/item/${display}.json`);
  else for (const inv of allowed) if (!meta) meta = await json(`${META}/armor/${inv}/${display}.json`);
  if (!meta?.Item) return { error: `no model file for ${display} under ${item.slot}` };
  const { InventoryType: inv, ItemClass: cls, ItemSubClass: sub } = meta.Item;
  if (!allowed.includes(inv)) return { error: `model ${display} is inventory type ${inv}, not ${item.slot}` };
  const want = ARMOR_CLASS[item.armor];
  const warning = want && (cls !== want[0] || sub !== want[1]) ? `model ${display} is filed as class ${cls}/${sub}, the spec says ${item.armor}` : undefined;
  if (!want && WEAPON_SLOTS.has(item.slot) && item.slot !== "Off hand" && cls !== 2) return { error: `model ${display} is not a weapon` };
  return { slot: VIEWER_SLOT[inv], warning };
}

const byName = Object.fromEntries(items.map((i) => [i.name, i]));
const pause = () => new Promise((r) => setTimeout(r, 100));

if (process.argv.includes("--apply")) {
  const pasted = JSON.parse(readFileSync(process.argv[process.argv.indexOf("--apply") + 1], "utf8"));
  const out = {};
  let bad = 0;
  for (const [name, { id }] of Object.entries(ids)) {
    const item = byName[name];
    const row = pasted[id];
    if (!INV_TYPES[item.slot]) continue;
    if (!row) { bad++; console.error(`MISSING ${name} (${id}): not in the pasted result`); continue; }
    const [display, , wowName] = row;
    if (wowName && wowName !== name) { bad++; console.error(`NAME ${name} (${id}): Wowhead says ${wowName}`); continue; }
    if (!display) { console.error(`NO MODEL ${name} (${id}): Wowhead gave no model number`); continue; }
    const r = await checkModel(item, display);
    if (r.error) { bad++; console.error(`BAD ${name} (${id}): ${r.error}`); } else out[name] = { display, slot: r.slot };
    if (r.warning) console.error(`NOTE ${name} (${id}): ${r.warning}`);
    await pause();
  }
  const lines = Object.entries(out).map(([n, v]) => `    ${JSON.stringify(n)}: {"display": ${v.display}, "slot": ${v.slot}}`);
  console.log(`  "items": {\n${lines.join(",\n")}\n  }`);
  console.error(`${Object.keys(out).length} items with a checked model, ${bad} problems`);
  process.exit(bad ? 1 : 0);
}

if (process.argv.includes("--check")) {
  const models = jsonBlockUnder(spec, MODELS_HEADING).items;
  let bad = 0;
  for (const [name, { display, slot }] of Object.entries(models)) {
    const item = byName[name];
    const r = item ? await checkModel(item, display) : { error: "not an item in section 12" };
    if (r.error || r.slot !== slot) { bad++; console.log(`MISMATCH ${name}: ${r.error ?? `slot ${r.slot}, spec says ${slot}`}`); }
    await pause();
  }
  console.log(`${Object.keys(models).length} checked, ${bad} mismatched`);
  process.exit(bad ? 1 : 0);
}

console.log(consoleScript());
