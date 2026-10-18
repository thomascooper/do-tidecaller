/** The site sections, in nav order. A section shows only when its route exists. */
export const SECTIONS = [
  { path: "/", label: "Calculator" },
  { path: "/bis", label: "Best in slot" },
  { path: "/items", label: "Items" },
  { path: "/guides", label: "Guides" },
  { path: "/about", label: "About" },
] as const;

/** The sections whose route is in `paths`. */
export function availableSections(paths: readonly string[]) {
  return SECTIONS.filter((s) => paths.includes(s.path));
}

/** True when `path` is the section's page or sits under it (/bis/head is under /bis). */
export function inSection(section: string, path: string): boolean {
  return section === "/" ? path === "/" : path === section || path.startsWith(section + "/");
}
