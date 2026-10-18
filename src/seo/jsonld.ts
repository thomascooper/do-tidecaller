import { SITE_NAME, SITE_URL } from "../site";

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
