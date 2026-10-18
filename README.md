# Tidecaller

Restoration Shaman stat weights and best in slot for World of Warcraft: Forever (beta build
1.60.1, level 30 cap), live at https://tidecaller.drunkenoath.com. Every number on the site is in
points of Healing. It is one module of the Drunken Oath family of sites and stands on its own.

## Commands

Node 22 or newer.

- `npm ci`: install.
- `npm run dev`: Vite dev server.
- `npm run typecheck`: TypeScript, no emit.
- `npm test`: Vitest. The model against spec section 7, storage, data, and the SEO checks on every route.
- `npm run build`: client build, SSR build, then `scripts/prerender.mjs` writes every page,
  `sitemap.xml` and `robots.txt` into `dist/`.
- `npm run preview`: serves `dist/` the way Vercel does.
- `npm run smoke`: builds, serves `dist/` and drives it in Chromium. Set `CHROMIUM_PATH` to a
  Chromium binary if it is not at the default.
- `npm run reference`: builds, then compares the calculator with the spec's reference
  implementation (section 13) in 27 scenarios. Anything but 27 of 27 means the calculator no longer
  matches the spec. Same `CHROMIUM_PATH`.

There is no lint script.

## How it is built

- A static site: Vite + React + TypeScript, prerendered to HTML at build time. No backend, no
  database, no accounts. Settings live in the visitor's `localStorage` only.
- `src/routes.tsx` is the route table. It feeds the prerender, the sitemap and the SEO tests, so a
  page that is not in the table does not exist.
- Every page ships real HTML before any JavaScript runs. Only the calculator page (`/`) hydrates;
  content pages ship no app JavaScript.
- The math lives in `src/lib/model.ts` as pure functions. The data is in `src/data/`.
- Hosting is Vercel, project `tidecaller`. Production builds from `main`; every pushed branch gets a
  preview deployment that is never indexed.

## Updating the data

`docs/spec.md` is the source of truth for every game fact. To change the data:

1. Edit the JSON blocks in `docs/spec.md` (sections 11 and 12).
2. Run `node scripts/extract-spec-data.mjs`. It rewrites `src/data/spells.json` and `src/data/items.json`.
3. Run `npm test` (and `npm run reference` if the model or calculator changed).

Do not add facts from anywhere else. The spec's section 7 numbers are the oracle: when a check
against them fails, the code is wrong, not the expected value.

## Social images

The 1200x630 cards in `public/og/` and the PNG icons are rendered by hand, not by the build:

```
CHROMIUM_PATH=/path/to/chrome node scripts/og.mjs
```

Card copy lives in the `cards` array in `scripts/og.mjs`. Commit the PNGs it writes.

## Getting found

`docs/search-console.md` has the owner's steps for Google Search Console, Bing Webmaster Tools and
Vercel Web Analytics.

## Ralph workflow

Work is written as a PRD (`/prd`), converted to stories (`/ralph`), and built by
`scripts/ralph/ralph.sh --tool claude N`, one fresh iteration per story. The delivery procedure is
the `ralph-deliver` skill in `.claude/skills/`. Each run's PRD, `prd.json` and `progress.txt` are
kept under `tasks/ralph-runs/`. `CLAUDE.md` has the rules: feature work goes on a `claude/...`
branch, never to `main` directly, and the owner merges the pull request.
