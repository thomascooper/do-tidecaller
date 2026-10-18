export const SITE_URL = "https://tidecaller.drunkenoath.com";
export const SITE_NAME = "Tidecaller";
export const DATA_VERSION = "World of Warcraft: Forever beta, build 1.60.1";
export const DATA_UPDATED = "2026-10-18";
export const PARENT_SITE = { name: "Drunken Oath", url: "https://drunkenoath.com", link: false };

/** Absolute URL for a route path. Home is SITE_URL + "/", every other path has no trailing slash. */
export function canonicalUrl(path: string): string {
  return path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}
export const SITE_TAGLINE = "WoW Forever beta 1.60.1, level 30. Every number is in points of Healing.";
