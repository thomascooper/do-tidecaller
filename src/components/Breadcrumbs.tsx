import type { Crumb } from "../seo/jsonld";

/** Visible trail; the last crumb is the current page and is not a link. */
export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <ol>
        {trail.map((crumb, i) =>
          i === trail.length - 1 ? (
            <li key={crumb.path} aria-current="page">
              {crumb.name}
            </li>
          ) : (
            <li key={crumb.path}>
              <a href={crumb.path}>{crumb.name}</a>
            </li>
          ),
        )}
      </ol>
    </nav>
  );
}
