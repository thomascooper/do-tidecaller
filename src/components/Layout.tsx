import type { ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/** Header, main and footer in one tree, for dev where there is no prerendered shell.
 *  The prerender puts the same header and footer around #root in the HTML template. */
export function Layout({ path, paths, children }: { path: string; paths: readonly string[]; children: ReactNode }) {
  return (
    <>
      <SiteHeader path={path} paths={paths} />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter paths={paths} />
    </>
  );
}
