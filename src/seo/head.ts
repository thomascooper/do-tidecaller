import { canonicalUrl, SITE_NAME, SITE_URL } from "../site";
import { jsonLdScript } from "./jsonld";
import type { JsonLd } from "./jsonld";

export interface HeadInfo {
  path: string;
  title: string;
  description: string;
  /** Path of the 1200x630 social image on the site, e.g. "/og/home.png". */
  ogImage: string;
  ogType: "website" | "article";
  noindex?: boolean;
  jsonLd: JsonLd[];
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const meta = (attr: "name" | "property", key: string, value: string) =>
  `<meta ${attr}="${key}" content="${escapeHtml(value)}" />`;

/** Everything that goes where the template has <!--app-head-->. */
export function headTags(info: HeadInfo): string {
  const url = canonicalUrl(info.path);
  const image = SITE_URL + info.ogImage;
  const tags = [
    `<title>${escapeHtml(info.title)}</title>`,
    meta("name", "description", info.description),
    info.noindex ? meta("name", "robots", "noindex") : "",
    `<link rel="canonical" href="${url}" />`,
    `<meta name="theme-color" content="#eef2f1" media="(prefers-color-scheme: light)" />`,
    `<meta name="theme-color" content="#0e1413" media="(prefers-color-scheme: dark)" />`,
    meta("property", "og:type", info.ogType),
    meta("property", "og:site_name", SITE_NAME),
    meta("property", "og:title", info.title),
    meta("property", "og:description", info.description),
    meta("property", "og:url", url),
    meta("property", "og:image", image),
    meta("name", "twitter:card", "summary_large_image"),
    meta("name", "twitter:title", info.title),
    meta("name", "twitter:description", info.description),
    meta("name", "twitter:image", image),
    ...info.jsonLd.map(jsonLdScript),
  ];
  return tags.filter(Boolean).join("\n    ");
}
