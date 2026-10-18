# Tidecaller: project context for Claude Code

Read this before touching anything. It is short on purpose; the detail lives in `docs/spec.md`
(the build spec and the game data) and in the PRD of the current Ralph run under `tasks/ralph-runs/`.

## Project

- **What:** Tidecaller, a Restoration Shaman stat-weight calculator and best-in-slot site for
  World of Warcraft: Forever (beta build 1.60.1, level 30 cap). Every number on it is in points of
  Healing. One module of the Drunken Oath family of sites; each module stands on its own.
- **Production URL:** https://tidecaller.drunkenoath.com (canonical host, set in `src/site.ts`).
  The domain is registered at GoDaddy; Tom adds the DNS record Vercel asks for.
- **Stack:** Vite + React + TypeScript, prerendered to static HTML at build time, no backend, no
  database, no auth. Settings live in the visitor's `localStorage` only. Supabase is available to
  the owner but is NOT used; adding a backend is a decision for Tom, not a story.
- **Hosting:** Vercel, team **EQL Max** (slug `eqlmax`, id `team_z1kHOzNr7i2HB3jymo2afG9i`), project
  **`tidecaller`** (`prj_8Peg0ACBUH8nKC0SmJVSCF8fuLrH`). Production builds from `main`. The custom
  domain is attached and verified; it serves once the GoDaddy CNAME `tidecaller` points at the
  value Vercel recommends (read it with `get_domain_config`, it is project specific). Every pushed branch gets its own preview URL,
  behind Vercel Authentication (Tom sees it signed in to Vercel; a session reads it with
  `mcp__Vercel__web_fetch_vercel_url`, because the agent proxy blocks `*.vercel.app`).
- **Source of truth:** `docs/spec.md`. Sections 3 to 9 are the behaviour, section 7 holds the test
  values, sections 11 and 12 hold the spell and item data, section 13 is the reference
  implementation the calculator must match.

## THE ONE RULE

**Every game fact comes from `docs/spec.md`.** Item stats, spell values, formulas, sources, level
requirements, and the list of unconfirmed values. Do not add facts from WoW Classic, TBC, Wowhead or
memory, and do not "correct" a value because it differs from Classic: Forever changed many of them,
and the owner's in-client readings outrank every website. Page and guide copy may explain the spec,
never extend it. A change that needs a fact the spec lacks stops and asks Tom.

The spec's section 7 numbers are the oracle. When a check against them fails, the code is wrong,
never the expected value.

## Commands

- Install: `npm ci`
- Dev server: `npm run dev`
- `npm run typecheck`: TypeScript, no emit
- `npm test`: Vitest (model against spec section 7, storage, data, SEO checks on every page)
- `npm run build`: client build, SSR build, then `scripts/prerender.mjs` writes every page,
  `sitemap.xml` and `robots.txt` into `dist/`
- `npm run smoke`: builds, serves `dist/` the way Vercel does and drives it in Chromium. Here:
  `CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run smoke`
- `npm run reference`: the calculator against the spec's reference implementation (section 13),
  26 scenarios, every number on screen compared. Same `CHROMIUM_PATH`. Run it whenever the
  calculator or the model changes; anything but 26 of 26 means it no longer matches the spec
- There is no lint script. Do not invent one mid-task.

(Until the first Ralph run lands these scripts, the repo holds only scaffolding.)

## How work flows here

- **Ralph builds; this session delivers.** Work is written as a PRD with `/prd`, converted to
  stories with `/ralph`, and built by `scripts/ralph/ralph.sh --tool claude N`, one fresh Claude
  iteration per story. The procedure is the `ralph-deliver` skill: read it before starting a run.
- **Branches:** feature work goes on a `claude/...` branch cut from `origin/main`. `main` is
  production. **Never push to `main`, never force-push, never rebase.** Bring `main` in by merge.
- **Reaching production:** the delivering session opens one PR into `main` and hands Tom the test
  card with the preview URL. **Tom tests the preview and merges the PR himself** (his ruling,
  18 Oct 2026). Nothing merges without his go.
- **Every push ends with its URLs** (Tom, carried over from EQL Max: *"when deploying to vercel
  directly or with ralph always provide me the URL"*): the branch's stable alias from
  `list_deployment_aliases` and the deployment URL from `list_deployments` (team slug `eqlmax`,
  project `tidecaller`, filtered by branch or sha). Look them up; a long branch name is shortened
  with a hash, so never build the URL by hand. Ralph's pushes happen inside its own process, so
  after a Ralph run the URLs are on the delivering session.

## SEO rules (the site exists to be found)

- Every page is prerendered HTML with real content before any JavaScript runs. Only the calculator
  page hydrates; content pages ship no app JavaScript.
- Every indexable page has a unique `<title>` and meta description, exactly one `<h1>`, a canonical
  URL on the production host with no trailing slash, Open Graph and Twitter tags, and a
  BreadcrumbList (except the home page). The SEO tests enforce this for every route.
- A new page is added to the route table (`src/routes.tsx`), which feeds the prerender, the sitemap
  and the SEO tests. A page that is not in the route table does not exist.
- Internal links use real `<a href>` paths that exist in the route table; the tests check them.
- Preview deployments must never be indexed (Vercel sends `noindex` on them; do not undo it).
- Do not add structured data that claims something the page is not (no Product, Review or Offer
  markup on item pages).

## Working preferences (Tom, the owner)

- Voice input, so his messages can be fragmented. Clean up phrasing without changing meaning.
- **No em dashes**, anywhere a person reads: site copy, docs, commits, chat. Use commas, colons,
  periods or parentheses.
- Plain prose over heavy formatting for discussion. Bold-labelled bullets are fine.
- When he has a step to do, give exact click paths under a **Your step** label.
- Be honest about spending: call out anything that costs money and whether it is needed.
- Never write secrets or env values into the repo, an issue or a PR. Name the variable.
- No AI model names in commits, PR titles or bodies.
- He is the domain authority. His in-client readings outrank any website.

## Where things live

- `docs/spec.md`: the build spec and data (copied verbatim from Tom's upload, 18 Oct 2026)
- `scripts/ralph/`: the Ralph loop (`ralph.sh`, the iteration prompt `CLAUDE.md`, the current
  `prd.json` and `progress.txt` while a run is open)
- `tasks/ralph-runs/<nnn>-<slug>/`: each run's PRD, and after handoff its `prd.json` and
  `progress.txt`
- `.claude/skills/`: `prd`, `ralph` (upstream Ralph skills) and `ralph-deliver` (this repo's flow)
