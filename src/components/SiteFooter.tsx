import { DATA_VERSION, PARENT_SITE } from "../site";
import { availableSections } from "./nav";

export function SiteFooter({ paths }: { paths: readonly string[] }) {
  return (
    <footer className="site-foot">
      <div className="site-in">
        <p>Game data: {DATA_VERSION}.</p>
        <p>Not affiliated with Blizzard Entertainment. World of Warcraft is a trademark of Blizzard Entertainment.</p>
        <nav aria-label="Footer">
          {availableSections(paths).map((s) => (
            <a key={s.path} href={s.path}>
              {s.label}
            </a>
          ))}
        </nav>
        <p>
          Part of {PARENT_SITE.link ? <a href={PARENT_SITE.url}>{PARENT_SITE.name}</a> : PARENT_SITE.name}
        </p>
      </div>
    </footer>
  );
}
