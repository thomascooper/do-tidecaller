// Tidecaller header scene, original procedural art.
// A storm over the sea at night; a sea cliff on the right holds four glowing totems (earth, fire,
// water, air) and a stream of sea water rises and curls up to the tallest one: the tide being called.
// 3200 x 360, horizon at y 268. The focal point sits in the rightmost ~900 units, low in the frame,
// so the art can be anchored right-bottom behind a header whose nav runs along the top.
import { writeFileSync } from "node:fs";

const W = 3200, H = 360, HZ = 268;
let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const r = (a, b) => a + (b - a) * rnd();
const f = (n) => Math.round(n * 10) / 10;
const i0 = (n) => Math.round(n);

const out = [];
const add = (s) => out.push(s);

add(`<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03060d"/><stop offset=".45" stop-color="#071424"/><stop offset=".8" stop-color="#0c2a3a"/><stop offset="1" stop-color="#134a5a"/></linearGradient>
<radialGradient id="halo"><stop offset="0" stop-color="#cfefff" stop-opacity=".5"/><stop offset=".22" stop-color="#7cc8e6" stop-opacity=".16"/><stop offset="1" stop-color="#7cc8e6" stop-opacity="0"/></radialGradient>
<radialGradient id="moon" cx=".4" cy=".38"><stop offset="0" stop-color="#fff"/><stop offset=".7" stop-color="#e3f3fb"/><stop offset="1" stop-color="#a9d2e6"/></radialGradient>
<radialGradient id="flash"><stop offset="0" stop-color="#bff3ff" stop-opacity=".45"/><stop offset="1" stop-color="#bff3ff" stop-opacity="0"/></radialGradient>
<radialGradient id="g-earth"><stop offset="0" stop-color="#ffbe55" stop-opacity=".55"/><stop offset="1" stop-color="#ffbe55" stop-opacity="0"/></radialGradient>
<radialGradient id="g-fire"><stop offset="0" stop-color="#ff7838" stop-opacity=".6"/><stop offset="1" stop-color="#ff5a1f" stop-opacity="0"/></radialGradient>
<radialGradient id="g-water"><stop offset="0" stop-color="#7af6ff" stop-opacity=".7"/><stop offset=".45" stop-color="#2fc0e6" stop-opacity=".22"/><stop offset="1" stop-color="#22b5e0" stop-opacity="0"/></radialGradient>
<radialGradient id="g-air"><stop offset="0" stop-color="#d9c8ff" stop-opacity=".55"/><stop offset="1" stop-color="#a98bff" stop-opacity="0"/></radialGradient>
<linearGradient id="cloud" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d4d68"/><stop offset=".5" stop-color="#14283b"/><stop offset="1" stop-color="#0a1522"/></linearGradient>
<linearGradient id="cloudFar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c3750"/><stop offset="1" stop-color="#0b1928"/></linearGradient>
<linearGradient id="rock" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#11222b"/><stop offset=".5" stop-color="#08131a"/><stop offset="1" stop-color="#04080b"/></linearGradient>
<linearGradient id="wood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#04070a"/><stop offset=".55" stop-color="#101a20"/><stop offset="1" stop-color="#22343c"/></linearGradient>
<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3d27a"/><stop offset="1" stop-color="#9b6a24"/></linearGradient>
<linearGradient id="tide" gradientUnits="userSpaceOnUse" x1="2380" y1="360" x2="2900" y2="100"><stop offset="0" stop-color="#3fd2ee" stop-opacity=".15"/><stop offset=".5" stop-color="#59e4f6" stop-opacity=".75"/><stop offset="1" stop-color="#c8fbff" stop-opacity="1"/></linearGradient>
<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b2b36"/><stop offset="1" stop-color="#04121a"/></linearGradient>
<filter id="b2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2"/></filter>
<filter id="b5" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
<filter id="b10" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>
</defs>`);

// sky and stars
add(`<rect width="${W}" height="${HZ + 4}" fill="url(#sky)"/>`);
let stars = "";
for (let i = 0; i < 170; i++) {
  const y = Math.pow(rnd(), 1.5) * (HZ - 70);
  stars += `<circle cx="${i0(r(0, W))}" cy="${i0(y)}" r="${f(r(0.5, 1.4))}" opacity="${f(r(0.3, 0.95) * (1 - y / HZ))}"/>`;
}
add(`<g fill="#dff4ff">${stars}</g>`);

// moon
const MX = 2240, MY = 118;
add(`<circle cx="${MX}" cy="${MY}" r="200" fill="url(#halo)"/><circle cx="${MX}" cy="${MY}" r="27" fill="url(#moon)"/>`);
add(`<g fill="#9cc6da" opacity=".35"><circle cx="${MX - 8}" cy="${MY - 5}" r="5.5"/><circle cx="${MX + 9}" cy="${MY + 7}" r="3.8"/><circle cx="${MX + 3}" cy="${MY - 13}" r="2.3"/></g>`);

function cloudBank(x0, x1, base, size, fill, opacity) {
  let c = "";
  for (let x = x0; x < x1; x += size * r(0.35, 0.7)) {
    const rr = size * r(0.45, 1);
    c += `<circle cx="${i0(x)}" cy="${i0(base - rr * r(0.2, 0.6))}" r="${i0(rr)}"/>`;
  }
  c += `<rect x="${x0}" y="${base - 4}" width="${x1 - x0}" height="${i0(size * 0.5)}" rx="${i0(size * 0.25)}"/>`;
  return `<g fill="url(#${fill})" opacity="${opacity}" filter="url(#b2)">${c}</g>`;
}
add(cloudBank(-100, 1500, 64, 56, "cloudFar", 0.45));
add(cloudBank(2000, 3300, 52, 70, "cloudFar", 0.6));
add(cloudBank(900, 1800, 150, 38, "cloud", 0.55));
add(cloudBank(2380, 3300, 96, 58, "cloud", 0.95));
add(cloudBank(2560, 2950, 38, 46, "cloud", 0.85));

// lightning between the moon and the cliff
function bolt(x, y, yEnd, spread, steps) {
  const pts = [[x, y]];
  const y0 = y;
  for (let i = 1; i <= steps; i++) {
    x += r(-spread, spread);
    y += (yEnd - y0) / steps;
    pts.push([i0(x), i0(y)]);
  }
  return pts;
}
const main = bolt(2480, 104, HZ, 22, 10);
const br1 = bolt(main[3][0], main[3][1], 212, 16, 4);
const br2 = bolt(main[6][0], main[6][1], 246, 12, 3);
const poly = (p) => p.map((q) => q.join(",")).join(" ");
add(`<circle cx="2480" cy="130" r="170" fill="url(#flash)"/>`);
for (const p of [main, br1, br2]) {
  const w = p === main ? 1 : 0.6;
  add(`<g fill="none" stroke-linejoin="round"><polyline points="${poly(p)}" stroke="#6fe3ff" stroke-width="${12 * w}" stroke-opacity=".45" filter="url(#b5)"/><polyline points="${poly(p)}" stroke="#c9f7ff" stroke-width="${3.4 * w}"/><polyline points="${poly(p)}" stroke="#fff" stroke-width="${1.3 * w}"/></g>`);
}

// far headlands
function ridge(x0, x1, base, hmax, step) {
  let d = `M${x0},${base}`;
  let h = 0;
  for (let x = x0; x <= x1; x += step) {
    const t = (x - x0) / (x1 - x0);
    h = Math.max(0, Math.min(hmax, h + r(-9, 9)));
    d += `L${x},${i0(base - h * Math.sin(Math.PI * t) ** 0.4 - hmax * 0.5 * Math.sin(Math.PI * t))}`;
  }
  return d + `L${x1},${base}Z`;
}
add(`<path d="${ridge(1200, 1820, HZ + 2, 34, 20)}" fill="#08141c"/><path d="${ridge(-40, 520, HZ + 2, 30, 20)}" fill="#08141c"/>`);

// sea
add(`<rect y="${HZ}" width="${W}" height="${H - HZ}" fill="url(#sea)"/>`);
let glint = "";
for (let i = 0; i < 60; i++) {
  const t = Math.pow(rnd(), 1.3);
  const y = HZ + 3 + t * (H - HZ - 10);
  const spread = 8 + (y - HZ) * 0.8;
  const w = r(8, 36) * (1 - t * 0.5);
  glint += `<rect x="${i0(MX + r(-spread, spread) - w / 2)}" y="${i0(y)}" width="${i0(w)}" height="1.6" rx=".8" opacity="${f(r(0.25, 0.8) * (1 - t))}"/>`;
}
add(`<g fill="#d8f4ff">${glint}</g>`);

function wave(y0, amp, len, fill, crest, co, phase) {
  let d = `M-20,${H + 5}L-20,${y0}`;
  let top = "";
  for (let x = -20; x <= W + 20; x += 12) {
    const y = y0 + amp * Math.sin((x / len) * 2 * Math.PI + phase) + amp * 0.45 * Math.sin((x / (len * 0.43)) * 2 * Math.PI + phase * 1.7);
    d += `L${x},${f(y)}`;
    top += `${top ? "L" : "M"}${x},${f(y)}`;
  }
  return `<path d="${d}L${W + 20},${H + 5}Z" fill="${fill}"/><path d="${top}" fill="none" stroke="${crest}" stroke-opacity="${co}" stroke-width="1.5"/>`;
}
add(wave(HZ + 8, 2, 140, "#0a2630", "#5fb9c4", 0.22, 0.3));
add(wave(HZ + 22, 3.5, 190, "#0b2d38", "#6fd0d6", 0.28, 1.1));
add(wave(HZ + 40, 5, 260, "#0c3440", "#7fe0e0", 0.34, 2.2));

// the cliff, entering from the right edge
const CL = 2600, TOP = 250;
let cliff = `M${CL},${H + 5}L${CL + 16},${HZ + 34}L${CL + 40},${TOP + 40}L${CL + 62},${TOP + 16}L${CL + 92},${TOP + 4}L${CL + 120},${TOP}`;
for (let x = CL + 140; x < W + 40; x += 26) cliff += `L${x},${i0(TOP + r(-3, 3) - Math.max(0, x - 3060) * 0.18)}`;
cliff += `L${W + 40},${H + 5}Z`;
add(`<path d="${cliff}" fill="url(#rock)"/>`);
add(`<path d="M${CL + 40},${TOP + 40}L${CL + 62},${TOP + 16}L${CL + 92},${TOP + 4}L${CL + 120},${TOP}L${W},${TOP - 20}" fill="none" stroke="#5fd8e6" stroke-opacity=".32" stroke-width="1.5"/>`);
let facets = "";
for (let i = 0; i < 30; i++) {
  const x = r(CL + 50, W), y = r(TOP + 12, H - 6);
  facets += `M${i0(x)},${i0(y)}l${i0(r(-22, 22))},${i0(r(8, 24))}`;
}
add(`<path d="${facets}" stroke="#1b3540" stroke-opacity=".7" stroke-width="1.2" fill="none"/>`);

// ---------- totems, drawn in local units (base at 0,0, up is negative y) ----------
const eyes = (y, dx, rx, ry, c, slant = 0) =>
  `<g fill="${c}" filter="url(#b2)"><ellipse cx="${-dx}" cy="${y}" rx="${rx * 1.9}" ry="${ry * 1.9}"/><ellipse cx="${dx}" cy="${y}" rx="${rx * 1.9}" ry="${ry * 1.9}"/></g>` +
  `<g fill="#fff"><ellipse cx="${-dx}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${slant} ${-dx} ${y})"/><ellipse cx="${dx}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${-slant} ${dx} ${y})"/></g>`;
const rim = (d) => `<path d="${d}" fill="none" stroke="#7fe8f5" stroke-opacity=".35" stroke-width=".9"/>`;

function waterTotem() {
  let s = "";
  s += `<circle cx="0" cy="-104" r="96" fill="url(#g-water)"/>`;
  // rune circle
  let runes = "";
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const cx = Math.cos(a) * 60, cy = -104 + Math.sin(a) * 60;
    let g = "";
    for (let k = 0; k < 3; k++) g += `M${i0(r(-4, 4))},${i0(r(-5, 5))}L${i0(r(-4, 4))},${i0(r(-5, 5))}`;
    runes += `<path transform="translate(${f(cx)},${f(cy)}) rotate(${i0((a * 180) / Math.PI + 90)})" d="${g}"/>`;
  }
  s += `<g opacity=".6"><circle cx="0" cy="-104" r="72" fill="none" stroke="#5fe6ff" stroke-opacity=".38" stroke-width="1.2"/><circle cx="0" cy="-104" r="48" fill="none" stroke="#5fe6ff" stroke-opacity=".22"/><g stroke="#8ff3ff" stroke-width="1.4" stroke-linecap="round" fill="none">${runes}</g></g>`;
  // wings, swept up and out with a scalloped trailing edge
  const wing = (k) => `<path transform="scale(${k},1)" d="M8,-104 C26,-112 44,-118 58,-136 C62,-142 66,-150 70,-156 C68,-144 66,-134 60,-124 C56,-122 52,-118 50,-112 C46,-112 42,-108 40,-104 C36,-104 32,-100 30,-96 C24,-96 16,-94 8,-92 Z" fill="url(#wood)"/>`;
  s += wing(1) + wing(-1);
  s += rim("M8,-104 C26,-112 44,-118 58,-136 C62,-142 66,-150 70,-156");
  // horns
  const horn = (k) => `<path transform="scale(${k},1)" d="M10,-122 C18,-128 22,-138 20,-150 C26,-140 26,-128 16,-118 Z" fill="url(#gold)"/>`;
  s += horn(1) + horn(-1);
  // head mask
  s += `<path d="M-13,-92 L13,-92 L15,-114 Q0,-128 -15,-114 Z" fill="url(#wood)"/>`;
  s += rim("M13,-92 L15,-114 Q0,-128 -15,-114");
  s += `<path d="M-12,-112 L-3,-108 M12,-112 L3,-108" stroke="#2c434c" stroke-width="1.6"/>`;
  s += eyes(-105, 6.5, 2.6, 1.3, "#7ff6ff", 14);
  s += `<path d="M-7,-96 l2,-3 l2,3 l2,-3 l2,3 l2,-3 l2,3" fill="none" stroke="#7ff6ff" stroke-opacity=".6" stroke-width="1"/>`;
  // pole with a band and a lower face
  s += `<rect x="-7" y="-92" width="14" height="88" fill="url(#wood)"/>${rim("M7,-92 L7,-4")}`;
  s += `<rect x="-9" y="-88" width="18" height="3.5" fill="url(#gold)"/><rect x="-9" y="-30" width="18" height="3" fill="url(#gold)" opacity=".8"/>`;
  s += `<path d="M-10,-50 L10,-50 L9,-70 L-9,-70 Z" fill="url(#wood)"/>`;
  s += eyes(-62, 4, 1.8, 1, "#7ff6ff", 10);
  s += `<path d="M-4,-54 L4,-54" stroke="#7ff6ff" stroke-opacity=".5" stroke-width="1.2"/>`;
  // plinth
  s += `<path d="M-16,2 L16,2 L12,-6 L-12,-6 Z" fill="#0a1419"/>`;
  // hanging beads from the wings
  for (const k of [1, -1]) s += `<path d="M${k * 40},-104 L${k * 40},-86 M${k * 54},-120 L${k * 54},-100" stroke="#3b555e" stroke-width=".9"/><circle cx="${k * 40}" cy="-85" r="1.8" fill="#7ff6ff"/><circle cx="${k * 54}" cy="-99" r="1.8" fill="#7ff6ff"/>`;
  // the sigil: a ring with a water drop
  s += `<circle cx="0" cy="-146" r="22" fill="url(#g-water)"/>`;
  s += `<circle cx="0" cy="-146" r="11" fill="none" stroke="#bff9ff" stroke-width="1.6" stroke-opacity=".9"/>`;
  s += `<path d="M0,-156 C5,-149 6,-145 0,-139 C-6,-145 -5,-149 0,-156 Z" fill="#8ff6ff" filter="url(#b2)"/><path d="M0,-154 C4,-148 4.6,-145 0,-141 C-4.6,-145 -4,-148 0,-154 Z" fill="#f2feff"/>`;
  return s;
}
function fireTotem() {
  let s = `<circle cx="0" cy="-62" r="62" fill="url(#g-fire)"/>`;
  s += `<path d="M-11,-70 C-14,-80 -8,-84 -9,-94 C-3,-88 -2,-82 0,-98 C4,-88 6,-86 8,-94 C12,-84 14,-78 11,-70 Z" fill="#ff8a3a" filter="url(#b2)" opacity=".85"/>`;
  s += `<path d="M-6,-70 C-8,-78 -3,-80 -3,-87 C0,-82 1,-80 2,-89 C5,-82 7,-78 6,-70 Z" fill="#ffd27a"/>`;
  s += `<path d="M-13,-70 L13,-70 L10,-66 L-10,-66 Z" fill="url(#gold)"/>`;
  s += `<path d="M-11,-66 L11,-66 L10,-46 L-10,-46 Z" fill="url(#wood)"/>${rim("M11,-66 L10,-46")}`;
  s += eyes(-57, 4.6, 2, 1, "#ff9a5a", 18);
  s += `<path d="M-5,-50 L5,-50" stroke="#ff9a5a" stroke-opacity=".6" stroke-width="1.2"/>`;
  s += `<rect x="-6" y="-46" width="12" height="42" fill="url(#wood)"/><rect x="-8" y="-24" width="16" height="3" fill="url(#gold)" opacity=".8"/>`;
  s += `<path d="M-13,2 L13,2 L10,-5 L-10,-5 Z" fill="#0a1419"/>`;
  return s;
}
function earthTotem() {
  let s = `<circle cx="0" cy="-44" r="52" fill="url(#g-earth)"/>`;
  s += `<path d="M-16,-34 L16,-34 L14,-60 Q0,-68 -14,-60 Z" fill="url(#wood)"/>${rim("M16,-34 L14,-60 Q0,-68 -14,-60")}`;
  for (const k of [1, -1]) s += `<path transform="scale(${k},1)" d="M14,-40 C24,-42 28,-52 24,-62 C22,-54 18,-48 12,-46 Z" fill="#d9c39a" opacity=".9"/>`;
  s += eyes(-52, 6, 2.2, 1.2, "#ffc860", 8);
  s += `<path d="M-7,-40 L7,-40" stroke="#ffc860" stroke-opacity=".6" stroke-width="1.4"/>`;
  s += `<rect x="-8" y="-34" width="16" height="30" fill="url(#wood)"/>`;
  s += `<path d="M-15,2 L15,2 L11,-5 L-11,-5 Z" fill="#0a1419"/>`;
  return s;
}
function airTotem() {
  let s = `<circle cx="0" cy="-70" r="58" fill="url(#g-air)"/>`;
  for (const [x, rot, h] of [[-8, -24, 20], [0, 0, 24], [8, 24, 20]]) {
    s += `<path transform="translate(${x},-80) rotate(${rot})" d="M0,0 C4,-${h * 0.4} 4,-${h * 0.8} 0,-${h} C-4,-${h * 0.8} -4,-${h * 0.4} 0,0 Z" fill="url(#wood)"/>`;
  }
  s += `<path d="M-10,-58 L10,-58 L11,-78 Q0,-86 -11,-78 Z" fill="url(#wood)"/>${rim("M10,-58 L11,-78 Q0,-86 -11,-78")}`;
  s += eyes(-70, 4.6, 2, 1.1, "#d6c8ff", 12);
  s += `<path d="M-4,-62 L4,-62" stroke="#d6c8ff" stroke-opacity=".6" stroke-width="1.2"/>`;
  s += `<rect x="-5" y="-58" width="10" height="54" fill="url(#wood)"/><rect x="-7" y="-36" width="14" height="3" fill="url(#gold)" opacity=".8"/>`;
  s += `<path d="M-12,2 L12,2 L9,-5 L-9,-5 Z" fill="#0a1419"/>`;
  return s;
}
const place = (x, y, sc, body) => `<g transform="translate(${x},${y}) scale(${sc})">${body}</g>`;
const WX = 2905, WB = TOP + 2;

// the tide being called: a ribbon of sea water rising off the waves, curling around to the water totem's sigil
const tide = `M2380,${H - 6} C2460,${HZ + 4} 2560,${HZ - 34} 2660,${HZ - 80} C2760,${HZ - 126} 2812,${WB - 134} 2850,${WB - 146} C2870,${WB - 152} 2884,${WB - 152} ${WX - 11},${WB - 146}`;
add(`<path d="${tide}" fill="none" stroke="#3fd2ee" stroke-width="26" stroke-opacity=".22" filter="url(#b10)" stroke-linecap="round"/>`);
add(`<path d="${tide}" fill="none" stroke="url(#tide)" stroke-width="9" stroke-opacity=".55" filter="url(#b2)" stroke-linecap="round"/>`);
add(`<path d="${tide}" fill="none" stroke="url(#tide)" stroke-width="2.2" stroke-linecap="round"/>`);
const tide2 = `M2420,${H - 2} C2500,${HZ + 22} 2590,${HZ - 14} 2690,${HZ - 62} C2770,${HZ - 100} 2830,${WB - 120} 2876,${WB - 132}`;
add(`<path d="${tide2}" fill="none" stroke="#a8f4ff" stroke-width="1.2" stroke-opacity=".6" stroke-dasharray="2 8" stroke-linecap="round"/>`);
// droplets along the ribbon
let drops = "";
for (let i = 0; i < 40; i++) {
  const t = rnd();
  const x = 2400 + t * 480 + r(-20, 20);
  const y = H - 10 - t * 240 + r(-16, 16) - Math.sin(t * Math.PI) * 24;
  drops += `<circle cx="${i0(x)}" cy="${i0(y)}" r="${f(r(0.7, 2.2))}" opacity="${f(r(0.35, 0.95))}"/>`;
}
add(`<g fill="#c8fbff">${drops}</g>`);

add(place(2770, WB, 1.0, earthTotem()));
add(place(2830, WB, 1.05, fireTotem()));
add(place(WX, WB, 1.0, waterTotem()));
add(place(2990, WB - 4, 1.0, airTotem()));

// motes rising around the totems
let motes = "";
for (let i = 0; i < 70; i++) {
  const x = r(2730, 3060), y = r(WB - 190, WB - 4);
  motes += `<circle cx="${i0(x)}" cy="${i0(y)}" r="${f(r(0.6, 2))}" fill="${rnd() < 0.8 ? "#9ff6ff" : "#fff"}" opacity="${f(r(0.25, 0.85))}"/>`;
}
add(`<g>${motes}</g>`);

// front sea and spray where it breaks on the cliff
add(wave(HZ + 62, 6, 320, "#0b3a45", "#8cecea", 0.42, 3.1));
add(wave(HZ + 80, 7, 380, "#08303a", "#a5f3ef", 0.5, 4.4));
let spray = "";
for (let i = 0; i < 60; i++) spray += `<circle cx="${i0(CL + r(-20, 70))}" cy="${i0(r(HZ + 18, H - 26))}" r="${f(r(0.6, 2))}" opacity="${f(r(0.3, 0.9))}"/>`;
add(`<g fill="#e6fbff">${spray}</g>`);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMaxYMax slice">${out.join("")}</svg>`;
writeFileSync(new URL("./header-tide.svg", import.meta.url), svg);
console.log("bytes", svg.length);
