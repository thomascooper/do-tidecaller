// A tiny static server that behaves like Vercel with cleanUrls and trailingSlash false:
// /x serves dist/x/index.html (or dist/x.html), /x/ redirects 308 to /x, unknown paths
// serve dist/404.html with status 404.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

/** Start the server on `port` (0 picks a free one). Resolves to the http.Server. */
export function serveDist({ port = 4173, dir } = {}) {
  const root = resolve(dir ?? join(fileURLToPath(new URL("..", import.meta.url)), "dist"));
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    let path = decodeURIComponent(url.pathname);
    if (path.length > 1 && path.endsWith("/")) {
      res.writeHead(308, { Location: path.slice(0, -1) + url.search });
      res.end();
      return;
    }
    const safe = normalize(path).replace(/^(\.\.[/\\])+/, "");
    const candidates = [join(root, safe), join(root, safe, "index.html"), join(root, safe + ".html")];
    for (const file of candidates) {
      if (file.startsWith(root) && (await isFile(file))) {
        res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
        res.end(await readFile(file));
        return;
      }
    }
    const notFound = join(root, "404.html");
    res.writeHead(404, { "Content-Type": TYPES[".html"] });
    res.end((await isFile(notFound)) ? await readFile(notFound) : "Not found");
  });
  return new Promise((ok, fail) => {
    server.once("error", fail);
    server.listen(port, "127.0.0.1", () => ok(server));
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = await serveDist({ port: Number(process.env.PORT ?? 4173) });
  console.log(`Serving dist on http://127.0.0.1:${server.address().port}`);
}
