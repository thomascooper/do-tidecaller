import { canonicalUrl, DATA_UPDATED, SITE_URL } from "../site";

/** sitemap.xml for the given indexable route paths. */
export function sitemapXml(paths: string[]): string {
  const urls = paths
    .map((p) => `  <url>\n    <loc>${canonicalUrl(p)}</loc>\n    <lastmod>${DATA_UPDATED}</lastmod>\n  </url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function robotsTxt(): string {
  return `User-agent: *\nAllow: /\nDisallow: /modelviewer/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
}
