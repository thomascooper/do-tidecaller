import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8")) as {
  rewrites: { source: string; destination: string }[];
  headers: { source: string; headers: { key: string; value: string }[] }[];
};

describe("vercel.json model file relay", () => {
  it("rewrites /modelviewer to Wowhead's CDN", () => {
    expect(config.rewrites).toContainEqual({
      source: "/modelviewer/:path*",
      destination: "https://wow.zamimg.com/modelviewer/:path*",
    });
  });
  it("lets Vercel cache the relayed files", () => {
    const rule = config.headers.find((h) => h.source === "/modelviewer/(.*)");
    expect(rule?.headers).toContainEqual({ key: "x-vercel-enable-rewrite-caching", value: "1" });
  });
});
