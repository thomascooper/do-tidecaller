import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { breadcrumbList } from "./seo/jsonld";
import { headTags } from "./seo/head";
import { routes } from "./routes";
import type { Route } from "./routes";

export { routes };
export { robotsTxt, sitemapXml } from "./seo/sitemap";
export type { Route };

/** Fill the Vite template for one route: head tags and rendered HTML. Pages that do not
 *  hydrate lose the app script and its preloads, so they ship plain HTML and CSS. */
export const ANALYTICS_SCRIPT = '<script defer src="/_vercel/insights/script.js"></script>';

/** `analytics` adds Vercel Web Analytics (cookieless); the prerender sets it on production builds only. */
export function renderDocument(
  route: Route,
  template: string,
  options: { analytics?: boolean; tipsScript?: string } = {},
): string {
  const head = headTags({
    path: route.path,
    title: route.title,
    description: route.description,
    ogImage: route.ogImage,
    ogType: route.ogType,
    noindex: route.noindex,
    jsonLd: route.breadcrumbs ? [...route.jsonLd, breadcrumbList(route.breadcrumbs)] : route.jsonLd,
  });
  const paths = routes.filter((r) => !r.noindex).map((r) => r.path);
  let html = template
    .replace("<!--app-head-->", () => head)
    .replace("<!--app-header-->", () => renderToStaticMarkup(<SiteHeader path={route.path} paths={paths} />))
    .replace("<!--app-html-->", () => renderToString(route.render()))
    .replace("<!--app-footer-->", () => renderToStaticMarkup(<SiteFooter paths={paths} />));
  if (!route.hydrate) {
    html = html
      .replace(/<script type="module"[^>]*><\/script>\s*/g, "")
      .replace(/<link rel="modulepreload"[^>]*>\s*/g, "");
  }
  // The item popup script goes on every page, after the app script where there is one.
  if (options.tipsScript) html = html.replace("</body>", () => `<script type="module" src="${options.tipsScript}"></script></body>`);
  if (options.analytics) html = html.replace("</body>", () => `${ANALYTICS_SCRIPT}</body>`);
  return html;
}
