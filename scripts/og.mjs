// Run by hand (node scripts/og.mjs), not by the build: renders the 1200x630 social cards and the
// PNG icons into public/ with playwright-core. Commit the PNGs it writes.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHROMIUM = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const font = async (pkg, file) => (await readFile(join(root, "node_modules", pkg, "files", file))).toString("base64");
const faces = `
@font-face{font-family:"Marcellus SC";src:url(data:font/woff2;base64,${await font("@fontsource/marcellus-sc", "marcellus-sc-latin-400-normal.woff2")}) format("woff2")}
@font-face{font-family:"IBM Plex Sans";font-weight:500;src:url(data:font/woff2;base64,${await font("@fontsource/ibm-plex-sans", "ibm-plex-sans-latin-500-normal.woff2")}) format("woff2")}
@font-face{font-family:"IBM Plex Mono";font-weight:500;src:url(data:font/woff2;base64,${await font("@fontsource/ibm-plex-mono", "ibm-plex-mono-latin-500-normal.woff2")}) format("woff2")}`;

// The wave mark of public/favicon.svg, scaled into the middle of a full-bleed square.
const waves = `<path d="M9 30c7-10 14-10 20 0s13 10 26 0" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M9 47c7-10 14-10 20 0s13 10 26 0" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`;
const mark = (size, pad) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${-pad} ${-pad} ${64 + 2 * pad} ${64 + 2 * pad}"><rect x="${-pad}" y="${-pad}" width="${64 + 2 * pad}" height="${64 + 2 * pad}" fill="#0d6b62"/>${waves}</svg>`;

const cards = [
  ["home", "Calculator", "Stat weights and best in slot, worked out from your own fight"],
  ["bis", "Best in slot", "The best Resto Shaman gear for level 30, scored in points of Healing"],
  ["items", "Item database", "All 155 items, with where each one comes from and how it ranks"],
  ["guides", "Guides", "Stat weights, downranking and Spirit regen, explained from the numbers"],
  ["about", "About", "Where the numbers come from and how far to trust them"],
];

const card = ([, kind, line]) => `<!doctype html><meta charset="utf-8"><style>${faces}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:#0e1413;color:#e2eae7;font-family:"IBM Plex Sans",sans-serif;padding:72px 80px;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden}
.bar{position:absolute;left:0;top:0;bottom:0;width:16px;background:#4fc4b5}
.row{display:flex;align-items:center;gap:28px}
.word{font-family:"Marcellus SC",serif;font-size:84px;letter-spacing:.02em;line-height:1}
.kind{font-family:"IBM Plex Mono",monospace;font-weight:500;font-size:30px;color:#4fc4b5;text-transform:uppercase;letter-spacing:.08em;margin-bottom:22px}
.line{font-size:46px;line-height:1.25;max-width:960px;font-weight:500}
.foot{font-family:"IBM Plex Mono",monospace;font-weight:500;font-size:28px;color:#93a39f}
</style><div class="bar"></div>
<div class="row">${mark(104, 0).replace('<rect ', '<rect rx="22" ')}<div class="word">Tidecaller</div></div>
<div><div class="kind">${kind}</div><div class="line">${line}</div></div>
<div class="foot">Resto Shaman, WoW Forever</div>`;

await mkdir(join(root, "public", "og"), { recursive: true });
const browser = await chromium.launch({ executablePath: CHROMIUM, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const c of cards) {
    await page.setContent(card(c));
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: join(root, "public", "og", `${c[0]}.png`) });
    console.log(`public/og/${c[0]}.png`);
  }
  // PNG icons are the badge of public/favicon.svg: `scale` is its share of the square, `bg` the
  // full-bleed colour behind it (none = transparent).
  const totem = (await readFile(join(root, "public", "favicon.svg"), "utf8")).replace("<svg ", '<svg width="100%" height="100%" ');
  const icon = async (size, scale, bg) => {
    const p = await browser.newPage({ viewport: { width: size, height: size } });
    const box = Math.round(size * scale);
    await p.setContent(
      `<style>html,body{margin:0;background:${bg ?? "transparent"}}div{width:${box}px;height:${box}px;position:absolute;left:${(size - box) / 2}px;top:${(size - box) / 2}px}</style><div>${totem}</div>`,
    );
    const png = await p.screenshot({ omitBackground: !bg });
    await p.close();
    return png;
  };
  const files = [
    ["apple-touch-icon.png", 180, 0.84, "#03060d"],
    ["icon-192.png", 192, 1, null],
    ["icon-512.png", 512, 1, null],
    ["icon-maskable-512.png", 512, 0.72, "#0a2a36"],
  ];
  for (const [name, size, scale, bg] of files) {
    await writeFile(join(root, "public", name), await icon(size, scale, bg));
    console.log(`public/${name}`);
  }
  // favicon.ico: an ICO header, one directory entry per image, then the PNG images themselves.
  const sizes = [16, 32, 48];
  const pngs = [];
  for (const s of sizes) pngs.push(await icon(s, 1, null));
  const head = Buffer.alloc(6 + 16 * sizes.length);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(sizes.length, 4);
  let offset = head.length;
  sizes.forEach((s, i) => {
    const at = 6 + 16 * i;
    head.writeUInt8(s, at);
    head.writeUInt8(s, at + 1);
    head.writeUInt16LE(1, at + 4);
    head.writeUInt16LE(32, at + 6);
    head.writeUInt32LE(pngs[i].length, at + 8);
    head.writeUInt32LE(offset, at + 12);
    offset += pngs[i].length;
  });
  await writeFile(join(root, "public", "favicon.ico"), Buffer.concat([head, ...pngs]));
  console.log("public/favicon.ico");
} finally {
  await browser.close();
}
