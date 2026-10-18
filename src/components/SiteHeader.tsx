import { availableSections, inSection } from "./nav";

/** Skip link, wordmark and the main nav. `paths` is the list of route paths that exist. */
export function SiteHeader({ path, paths }: { path: string; paths: readonly string[] }) {
  return (
    <>
      <a className="skip" href="#main">
        Skip to main content
      </a>
      <header className="site">
        <div className="site-in">
          <a className="mark" href="/">
            Tidecaller
          </a>
          <nav aria-label="Main">
            {availableSections(paths).map((s) => (
              <a key={s.path} href={s.path} aria-current={inSection(s.path, path) ? "page" : undefined}>
                {s.label}
              </a>
            ))}
          </nav>
        </div>
      </header>
    </>
  );
}
