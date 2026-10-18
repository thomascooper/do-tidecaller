import { describe, expect, it } from "vitest";
import { parse } from "node-html-parser";
import { renderDocument, routes } from "../src/entry-server";
import { canonicalUrl, SITE_URL } from "../src/site";

const STUB = `<!doctype html><html lang="en"><head><meta charset="utf-8" /><!--app-head--></head><body><div id="root"><!--app-html--></div><script type="module" src="/src/entry-client.tsx"></script></body></html>`;

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
  it("has a canonical URL on the site host that matches the route", () => {
    const href = doc.querySelector('link[rel="canonical"]')?.getAttribute("href");
    expect(href).toBe(canonical);
    expect(href!.startsWith(SITE_URL)).toBe(true);
    if (route.path !== "/") expect(href!.endsWith("/")).toBe(false);
  });
  it("has Open Graph and Twitter tags", () => {
    expect(content(doc, 'meta[property="og:url"]')).toBe(canonical);
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
    expect(blocks.length).toBeGreaterThan(0);
    for (const b of blocks) expect(() => JSON.parse(b.text)).not.toThrow();
  });
  it("keeps the app script only on pages that hydrate", () => {
    expect(doc.querySelectorAll('script[type="module"]').length).toBe(route.hydrate ? 1 : 0);
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
