import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "node-html-parser";
import { renderDocument, routes } from "../src/entry-server";
import { canonicalUrl, SITE_URL } from "../src/site";

const STUB = `<!doctype html><html lang="en"><head><meta charset="utf-8" /><!--app-head--></head><body><!--app-header--><main id="main"><div id="root"><!--app-html--></div></main><!--app-footer--><script type="module" src="/src/entry-client.tsx"></script></body></html>`;

const pages = routes.map((route) => ({ route, doc: parse(renderDocument(route, STUB)) }));

const content = (doc: ReturnType<typeof parse>, selector: string) => doc.querySelector(selector)?.getAttribute("content");

describe("route table", () => {
  it("has the home page", () => {
    expect(routes.map((r) => r.path)).toContain("/");
  });
  it("has unique paths", () => {
    expect(new Set(routes.map((r) => r.path)).size).toBe(routes.length);
  });
  it("has unique titles", () => {
    expect(new Set(pages.map((p) => p.doc.querySelector("title")?.text)).size).toBe(pages.length);
  });
  it("has unique descriptions", () => {
    expect(new Set(pages.map((p) => content(p.doc, 'meta[name="description"]'))).size).toBe(pages.length);
  });
});

describe.each(pages)("SEO for $route.path", ({ route, doc }) => {
  const canonical = canonicalUrl(route.path);

  it("has <html lang=en>", () => {
    expect(doc.querySelector("html")?.getAttribute("lang")).toBe("en");
  });
  it("has a title of at most 65 characters", () => {
    const title = doc.querySelector("title")?.text ?? "";
    expect(title.length).toBeGreaterThan(0);
    expect(title.length).toBeLessThanOrEqual(65);
  });
  it("has a description of 70 to 160 characters", () => {
    const d = content(doc, 'meta[name="description"]') ?? "";
    expect(d.length).toBeGreaterThanOrEqual(70);
    expect(d.length).toBeLessThanOrEqual(160);
  });
  it("has exactly one h1", () => {
    expect(doc.querySelectorAll("h1").length).toBe(1);
  });
  it("has a canonical URL on the site host that matches the route (noindex pages have none)", () => {
    if (route.noindex) {
      expect(doc.querySelector('link[rel="canonical"]')).toBeNull();
      expect(content(doc, 'meta[name="robots"]')).toBe("noindex");
      return;
    }
    expect(content(doc, 'meta[name="robots"]')).toBeUndefined();
    const href = doc.querySelector('link[rel="canonical"]')?.getAttribute("href");
    expect(href).toBe(canonical);
    expect(href!.startsWith(SITE_URL)).toBe(true);
    if (route.path !== "/") expect(href!.endsWith("/")).toBe(false);
  });
  it("has Open Graph and Twitter tags", () => {
    if (!route.noindex) expect(content(doc, 'meta[property="og:url"]')).toBe(canonical);
    expect(content(doc, 'meta[property="og:title"]')).toBeTruthy();
    expect(content(doc, 'meta[property="og:description"]')).toBeTruthy();
    expect(content(doc, 'meta[property="og:image"]')).toMatch(new RegExp(`^${SITE_URL}/.+`));
    expect(content(doc, 'meta[property="og:type"]')).toBeTruthy();
    expect(content(doc, 'meta[name="twitter:card"]')).toBe("summary_large_image");
  });
  it("has theme-color for light and dark", () => {
    expect(doc.querySelectorAll('meta[name="theme-color"]').length).toBe(2);
  });
  it("has JSON-LD blocks that parse", () => {
    const blocks = doc.querySelectorAll('script[type="application/ld+json"]');
    if (!route.noindex) expect(blocks.length).toBeGreaterThan(0);
    for (const b of blocks) expect(() => JSON.parse(b.text)).not.toThrow();
  });
  it("keeps the app script only on pages that hydrate", () => {
    expect(doc.querySelectorAll('script[type="module"]').length).toBe(route.hydrate ? 1 : 0);
  });
});

describe("site chrome and links", () => {
  const paths = new Set(routes.map((r) => r.path));
  const indexable = routes.filter((r) => !r.noindex).map((r) => r.path);

  it.each(pages)("$route.path has a skip link, one main and the site header and footer", ({ doc }) => {
    expect(doc.querySelector('a.skip[href="#main"]')).not.toBeNull();
    expect(doc.querySelectorAll("main#main").length).toBe(1);
    expect(doc.querySelector("header.site .mark")?.getAttribute("href")).toBe("/");
    expect(doc.querySelector("footer.site-foot")?.text).toContain("Not affiliated with Blizzard Entertainment");
    expect(doc.querySelector("footer.site-foot")?.text).toContain("Part of Drunken Oath");
  });

  it.each(pages)("$route.path links only to routes or files in public/", ({ doc, route }) => {
    for (const a of doc.querySelectorAll("a[href]")) {
      const href = a.getAttribute("href")!;
      if (/^(https?:|mailto:)/.test(href)) continue;
      const path = href.split(/[?#]/)[0];
      if (path === "") continue; // "#main" and other in-page anchors
      const ok = paths.has(path) || existsSync(join(__dirname, "..", "public", path));
      expect(ok, `${route.path} links to ${href}`).toBe(true);
    }
  });

  it("nav and footer show exactly the sections whose route exists", () => {
    const sections = ["/", "/bis", "/items", "/guides", "/about"].filter((p) => indexable.includes(p));
    for (const { doc } of pages) {
      const hrefs = (sel: string) => doc.querySelectorAll(sel).map((a) => a.getAttribute("href"));
      expect(hrefs("header.site nav a")).toEqual(sections);
      expect(hrefs("footer.site-foot nav a")).toEqual(sections);
    }
  });

  it.each(pages.filter((p) => !p.route.noindex && p.route.path !== "/"))(
    "$route.path has a BreadcrumbList that ends at its canonical URL",
    ({ doc, route }) => {
      const lists = doc
        .querySelectorAll('script[type="application/ld+json"]')
        .map((b) => JSON.parse(b.text))
        .filter((d) => d["@type"] === "BreadcrumbList");
      expect(lists.length).toBe(1);
      const items = lists[0].itemListElement;
      expect(items[0].item).toBe(canonicalUrl("/"));
      expect(items[items.length - 1].item).toBe(canonicalUrl(route.path));
      expect(doc.querySelector("nav.crumbs li[aria-current='page']")).not.toBeNull();
    },
  );

  it("the 404 page is noindex, says Page not found and links to the sections", () => {
    const nf = pages.find((p) => p.route.path === "/404")!;
    expect(nf.route.noindex).toBe(true);
    expect(nf.doc.querySelector("h1")?.text).toBe("Page not found");
    expect(nf.doc.querySelectorAll("main a").length).toBeGreaterThan(0);
  });
});

describe("about page", () => {
  const { doc } = pages.find((p) => p.route.path === "/about")!;
  const text = doc.querySelector("main")!.text;
  it("names the data version, the update date and the trademark notice", () => {
    expect(text).toContain("World of Warcraft: Forever beta, build 1.60.1");
    expect(text).toContain("2026-10-18");
    expect(text).toContain("trademark of Blizzard Entertainment");
  });
  it("links every source URL from the spec and the calculator", () => {
    const hrefs = doc.querySelectorAll("main a").map((a) => a.getAttribute("href"));
    for (const url of [
      "https://foreverchanges.pro/bis/shaman/restoration",
      "https://foreverchanges.pro/downranking",
      "https://theforeverera.com/en/bis/shaman/restoration/30/",
      "https://wowtbc.gg/warcraftforever/bis-list/restoration-shaman/",
      "https://www.wowhead.com/forever/guide/classes/shaman/restoration/level-30-healer-overview",
      "https://github.com/olav9/ManaMaster/blob/main/CLAUDE.md",
      "https://statrat.info/mechanics/mana-regeneration/",
    ])
      expect(hrefs).toContain(url);
    expect(hrefs).toContain("/");
  });
});

describe("vercel.json", () => {
  const config = JSON.parse(readFileSync(join(__dirname, "..", "vercel.json"), "utf8"));
  const headersFor = (source: string) =>
    Object.fromEntries(config.headers.find((h: { source: string }) => h.source === source).headers.map((h: { key: string; value: string }) => [h.key, h.value]));
  it("serves clean URLs without trailing slashes", () => {
    expect(config.cleanUrls).toBe(true);
    expect(config.trailingSlash).toBe(false);
    expect(config.framework).toBe("vite");
    expect(config.buildCommand).toBe("npm run build");
    expect(config.outputDirectory).toBe("dist");
  });
  it("caches assets and sets security headers", () => {
    expect(headersFor("/assets/(.*)")["Cache-Control"]).toBe("public, max-age=31536000, immutable");
    const all = headersFor("/(.*)");
    expect(all["X-Content-Type-Options"]).toBe("nosniff");
    expect(all["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(all["Permissions-Policy"]).toBe("camera=(), microphone=(), geolocation=()");
    expect(all["Content-Security-Policy"]).toBe("frame-ancestors 'self' https://drunkenoath.com https://*.drunkenoath.com");
  });
});

describe("home page", () => {
  const { doc } = pages.find((p) => p.route.path === "/")!;
  it("has WebSite and WebApplication JSON-LD", () => {
    const data = JSON.parse(doc.querySelector('script[type="application/ld+json"]')!.text);
    const types = data["@graph"].map((n: { "@type": string }) => n["@type"]);
    expect(types).toEqual(["WebSite", "WebApplication"]);
    const app = data["@graph"][1];
    expect(app.applicationCategory).toBe("UtilitiesApplication");
    expect(app.operatingSystem).toBe("Any");
    expect(app.isAccessibleForFree).toBe(true);
  });
  it("renders the calculator and the explainer into the HTML", () => {
    const text = doc.querySelector("#root")!.text;
    expect(text).toContain("Tidebringer's Claw");
    expect(text).toContain("What Tidecaller does");
  });
  it("escapes < in JSON-LD", () => {
    expect(renderDocument({ ...routes[0], jsonLd: [{ name: "</script><b>" }] }, STUB)).not.toContain("</script><b>");
  });
});
