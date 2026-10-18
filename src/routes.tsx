import type { ReactElement } from "react";
import { Calculator } from "./calculator/Calculator";
import { About, ABOUT_TRAIL } from "./pages/About";
import { NotFound } from "./pages/NotFound";
import type { Crumb, JsonLd } from "./seo/jsonld";
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
  /** Trail from Home to the page itself; every indexable page but the home page has one. */
  breadcrumbs?: Crumb[];
  jsonLd: JsonLd[];
  render: () => ReactElement;
}

const HOME_DESCRIPTION =
  "Resto Shaman stat weights and best in slot gear for level 30 WoW Forever, worked out from your own fight. Every number is in points of Healing.";

/** THE route table: feeds the prerender, the sitemap and the SEO tests. */
export const NOT_FOUND_PATH = "/404";

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
  {
    path: "/about",
    title: "About Tidecaller: Sources and Data Version",
    description:
      "What Tidecaller is, how its Resto Shaman numbers are made, the game data version and every source, for WoW Forever level 30.",
    ogImage: "/og/about.png",
    ogType: "article",
    hydrate: false,
    breadcrumbs: ABOUT_TRAIL,
    jsonLd: [],
    render: () => <About />,
  },
  {
    path: NOT_FOUND_PATH,
    title: "Page not found | Tidecaller",
    description: "There is no page at this address on Tidecaller. Use the links to reach the calculator and the main sections.",
    ogImage: "/og/home.png",
    ogType: "website",
    hydrate: false,
    noindex: true,
    jsonLd: [],
    render: () => <NotFound paths={routes.map((r) => r.path)} />,
  },
];
