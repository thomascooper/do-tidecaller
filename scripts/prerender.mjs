// Runs after the client and SSR builds: writes one HTML file per route into dist/.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
// Vercel Web Analytics counts page views on the production deployment only.
const analytics = process.env.VERCEL_ENV === "production";

const template = await readFile(join(dist, "index.html"), "utf8");
const { routes, renderDocument, sitemapXml, robotsTxt } = await import(pathToFileURL(join(root, "dist-ssr", "entry-server.js")).href);

for (const route of routes) {
  // "/404" is the not-found page: Vercel serves dist/404.html for unknown paths.
  const file =
    route.path === "/" ? join(dist, "index.html") : route.path === "/404" ? join(dist, "404.html") : join(dist, route.path, "index.html");
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, renderDocument(route, template, { analytics }));
  console.log(`prerendered ${route.path}`);
}

await writeFile(join(dist, "sitemap.xml"), sitemapXml(routes.filter((r) => !r.noindex).map((r) => r.path)));
await writeFile(join(dist, "robots.txt"), robotsTxt());
console.log("wrote sitemap.xml and robots.txt");
