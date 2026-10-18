import { SITE_TAGLINE } from "../site";
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
            <img src="/favicon.svg" width="46" height="46" alt="" />
            <span>
              <span className="w">Tidecaller</span>{" "}
              <span className="k">Restoration Shaman</span>
            </span>
          </a>
          <nav aria-label="Main">
            {availableSections(paths).map((s) => (
              <a key={s.path} href={s.path} aria-current={inSection(s.path, path) ? "page" : undefined}>
                {s.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="tagline">
          <p className="t1">Resto Shaman stat weights and best in slot</p>
          <p className="t2">{SITE_TAGLINE}</p>
        </div>
      </header>
    </>
  );
}
