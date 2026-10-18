// Browser smoke checks: serves dist/ the way Vercel does and drives it in Chromium.
// Run through `npm run smoke` (which builds first). The browser comes from CHROMIUM_PATH.
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { chromium } from "playwright-core";
import { serveDist } from "../scripts/serve-dist.mjs";

const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}`;
const CHROMIUM = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

let passed = 0;
const failures = [];

async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (e) {
    failures.push(name);
    console.log(`  FAIL ${name}\n       ${String(e.message ?? e).split("\n")[0]}`);
  }
}

function eq(actual, expected, what = "value") {
  if (actual !== expected) throw new Error(`${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const server = await serveDist({ port: PORT });
const browser = await chromium.launch({ executablePath: CHROMIUM, args: ["--no-sandbox"] });

try {
  // ---- Calculator page: "/" -------------------------------------------------
  console.log("Calculator page /");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`${m.text()} (${m.location().url})`);
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE + "/");
  await page.waitForSelector("h1");

  const pressed = (name) => page.getByRole("button", { name }).getAttribute("aria-pressed");

  // ---- Prerender: what a crawler sees before any script runs ----------------
  // Strip comments and tags (the verdict line is split across spans), then decode entities.
  const decode = (html) =>
    html.replace(/<!--.*?-->/gs, "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").replace(/&#x27;|&#39;/g, "'").replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  await check("raw HTML of / has the h1, Tidebringer's Claw and the priority line", async () => {
    const raw = decode(await (await fetch(BASE + "/")).text());
    for (const needle of ["Tidecaller Stat Weights", "Tidebringer's Claw", "MP5 > Intellect", "What Tidecaller does"]) {
      if (!raw.includes(needle)) throw new Error(`missing ${needle}`);
    }
  });
  await check("calculator JavaScript is under 120 KB gzipped", async () => {
    const html = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
    const srcs = new Set([...html.matchAll(/<(?:script|link)[^>]*?(?:src|href)="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1]));
    if (!srcs.size) throw new Error("no script found in dist/index.html");
    let total = 0;
    for (const src of srcs) total += gzipSync(readFileSync(new URL(`../dist${src}`, import.meta.url))).length;
    console.log(`       ${srcs.size} file(s), ${(total / 1024).toFixed(1)} KB gzipped`);
    if (total >= 120 * 1024) throw new Error(`${total} bytes gzipped`);
  });
  await check("the page hydrated cleanly (no console errors yet) and Raid boss works", async () => {
    const fresh = await browser.newContext();
    const p = await fresh.newPage();
    const errs = [];
    p.on("console", (m) => {
      if (m.type() === "error") errs.push(m.text());
      if (m.type() === "warning" && /hydrat/i.test(m.text())) errs.push(m.text());
    });
    p.on("pageerror", (e) => errs.push(String(e)));
    await p.goto(BASE + "/");
    await p.getByRole("button", { name: "Raid boss" }).click();
    eq(await p.locator("#t").inputValue(), "300", "Length after Raid boss");
    await fresh.close();
    eq(errs.join(" | "), "", "console problems");
  });

  await check("h1 reads Tidecaller Stat Weights", async () => {
    eq(await page.locator("h1").count(), 1, "h1 count");
    eq(await page.locator("h1").innerText(), "Tidecaller Stat Weights", "h1");
  });
  await check("Dungeon boss chip is pressed by default", async () => {
    eq(await pressed("Dungeon boss"), "true", "Dungeon boss");
    eq(await pressed("Trash pull"), "false", "Trash pull");
    eq(await pressed("Raid boss"), "false", "Raid boss");
  });
  await check("clicking Raid boss sets Length to 300 and presses that chip", async () => {
    await page.getByRole("button", { name: "Raid boss" }).click();
    eq(await page.locator("#t").inputValue(), "300", "Length");
    eq(await pressed("Raid boss"), "true", "Raid boss");
    eq(await pressed("Dungeon boss"), "false", "Dungeon boss");
    eq(await page.locator("#fOut").innerText(), "100%", "five-second label");
  });
  await check("editing Length off a preset unpresses every chip", async () => {
    await page.locator("#t").fill("301");
    eq(await pressed("Raid boss"), "false", "Raid boss");
    await page.locator("#t").fill("300");
    eq(await pressed("Raid boss"), "true", "Raid boss");
  });
  await check("a field being typed in is not overwritten, and level clamps", async () => {
    await page.locator("#level").fill("");
    eq(await page.locator("#level").inputValue(), "", "empty while typing");
    await page.locator("#level").fill("99");
    await page.locator("#level").blur();
    eq(await page.locator("#level").inputValue(), "60", "level clamped to 60");
    await page.locator("#level").fill("30");
    await page.locator("#level").blur();
  });
  await check("after reload Raid boss is still pressed (persistence)", async () => {
    await page.reload();
    await page.waitForSelector("h1");
    await page.waitForFunction(() => document.querySelector("#t").value === "300");
    eq(await pressed("Raid boss"), "true", "Raid boss");
  });
  await check("share link: copy, open in a fresh context, settings arrive and ?s= is removed", async () => {
    const sctx = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
    const sp = await sctx.newPage();
    await sp.goto(BASE + "/");
    await sp.waitForSelector("h1");
    await sp.getByRole("button", { name: "Raid boss" }).click();
    await sp.locator('[data-prof="Tailoring"]').check();
    await sp.getByRole("button", { name: "Copy link to these settings" }).click();
    await sp.getByText("Link copied").waitFor();
    const link = await sp.evaluate(() => navigator.clipboard.readText());
    if (!link.includes("/?s=")) throw new Error(`unexpected link ${link}`);
    const fresh = await browser.newContext();
    const fp = await fresh.newPage();
    await fp.goto(BASE + new URL(link).search.replace(/^/, "/"));
    await fp.waitForSelector("h1");
    await fp.waitForFunction(() => document.querySelector("#t").value === "300");
    eq(await fp.getByRole("button", { name: "Raid boss" }).getAttribute("aria-pressed"), "true", "Raid boss");
    eq(await fp.locator('[data-prof="Tailoring"]').isChecked(), true, "Tailoring");
    eq(new URL(fp.url()).search, "", "query left in the address bar");
    await fp.reload();
    await fp.waitForFunction(() => document.querySelector("#t").value === "300");
    const bad = await fresh.newPage();
    await bad.goto(BASE + "/?s=not-a-link");
    await bad.waitForSelector("h1");
    eq(new URL(bad.url()).search, "", "invalid query removed");
    await sctx.close();
    await fresh.close();
  });
  await check("share link: without a clipboard the link shows in a text field", async () => {
    const nctx = await browser.newContext();
    const np = await nctx.newPage();
    await np.addInitScript(() => Object.defineProperty(navigator, "clipboard", { value: undefined }));
    await np.goto(BASE + "/");
    await np.waitForSelector("h1");
    await np.getByRole("button", { name: "Copy link to these settings" }).click();
    const v = await np.locator("#shareLink").inputValue();
    if (!v.includes("/?s=")) throw new Error(`field has ${v}`);
    await nctx.close();
  });
  await check("stat weights: verdict, bars and readouts at defaults", async () => {
    await page.getByRole("button", { name: "Dungeon boss" }).click();
    eq((await page.locator("#verdict").innerText()).replace(/\s+/g, " "), "MP5 > Intellect > Healing = Spell Power = Spirit", "verdict");
    eq(await page.locator('.bar[data-stat="mp5"] .v').innerText(), "2.84", "MP5 bar");
    eq(await page.locator(".bar").count(), 5, "bars without Stamina");
    eq(await page.locator("#wnote").innerText(), "1 Healing = 1.00", "note");
    eq(await page.locator(".kv").count(), 7, "readouts");
    eq(await page.locator(".kv", { hasText: "Mana for the fight" }).locator(".v").innerText(), "3,637 18.4 casts", "mana for the fight");
  });
  await check("stat weights: Raid boss MP5 reads 4.58", async () => {
    await page.getByRole("button", { name: "Raid boss" }).click();
    eq(await page.locator('.bar[data-stat="mp5"] .v').innerText(), "4.58", "MP5 bar");
    await page.getByRole("button", { name: "Dungeon boss" }).click();
  });
  await check("max mana: defaults read 2110, and a typed number overrides it and survives reload", async () => {
    await page.getByRole("button", { name: "Dungeon boss" }).click();
    eq(await page.locator("#pool").inputValue(), "2110", "calculated max mana");
    await page.locator("#pool").fill("1000");
    await page.locator("#pool").blur();
    const mp5 = await page.locator('.bar[data-stat="mp5"] .v').innerText();
    eq(mp5 !== "2.84", true, "MP5 weight moved");
    await page.reload();
    await page.waitForSelector("#pool");
    eq(await page.locator("#pool").inputValue(), "1000", "typed max mana after reload");
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await page.waitForSelector("#pool");
  });
  await check("max mana working: Intellect, level, estimated tag, Use calculated, reload", async () => {
    await page.getByRole("button", { name: "Dungeon boss" }).click();
    const work = () => page.locator("#poolWork").innerText().then((t) => t.replace(/\s+/g, " "));
    eq(await work(), "Base 665 at level 30 + 1,445 from 115 Intellect = 2,110.", "working at defaults");
    const mp5 = () => page.locator('.bar[data-stat="mp5"] .v').innerText();
    eq(await mp5(), "2.84", "MP5 at defaults");
    await page.locator("#int").fill("40");
    await page.locator("#int").blur();
    eq(await page.locator("#pool").inputValue(), "985", "pool at Intellect 40");
    eq((await mp5()) !== "2.84", true, "MP5 weight moved");
    await page.locator("#level").fill("22");
    await page.locator("#level").blur();
    await page.locator("#int").fill("54");
    await page.locator("#int").blur();
    eq(await page.locator("#pool").inputValue(), "951", "level 22, Intellect 54");
    eq(await page.locator("#poolWork .tag").count(), 0, "level 22 is documented");
    await page.locator("#level").fill("18");
    await page.locator("#level").blur();
    eq(await page.locator("#poolWork .tag").count(), 1, "level 18 shows the estimated tag");
    await page.locator("#level").fill("30");
    await page.locator("#level").blur();
    await page.locator("#int").fill("115");
    await page.locator("#int").blur();
    await page.locator("#pool").fill("1000");
    await page.locator("#pool").blur();
    eq(await work(), "Using your number. Use calculated (2,110)", "override working");
    await page.locator("#level").fill("25");
    await page.locator("#level").blur();
    eq(await page.locator("#pool").inputValue(), "1000", "typed number stays when level changes");
    await page.reload();
    await page.waitForSelector("#pool");
    eq(await page.locator("#pool").inputValue(), "1000", "override survives reload");
    await page.locator("#level").fill("30");
    await page.locator("#level").blur();
    await page.getByRole("button", { name: /Use calculated/ }).click();
    eq(await page.locator("#pool").inputValue(), "2110", "back to calculated");
    await page.reload();
    await page.waitForSelector("#pool");
    eq(await page.locator("#pool").inputValue(), "2110", "calculated survives reload");
  });
  await check("stat weights: Stamina bar appears only with a Stamina weight", async () => {
    await page.locator("#stw").fill("5");
    eq(await page.locator('.bar[data-stat="sta"]').count(), 1, "stamina bar");
    eq((await page.locator("#verdict").innerText()).startsWith("Stamina"), true, "Stamina first");
    await page.locator("#stw").fill("0");
  });
  await check("stat weights: with the run-out slider at 0 every mana stat is 0.00", async () => {
    await page.locator("#w").fill("0");
    for (const k of ["mp5", "int", "spi"]) eq(await page.locator(`.bar[data-stat="${k}"] .v`).innerText(), "0.00", k);
    eq(await page.locator("#regime").innerText(), "You set mana as never running out, so only Healing and Spell Power count.", "regime");
    await page.locator("#w").fill("100");
  });
  await check("sliders show live percentages", async () => {
    await page.locator("#w").fill("40");
    eq(await page.locator("#wOut").innerText(), "40%", "run-out label");
  });
  await check("regen: turning the talent off disables the percent input and changes the Spirit weight", async () => {
    const before = await page.locator('.bar[data-stat="spi"] .v').innerText();
    eq(await page.locator("#pct").isDisabled(), false, "pct enabled");
    await page.locator("#talent").setChecked(false, { force: true });
    eq(await page.locator("#pct").isDisabled(), true, "pct disabled");
    const after = await page.locator('.bar[data-stat="spi"] .v').innerText();
    if (before === after) throw new Error(`Spirit weight stayed ${before}`);
    await page.locator("#talent").setChecked(true, { force: true });
    eq(await page.locator("#pct").isDisabled(), false, "pct enabled again");
    await page.locator("#ws").setChecked(false, { force: true });
    eq(await page.locator("#crit").isDisabled(), true, "crit disabled");
    await page.locator("#ws").setChecked(true, { force: true });
  });
  await check("calibration: levels-off fit, restore defaults, casting share", async () => {
    await page.locator("#spiritbox summary").click();
    eq(await page.locator("#sA").isDisabled(), true, "cap disabled on the line shape");
    await page.locator("#calCurve").click();
    eq(await page.locator("#smodel").inputValue(), "curve", "shape");
    eq(await page.locator("#sA").inputValue(), "115.1", "cap");
    eq(await page.locator("#sB").inputValue(), "2750", "B");
    eq(await page.locator("#sbase").isDisabled(), true, "line base disabled on the curve shape");
    await page.locator("#calReset").click();
    eq(await page.locator("#smodel").inputValue(), "line", "shape after restore");
    eq(await page.locator("#sbase").inputValue(), "30.5", "base");
    eq(await page.locator("#sper").inputValue(), "0.626", "rate");
    eq(await page.locator("#calShare").isDisabled(), true, "share button off without sheet figures");
    await page.locator("#c3n").fill("87");
    await page.locator("#c3c").fill("53.5");
    eq(await page.locator("#calShare").isDisabled(), false, "share button on");
    await page.locator("#talent").setChecked(false, { force: true });
    await page.locator("#calShare").click();
    eq(await page.locator("#pct").inputValue(), "56", "percent");
    eq(await page.locator("#talent").isChecked(), true, "talent on");
    eq(await page.locator("#icon").isChecked(), false, "icon off");
  });
  await check("ranks: seven rows, selection moves the MP5 weight, level 20 falls back", async () => {
    const mp5 = async () => (await page.locator('[data-stat="mp5"]').textContent()) ?? "";
    eq(await page.locator("#ranks tbody tr").count(), 7, "rows at level 30");
    const before = await mp5();
    await page.locator('#ranks tr[data-spell="lhw2"]').click();
    eq(await page.locator('#ranks tr[data-spell="lhw2"]').getAttribute("aria-selected"), "true", "lhw2 selected");
    eq(await page.locator('#ranks tr[data-spell="hw5"]').getAttribute("aria-selected"), "false", "hw5 deselected");
    if ((await mp5()) === before) throw new Error("MP5 weight did not change");
    await page.locator('#ranks tr[data-spell="hw5"]').focus();
    await page.keyboard.press("Enter");
    eq(await page.locator('#ranks tr[data-spell="hw5"]').getAttribute("aria-selected"), "true", "Enter selects");
    eq(await page.evaluate(() => document.activeElement?.getAttribute("data-spell")), "hw5", "focus kept");
    await page.locator("#level").fill("20");
    eq(await page.locator('#ranks tr[data-spell="hw4"]').getAttribute("aria-selected"), "true", "falls back to hw4");
    await page.locator("#level").fill("30");
  });
  await check("ranks: editing a rank swaps Check for Edited, restore brings it back", async () => {
    await page.locator('#ranks tr[data-spell="hw4"]').click();
    const row = page.locator('#ranks tr[data-spell="hw4"]');
    eq(await row.locator(".tag.warn").count(), 1, "Check tag before");
    await page.locator("#editbox summary").click();
    await page.locator("#eb").fill("300");
    eq(await row.locator(".tag.warn").count(), 0, "Check tag gone");
    eq(await row.locator(".tag.mana").textContent(), "Edited", "Edited tag");
    await page.locator("#eb").fill("-5");
    eq(await row.locator(".tag.mana").count(), 1, "non-positive value ignored");
    eq(await page.locator("#esrc").textContent(), "Healing Wave 4: Read from a ForeverChanges chart, unconfirmed", "source text");
    await page.locator("#eReset").click();
    eq(await row.locator(".tag.warn").count(), 1, "Check tag back");
    eq(await row.locator(".tag.mana").count(), 0, "Edited gone");
    await page.locator('#ranks tr[data-spell="hw5"]').click();
  });
  const picks = async () =>
    page.locator("#bestTable tbody tr").evaluateAll((trs) =>
      trs.map((tr) => [...tr.querySelectorAll("td")].slice(0, 2).map((td) => td.textContent).join(": ")),
    );
  await check("best set: total, weapons and weapon note at defaults", async () => {
    // Earlier checks changed settings; start the best set from a clean page.
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await page.waitForSelector("#bestTotal");
    eq(await page.locator("#bestTotal").textContent(), "428.4", "total");
    const rows = await picks();
    eq(rows.length, 16, "rows");
    eq(rows.includes("Main hand: Tidebringer's Claw"), true, "main hand");
    eq(rows.includes("Off hand: Forcestone Buckler"), true, "off hand");
    eq(await page.locator("#bestWeapon").textContent(), "Main hand and off hand beat the best two-hander by 26.2", "weapon note");
    eq(await page.locator("#maxlvl").count(), 0, "no separate gear level input");
  });
  await check("best set: hovering an item name shows the item popup", async () => {
    await page.locator('#bestTable a[href="/items/tidebringers-claw"]').hover();
    await page.locator('[role="tooltip"]').waitFor({ state: "visible" });
    eq((await page.locator('[role="tooltip"]').innerText()).includes("+2% crit on Healing Wave and Lesser Healing Wave"), true, "equip text");
    await page.mouse.move(5, 5);
    await page.locator('[role="tooltip"]').waitFor({ state: "detached" });
  });
  await check("best set: Alliance replaces the Horde-only off hand, Tailoring changes picks", async () => {
    await page.locator("#faction").selectOption("Alliance");
    const alliance = await picks();
    eq(alliance.some((r) => r.includes("Forcestone Buckler")), false, "buckler gone");
    await page.locator("#faction").selectOption("Horde");
    const before = await picks();
    await page.locator('[data-prof="Tailoring"]').check();
    const after = await picks();
    const changed = after.filter((r, n) => r !== before[n]);
    // Measured at Dungeon boss defaults: Tailoring changes exactly one pick.
    eq(changed.join(" | "), "Feet: Gilded Slippers", "picks Tailoring changes");
    await page.locator('[data-prof="Tailoring"]').uncheck();
  });
  await check("best set: the character's level decides what gear is usable", async () => {
    const items = JSON.parse(readFileSync(new URL("../src/data/items.json", import.meta.url), "utf8"));
    const reqOf = (name) => (items.find((i) => i.name === name) || {}).req;
    await page.locator("#level").fill("25");
    await page.locator("#level").blur();
    const rows = await picks();
    const names = rows.map((r) => r.split(": ").slice(1).join(": "));
    eq(rows.includes("Head: Holy Shroud"), false, "Holy Shroud (req 27) not the Head pick at level 25");
    eq(names.filter((n) => reqOf(n) > 25).join(" | "), "", "picks above level 25");
    await page.locator("#level").fill("30");
    await page.locator("#level").blur();
  });
  await check("candidates: add, pick, persist and remove your own item", async () => {
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await page.waitForSelector("#itemTable");
    await page.locator(".addbox summary").click();
    await page.locator("#a-name").fill("Smoke Test Mace");
    await page.locator("#a-slot").selectOption("Main hand");
    await page.locator("#a-heal").fill("500");
    await page.locator("#addForm button[type=submit]").click();
    eq((await picks()).includes("Main hand: Smoke Test Mace"), true, "mace is the main hand pick");
    const row = page.locator("#itemTable tbody tr", { hasText: "Smoke Test Mace" });
    eq(await row.locator(".tag.mana").textContent(), "Yours", "Yours tag");
    eq(await row.locator(".tag").first().textContent(), "Top", "Top tag");
    await page.reload();
    await page.waitForSelector("#itemTable");
    eq(await page.locator("#itemTable tbody tr", { hasText: "Smoke Test Mace" }).count(), 1, "survives reload");
    await page.locator('#itemTable [data-del]').click();
    eq(await page.locator("#itemTable tbody tr", { hasText: "Smoke Test Mace" }).count(), 0, "removed from candidates");
    eq((await picks()).some((r) => r.includes("Smoke Test Mace")), false, "removed from best set");
  });
  await check("candidates: unusable gear shows its reason when asked", async () => {
    eq(await page.locator("#itemTable tbody tr", { hasText: "Giantstone Medallion" }).count(), 0, "hidden by default");
    await page.locator("#showAll").check();
    const row = page.locator("#itemTable tbody tr", { hasText: "Giantstone Medallion" });
    eq((await row.locator(".why").textContent()), "Alliance only", "reason");
    eq(await row.evaluate((tr) => tr.classList.contains("cant")), true, "dimmed");
    await page.locator("#showAll").uncheck();
  });
  await check("footer: How it works, Downranking and Unconfirmed", async () => {
    const foot = await page.locator(".foot p b").allTextContents();
    eq(foot.join(" "), "How it works. Downranking. Unconfirmed.", "footer headings");
  });
  await check("every form control has an accessible name", async () => {
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await page.waitForSelector("#itemTable");
    await page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
    await page.locator("#showAll").check();
    const unnamed = await page.evaluate(() =>
      [...document.querySelectorAll("input, select, textarea")]
        .filter((el) => {
          if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) return false;
          if (el.labels && el.labels.length) return false;
          return true;
        })
        .map((el) => el.id || el.outerHTML.slice(0, 60)),
    );
    eq(unnamed.join(", "), "", "controls without a name");
  });
  await check("keyboard: Tab reaches the preset chips, Enter on a rank row selects it", async () => {
    await page.locator("h1").click();
    let reached = false;
    for (let n = 0; n < 5 && !reached; n++) {
      await page.keyboard.press("Tab");
      reached = await page.evaluate(() => document.activeElement?.classList.contains("chip") ?? false);
    }
    eq(reached, true, "chip focused by Tab");
    eq(await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle), "solid", "visible focus outline");
    await page.locator('#ranks tr[data-spell="lhw2"]').focus();
    await page.keyboard.press("Enter");
    eq(await page.locator('#ranks tr[data-spell="lhw2"]').getAttribute("aria-selected"), "true", "Enter selects");
    await page.locator('#ranks tr[data-spell="hw5"]').click();
  });
  await check("no console errors", async () => eq(errors.join(" | "), "", "console errors"));
  await ctx.close();

  // ---- Site pages: /about, redirects and the 404 -----------------------------
  console.log("Site pages");
  const siteCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const sp = await siteCtx.newPage();
  const siteErrors = [];
  sp.on("console", (m) => {
    // The browser logs the 404 document itself as a failed resource load.
    const url = m.location().url;
    if (m.type() === "error" && !url.endsWith("/no-such-page")) siteErrors.push(m.text());
  });
  await check("/sitemap.xml, /robots.txt and /favicon.svg return 200", async () => {
    for (const [path, needle] of [["/sitemap.xml", "<loc>https://tidecaller.drunkenoath.com/bis</loc>"], ["/robots.txt", "Sitemap: https://tidecaller.drunkenoath.com/sitemap.xml"], ["/favicon.svg", "<svg"]]) {
      const res = await fetch(BASE + path);
      eq(res.status, 200, `${path} status`);
      if (!(await res.text()).includes(needle)) throw new Error(`${path} lacks ${needle}`);
    }
  });
  await check("/about returns 200 with its h1 and no module script", async () => {
    const res = await sp.goto(BASE + "/about");
    eq(res.status(), 200, "status");
    eq(await sp.locator("h1").innerText(), "About Tidecaller", "h1");
    eq(await sp.locator('script[type="module"]:not([src*="/assets/tips-"])').count(), 0, "module scripts");
    eq(res.headers()["content-type"].startsWith("text/html"), true, "content type");
  });
  await check("/bis, /about and the stat weights guide say where max mana comes from", async () => {
    await sp.goto(BASE + "/bis");
    eq((await sp.locator("main p.lead").innerText()).replace(/\s+/g, " ").includes("level 30 with 115 Intellect, 2,110 mana"), true, "bis intro");
    await sp.goto(BASE + "/about");
    const about = (await sp.locator("main").innerText()).replace(/\s+/g, " ");
    eq(about.includes("A naked level 24 Shaman in the beta matches them exactly (796 mana at 40 Intellect)"), true, "about unconfirmed");
    eq(about.includes("Wowpedia and Vanilla WoW Archive"), true, "about sources");
    await sp.goto(BASE + "/guides/stat-weights");
    eq((await sp.locator("main").innerText()).includes("base mana for your level plus the mana from your Intellect"), true, "guide paragraph");
  });
  await check("/bis shows Holy Shroud 38.9 and a Horde total of 428.4 and has no module script", async () => {
    const res = await sp.goto(BASE + "/bis");
    eq(res.status(), 200, "status");
    eq(await sp.locator("h1").innerText(), "Resto Shaman best in slot, level 30", "h1");
    eq(await sp.locator('script[type="module"]:not([src*="/assets/tips-"])').count(), 0, "module scripts");
    const head = sp.locator("#hordeSet tbody tr").first();
    eq((await head.innerText()).replace(/\s+/g, " ").startsWith("Head Holy Shroud 38.9"), true, "head row");
    eq(await sp.locator("#hordeSet tfoot .score").innerText(), "428.4", "Horde total");
    eq(await sp.locator("main h2", { hasText: "Does it change for other fights?" }).count(), 1, "fights section");
    eq(await sp.locator("main h2", { hasText: "Crafter upgrades" }).count(), 1, "crafter section");
  });
  await check("every slot page returns 200; /bis/head lists Holy Shroud first at 38.9; /bis/main-hand names Tidebringer's Claw", async () => {
    for (const slug of "head neck shoulder back chest wrist hands waist legs feet finger trinket main-hand off-hand two-hand".split(" ")) {
      const res = await sp.goto(BASE + "/bis/" + slug);
      eq(res.status(), 200, "status " + slug);
      eq(await sp.locator('script[type="module"]:not([src*="/assets/tips-"])').count(), 0, "module scripts " + slug);
    }
    await sp.goto(BASE + "/bis/head");
    const first = (await sp.locator("#slotItems tbody tr").first().innerText()).replace(/\s+/g, " ");
    eq(first.startsWith("Holy Shroud"), true, "Holy Shroud first");
    eq(first.includes("38.9"), true, "Dungeon 38.9");
    await sp.goto(BASE + "/bis/main-hand");
    eq((await sp.locator("main").innerText()).includes("Tidebringer's Claw"), true, "Tidebringer's Claw");
    eq(await sp.locator('main a[href="/bis/two-hand"]').count() > 0, true, "link to two-hand");
    await sp.goto(BASE + "/bis");
    eq(await sp.locator('main a[href^="/bis/"]').count() >= 15, true, "slot links on /bis");
  });
  await check("/items/holy-shroud shows 38.9 and 1 of 11 Head items; /items/forcestone-buckler says Horde only; /items lists the items", async () => {
    const res = await sp.goto(BASE + "/items/holy-shroud");
    eq(res.status(), 200, "status");
    eq(await sp.locator('script[type="module"]:not([src*="/assets/tips-"])').count(), 0, "module scripts");
    eq(await sp.locator("h1").innerText(), "Holy Shroud", "h1");
    const text = await sp.locator("main").innerText();
    eq(text.includes("38.9"), true, "38.9");
    eq(text.includes("1 of 11 Head items"), true, "rank");
    await sp.goto(BASE + "/items/forcestone-buckler");
    eq((await sp.locator("main").innerText()).includes("Horde only"), true, "Horde only");
    await sp.goto(BASE + "/items");
    eq(await sp.locator('main td.nm a[href^="/items/"]').count(), 155, "item links");
  });
  await check("/items shows the stat columns: Head header row, Holy Shroud row, Tidebringer's Claw equip, no sideways scroll at 400 px", async () => {
    await sp.goto(BASE + "/items");
    const head = (await sp.locator("main table").first().locator("thead th").allInnerTexts()).map((t) => t.trim());
    eq(head.join("|"), "Item|Lvl|Int|Spr|SP|Heal|MP5|Equip|Where|Score", "header row");
    const cells = (await sp.locator("main tr", { has: sp.locator('a[href="/items/holy-shroud"]') }).locator("td").allInnerTexts()).map((t) => t.trim());
    eq([cells[1], cells[2], cells[3], cells[4], cells[5], cells[6], cells[8], cells[9]].join("|"), "27||6||33||World drop|38.9", "Holy Shroud row");
    const eqp = await sp.locator("main tr", { has: sp.locator('a[href="/items/tidebringers-claw"]') }).locator("td").nth(7).innerText();
    eq(eqp.trim(), "+2% crit on Healing Wave and Lesser Healing Wave", "Tidebringer's Claw equip");
    const vp = sp.viewportSize();
    await sp.setViewportSize({ width: 400, height: 800 });
    const wide = await sp.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    await sp.setViewportSize(vp);
    eq(wide, false, "page scrolls sideways at 400 px");
  });
  await check("item popups on /items: hover shows and hides, keyboard focus shows and Escape hides, a link at the right edge stays inside a 400 px viewport", async () => {
    await sp.goto(BASE + "/items");
    const link = sp.locator('main td.nm a[href="/items/holy-shroud"]');
    const tip = sp.locator('[role="tooltip"]');
    await link.hover();
    await tip.waitFor({ state: "visible" });
    const text = (await tip.innerText()).replace(/\s+/g, " ");
    for (const want of ["Holy Shroud", "+33 Healing", "+6 Spirit", "Requires level 27", "World drop / auction house"])
      eq(text.includes(want), true, `popup has ${want}`);
    eq(await link.getAttribute("aria-describedby"), await tip.getAttribute("id"), "aria-describedby");
    await sp.mouse.move(5, 5);
    await tip.waitFor({ state: "detached" });
    eq(await link.getAttribute("aria-describedby"), null, "aria-describedby removed");
    await link.focus();
    await tip.waitFor({ state: "visible" });
    await sp.keyboard.press("Escape");
    await tip.waitFor({ state: "detached" });
    const vp = sp.viewportSize();
    await sp.setViewportSize({ width: 400, height: 800 });
    await sp.goto(BASE + "/items/holy-shroud");
    const box = await sp.locator("main h1").boundingBox();
    await sp.mouse.move(398, box.y + 4);
    await sp.evaluate(() => {
      // Put an item link at the right edge so the popup has to flip left.
      const a = document.createElement("a");
      a.href = "/items/holy-shroud";
      a.textContent = "Holy Shroud";
      a.style.cssText = "position:fixed;right:0;top:300px;background:#fff";
      document.body.append(a);
    });
    await sp.locator("a[style*='fixed']").hover();
    await tip.waitFor({ state: "visible" });
    const r = await tip.boundingBox();
    await sp.setViewportSize(vp);
    eq(r.x >= 0 && r.x + r.width <= 400, true, `popup inside the viewport (x ${r.x}, width ${r.width})`);
  });
  await check("following the Holy Shroud link from /bis lands on its page", async () => {
    await sp.goto(BASE + "/bis");
    await Promise.all([sp.waitForURL("**/items/holy-shroud"), sp.locator('#hordeSet a[href="/items/holy-shroud"]').click()]);
    eq(await sp.locator("h1").innerText(), "Holy Shroud", "h1");
  });
  await check("the calculator page links to /bis", async () => {
    await sp.goto(BASE + "/");
    eq(await sp.locator('#h-what ~ p a[href="/bis"]').count(), 1, "link in What Tidecaller does");
  });
  await check("all three guides return 200 with their h1 and no module script; downranking shows 65% kept for Healing Wave 2 at level 30", async () => {
    for (const [path, h1] of [
      ["/guides/stat-weights", "How Resto Shaman stat weights work"],
      ["/guides/spirit-regen", "Spirit and mana regen in Forever"],
      ["/guides/downranking", "Healing Wave downranking"],
    ]) {
      const res = await sp.goto(BASE + path);
      eq(res.status(), 200, "status " + path);
      eq(await sp.locator("h1").innerText(), h1, "h1 " + path);
      eq(await sp.locator('script[type="module"]:not([src*="/assets/tips-"])').count(), 0, "module scripts " + path);
    }
    const rows = sp.locator("#rankTable tbody tr");
    eq(await rows.count(), 12, "rank rows");
    const hw2 = (await rows.nth(1).innerText()).replace(/\s+/g, " ");
    eq(hw2.startsWith("Healing Wave 2 6 ") && hw2.includes(" 65% "), true, "hw2 row: " + hw2);
    await sp.goto(BASE + "/guides/stat-weights");
    eq(await sp.locator("#presetWeights tbody tr").count(), 3, "preset rows");
    await sp.goto(BASE + "/guides");
    eq(await sp.locator('main a[href^="/guides/"]').count(), 3, "guide links");
  });
  await check("the Spirit guide draws 12 points (43 hollow), keeps the table, and has no horizontal scroll at 400px", async () => {
    const res = await sp.goto(BASE + "/guides/spirit-regen");
    eq(res.status(), 200, "status");
    eq(await sp.locator("svg#spiritChart circle.pt").count(), 12, "points");
    eq(await sp.locator("svg#spiritChart circle.pt.excluded").count(), 1, "excluded point");
    eq(await sp.locator("svg#spiritChart title").count(), 1, "svg title");
    eq(await sp.locator("#spiritReadings tbody tr").count(), 12, "table rows");
    await sp.setViewportSize({ width: 400, height: 800 });
    const wide = await sp.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    await sp.setViewportSize({ width: 1280, height: 900 });
    eq(wide, false, "horizontal scroll at 400px");
  });
  await check("the calculator page and /bis link the guides", async () => {
    for (const path of ["/", "/bis"]) {
      await sp.goto(BASE + path);
      eq(await sp.locator('main a[href="/guides/stat-weights"]').count() > 0, true, "stat weights link on " + path);
      eq(await sp.locator('main a[href="/guides/downranking"]').count() > 0, true, "downranking link on " + path);
      eq(await sp.locator('main a[href="/guides/spirit-regen"]').count() > 0, true, "spirit regen link on " + path);
    }
  });
  await check("the header nav is present on / and /about, with the current page marked", async () => {
    await sp.goto(BASE + "/about");
    eq(await sp.locator('header.site nav a[aria-current="page"]').innerText(), "About", "current on /about");
    eq(await sp.locator("header.site nav a").first().innerText(), "Calculator", "first link");
    await sp.goto(BASE + "/");
    eq(await sp.locator('header.site nav a[aria-current="page"]').innerText(), "Calculator", "current on /");
    eq(await sp.locator("footer.site-foot").count(), 1, "footer");
  });
  await check("the header carries the art, the tagline and the wordmark on /, /bis and an item page", async () => {
    for (const path of ["/", "/bis", "/items/holy-shroud"]) {
      await sp.goto(BASE + path);
      const bg = await sp.locator("header.site").evaluate((el) => getComputedStyle(el).backgroundImage);
      eq(bg.includes("header-tide.svg"), true, "header art on " + path);
      const tag = (await sp.locator("header.site .tagline").innerText()).replace(/\s+/g, " ");
      eq(tag.includes("Resto Shaman stat weights and best in slot"), true, "tagline on " + path);
      eq(tag.includes("WoW Forever beta 1.60.1, level 30. Every number is in points of Healing."), true, "second line on " + path);
      eq(await sp.locator("header.site .mark img").evaluate((img) => img.naturalWidth > 0), true, "wordmark image on " + path);
      eq(await sp.locator("header.site h1, header.site h2, header.site h3").count(), 0, "no headings in the header on " + path);
      eq(await sp.locator("h1").count(), 1, "one h1 on " + path);
    }
    const res = await fetch(BASE + "/art/header-tide.svg");
    eq(res.status, 200, "art status");
    eq(res.headers.get("content-type").startsWith("image/svg+xml"), true, "art content type");
    await sp.setViewportSize({ width: 400, height: 800 });
    for (const path of ["/", "/bis", "/items/holy-shroud"]) {
      await sp.goto(BASE + path);
      const r = await sp.evaluate(() => ({
        wide: document.documentElement.scrollWidth > window.innerWidth,
        out: [...document.querySelectorAll("header.site nav a")].filter((a) => a.getBoundingClientRect().right > window.innerWidth).length,
        rows: new Set([...document.querySelectorAll("header.site nav a")].map((a) => Math.round(a.getBoundingClientRect().top))).size,
      }));
      eq(r.wide, false, "sideways scroll at 400px on " + path);
      eq(r.out, 0, "nav links inside the viewport on " + path);
      eq(r.rows, 1, "nav on one row at 400px on " + path);
    }
    await sp.setViewportSize({ width: 1280, height: 900 });
  });
  await check("the skip link is hidden until focused and jumps to main", async () => {
    await sp.goto(BASE + "/about");
    await sp.keyboard.press("Tab");
    eq(await sp.evaluate(() => document.activeElement?.className), "skip", "first tab stop");
    const left = await sp.evaluate(() => document.activeElement.getBoundingClientRect().left);
    if (left < 0) throw new Error("skip link is off screen while focused");
  });
  await check("/about/ redirects 308 to /about", async () => {
    const res = await fetch(BASE + "/about/", { redirect: "manual" });
    eq(res.status, 308, "status");
    eq(new URL(res.headers.get("location"), BASE).pathname, "/about", "location");
  });
  await check("/no-such-page returns 404 with Page not found and noindex", async () => {
    const res = await sp.goto(BASE + "/no-such-page");
    eq(res.status(), 404, "status");
    eq(await sp.locator("h1").innerText(), "Page not found", "h1");
    eq(await sp.locator('meta[name="robots"]').getAttribute("content"), "noindex", "robots");
    eq(await sp.locator('main a[href="/"]').count(), 1, "calculator link");
  });
  await check("no console errors on the site pages", async () => eq(siteErrors.join(" | "), "", "console errors"));
  await siteCtx.close();

  const phone = await browser.newContext({ viewport: { width: 400, height: 800 } });
  const phonePage = await phone.newPage();
  await phonePage.goto(BASE + "/");
  await phonePage.waitForSelector("h1");
  await check("at 400px wide the page does not scroll sideways", async () => {
    const [sw, iw] = await phonePage.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    if (sw > iw) throw new Error(`scrollWidth ${sw} > innerWidth ${iw}`);
  });
  await check("at 400px with every panel open and unusable gear shown there is no sideways scroll", async () => {
    await phonePage.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
    await phonePage.locator("#showAll").check();
    const [sw, iw] = await phonePage.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    if (sw > iw) throw new Error(`scrollWidth ${sw} > innerWidth ${iw}`);
  });
  await phone.close();

  const dark = await browser.newContext({ colorScheme: "dark" });
  const darkPage = await dark.newPage();
  await darkPage.goto(BASE + "/");
  await darkPage.waitForSelector("h1");
  await check("dark scheme uses the dark body background", async () => {
    eq(await darkPage.evaluate(() => getComputedStyle(document.body).backgroundColor), "rgb(14, 20, 19)", "background");
  });
  await dark.close();
} finally {
  await browser.close();
  server.close();
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log("Failed:\n  " + failures.join("\n  "));
  process.exit(1);
}
process.exit(0);
