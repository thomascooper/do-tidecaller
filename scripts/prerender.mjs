// Runs after the client and SSR builds: writes one HTML file per route into dist/.
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { gzipSync } from "node:zlib";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
// Vercel Web Analytics counts page views on the production deployment only.
const analytics = process.env.VERCEL_ENV === "production";

// A standalone script's hashed file name (vite.config.ts names its entries assets/<name>-<hash>.js), and the
// build check that the script plus the chunks it imports statically stays under a gzip limit.
// Dynamic imports (jQuery, which loads only when the 3D model does) are not followed.
async function standalone(name, label, limit) {
  const found = (await readdir(join(dist, "assets"))).filter((f) => new RegExp(`^${name}-.+\\.js$`).test(f));
  if (found.length !== 1) throw new Error(`expected one assets/${name}-*.js, found ${found.length}`);
  const files = new Set([found[0]]);
  for (const file of files) {
    const code = await readFile(join(dist, "assets", file), "utf8");
    for (const m of code.matchAll(/(?:from|import)\s*["']\.\/([^"']+\.js)["']/g)) files.add(m[1]);
  }
  let gzip = 0;
  for (const file of files) gzip += gzipSync(await readFile(join(dist, "assets", file))).length;
  if (gzip > limit) throw new Error(`${label} is ${gzip} bytes gzipped, limit ${limit}`);
  console.log(`${label}: ${gzip} bytes gzipped (${[...files].join(", ")})`);
  return `/assets/${found[0]}`;
}
const tipsScript = await standalone("tips", "item popup script", 12 * 1024);
const model3dScript = await standalone("model3d", "3D character script", 8 * 1024);

const template = await readFile(join(dist, "index.html"), "utf8");
const { routes, renderDocument, sitemapXml, robotsTxt } = await import(pathToFileURL(join(root, "dist-ssr", "entry-server.js")).href);

for (const route of routes) {
  // "/404" is the not-found page: Vercel serves dist/404.html for unknown paths.
  const file =
    route.path === "/" ? join(dist, "index.html") : route.path === "/404" ? join(dist, "404.html") : join(dist, route.path, "index.html");
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, renderDocument(route, template, { analytics, tipsScript, model3dScript }));
  console.log(`prerendered ${route.path}`);
}

await writeFile(join(dist, "sitemap.xml"), sitemapXml(routes.filter((r) => !r.noindex).map((r) => r.path)));
await writeFile(join(dist, "robots.txt"), robotsTxt());
console.log("wrote sitemap.xml and robots.txt");
