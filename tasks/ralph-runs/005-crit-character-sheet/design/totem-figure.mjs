// The paperdoll's centre art: the Tidecaller's four totems on a rune-lit stone, original art reusing
// the header scene's totem drawings at a larger scale. Output: totem-figure.svg (360 x 440).
import { readFileSync, writeFileSync } from "node:fs";
const src = readFileSync(new URL("../../../../scripts/header-art.mjs", import.meta.url), "utf8");
const defs = src.slice(src.indexOf("add(`<defs>") + 5, src.indexOf("</defs>`);") + 7);
const fns = src.slice(src.indexOf("const eyes ="), src.indexOf("const WX ="));
const helpers = src.slice(src.indexOf("let seed"), src.indexOf("const out = []"));
const body = new Function(`${helpers}\nconst TOP = 0;\n${fns}\nreturn { waterTotem, fireTotem, earthTotem, airTotem, place, r, f, i0 };`)();
const { waterTotem, fireTotem, earthTotem, airTotem, place, r, f, i0 } = body;
const W = 360, H = 440, GY = 382;
let s = defs.replace("<defs>", `<defs><radialGradient id="floor"><stop offset="0" stop-color="#5fe6ff" stop-opacity=".35"/><stop offset="1" stop-color="#5fe6ff" stop-opacity="0"/></radialGradient><linearGradient id="stone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2f37"/><stop offset="1" stop-color="#070d11"/></linearGradient>`);
// floor glow and a round stone dais
s += `<ellipse cx="180" cy="${GY + 6}" rx="170" ry="34" fill="url(#floor)"/>`;
s += `<path d="M44,${GY} Q180,${GY - 30} 316,${GY} L300,${GY + 22} Q180,${GY + 46} 60,${GY + 22} Z" fill="url(#stone)"/>`;
s += `<path d="M44,${GY} Q180,${GY - 30} 316,${GY}" fill="none" stroke="#5fd8e6" stroke-opacity=".4" stroke-width="1.4"/>`;
// side totems behind, the water totem large in front
s += place(70, GY - 6, 1.55, earthTotem());
s += place(122, GY - 14, 1.6, fireTotem());
s += place(240, GY - 14, 1.6, airTotem());
s += place(180, GY - 8, 2.1, waterTotem());
// rising motes
let motes = "";
for (let i = 0; i < 70; i++) motes += `<circle cx="${i0(r(30, 330))}" cy="${i0(r(40, GY - 10))}" r="${f(r(0.6, 2.2))}" fill="${r(0, 1) < 0.8 ? "#9ff6ff" : "#fff"}" opacity="${f(r(0.2, 0.8))}"/>`;
s += motes;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${s}</svg>`;
writeFileSync(new URL("./totem-figure.svg", import.meta.url), svg);
console.log("bytes", svg.length);
