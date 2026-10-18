import { canonicalUrl, SITE_NAME, SITE_URL } from "../site";

export type JsonLd = Record<string, unknown>;

/** Serialise for a script tag: `<` is escaped so the data can never close the tag. */
export function jsonLdScript(data: JsonLd): string {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">${json}</script>`;
}

export function websiteAndApp(description: string): JsonLd {
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", name: SITE_NAME, url: `${SITE_URL}/` },
      {
        "@type": "WebApplication",
        name: `${SITE_NAME} Stat Weights`,
        url: `${SITE_URL}/`,
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Any",
        isAccessibleForFree: true,
        description,
      },
    ],
  };
}

export interface Crumb {
  name: string;
  path: string;
}

/** BreadcrumbList for a trail that starts at Home and ends at the page itself. */
export function breadcrumbList(trail: Crumb[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: canonicalUrl(crumb.path),
    })),
  };
}

/** Article for a guide-style page: best in slot, slot pages and guides. */
export function article(opts: { headline: string; description: string; path: string; dateModified: string }): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.headline,
    description: opts.description,
    dateModified: opts.dateModified,
    mainEntityOfPage: canonicalUrl(opts.path),
    author: { "@type": "Organization", name: SITE_NAME, url: `${SITE_URL}/` },
    publisher: { "@type": "Organization", name: SITE_NAME, url: `${SITE_URL}/` },
  };
}
