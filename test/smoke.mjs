// Browser smoke checks: serves dist/ the way Vercel does and drives it in Chromium.
// Run through `npm run smoke` (which builds first). The browser comes from CHROMIUM_PATH.
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
  // No icon is served until US-020 adds one; drop the favicon filter there.
  page.on("console", (m) => {
    if (m.type() === "error" && !m.location().url.endsWith("/favicon.ico")) errors.push(`${m.text()} (${m.location().url})`);
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE + "/");
  await page.waitForSelector("h1");

  const pressed = (name) => page.getByRole("button", { name }).getAttribute("aria-pressed");

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
  await check("stat weights: verdict, bars and readouts at defaults", async () => {
    await page.getByRole("button", { name: "Dungeon boss" }).click();
    eq((await page.locator("#verdict").innerText()).replace(/\s+/g, " "), "MP5 > Intellect > Healing = Spell Power > Spirit", "verdict");
    eq(await page.locator('.bar[data-stat="mp5"] .v').innerText(), "2.75", "MP5 bar");
    eq(await page.locator(".bar").count(), 5, "bars without Stamina");
    eq(await page.locator("#wnote").innerText(), "1 Healing = 1.00", "note");
    eq(await page.locator(".kv").count(), 7, "readouts");
    eq(await page.locator(".kv", { hasText: "Mana for the fight" }).locator(".v").innerText(), "3,750 19.0 casts", "mana for the fight");
  });
  await check("stat weights: Raid boss MP5 reads 4.49", async () => {
    await page.getByRole("button", { name: "Raid boss" }).click();
    eq(await page.locator('.bar[data-stat="mp5"] .v').innerText(), "4.49", "MP5 bar");
    await page.getByRole("button", { name: "Dungeon boss" }).click();
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
  await check("no console errors", async () => eq(errors.join(" | "), "", "console errors"));
  await ctx.close();

  const phone = await browser.newContext({ viewport: { width: 400, height: 800 } });
  const phonePage = await phone.newPage();
  await phonePage.goto(BASE + "/");
  await phonePage.waitForSelector("h1");
  await check("at 400px wide the page does not scroll sideways", async () => {
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
