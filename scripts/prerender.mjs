// Runs after the client and SSR builds: writes one HTML file per route into dist/.
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { gzipSync } from "node:zlib";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
// Vercel Web Analytics counts page views on the production deployment only.
const analytics = process.env.VERCEL_ENV === "production";

// The popup script's hashed file name (vite.config.ts names its entry assets/tips-<hash>.js).
const tips = (await readdir(join(dist, "assets"))).filter((f) => /^tips-.+\.js$/.test(f));
if (tips.length !== 1) throw new Error(`expected one assets/tips-*.js, found ${tips.length}`);
const tipsScript = `/assets/${tips[0]}`;

// Build check: the popup script plus the chunks it imports stays under 12 KB gzipped.
const TIPS_GZIP_LIMIT = 12 * 1024;
const tipsFiles = new Set([tips[0]]);
for (const file of tipsFiles) {
  const code = await readFile(join(dist, "assets", file), "utf8");
  for (const m of code.matchAll(/(?:from|import)\s*["']\.\/([^"']+\.js)["']/g)) tipsFiles.add(m[1]);
}
let tipsGzip = 0;
for (const file of tipsFiles) tipsGzip += gzipSync(await readFile(join(dist, "assets", file))).length;
if (tipsGzip > TIPS_GZIP_LIMIT) throw new Error(`item popup script is ${tipsGzip} bytes gzipped, limit ${TIPS_GZIP_LIMIT}`);
console.log(`item popup script: ${tipsGzip} bytes gzipped (${[...tipsFiles].join(", ")})`);

const template = await readFile(join(dist, "index.html"), "utf8");
const { routes, renderDocument, sitemapXml, robotsTxt } = await import(pathToFileURL(join(root, "dist-ssr", "entry-server.js")).href);

for (const route of routes) {
  // "/404" is the not-found page: Vercel serves dist/404.html for unknown paths.
  const file =
    route.path === "/" ? join(dist, "index.html") : route.path === "/404" ? join(dist, "404.html") : join(dist, route.path, "index.html");
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, renderDocument(route, template, { analytics, tipsScript }));
  console.log(`prerendered ${route.path}`);
}

await writeFile(join(dist, "sitemap.xml"), sitemapXml(routes.filter((r) => !r.noindex).map((r) => r.path)));
await writeFile(join(dist, "robots.txt"), robotsTxt());
console.log("wrote sitemap.xml and robots.txt");
