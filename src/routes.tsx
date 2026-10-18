import type { ReactElement } from "react";
import { Calculator } from "./calculator/Calculator";
import type { JsonLd } from "./seo/jsonld";
import { websiteAndApp } from "./seo/jsonld";

export interface Route {
  path: string;
  title: string;
  description: string;
  /** Path of the social image on the site. */
  ogImage: string;
  ogType: "website" | "article";
  /** True for the one page that ships app JavaScript and hydrates. */
  hydrate: boolean;
  noindex?: boolean;
  jsonLd: JsonLd[];
  render: () => ReactElement;
}

const HOME_DESCRIPTION =
  "Resto Shaman stat weights and best in slot gear for level 30 WoW Forever, worked out from your own fight. Every number is in points of Healing.";

/** THE route table: feeds the prerender, the sitemap and the SEO tests. */
export const routes: Route[] = [
  {
    path: "/",
    title: "Resto Shaman Stat Weights & BiS (WoW Forever) | Tidecaller",
    description: HOME_DESCRIPTION,
    ogImage: "/og/home.png",
    ogType: "website",
    hydrate: true,
    jsonLd: [websiteAndApp(HOME_DESCRIPTION)],
    render: () => <Calculator />,
  },
];
