# Ralph Agent Instructions

You are an autonomous coding agent building Tidecaller, a Restoration Shaman stat-weight
calculator and best-in-slot site for World of Warcraft: Forever, served at
https://tidecaller.drunkenoath.com. This file is the prompt `scripts/ralph/ralph.sh` feeds to
every iteration. It is upstream Ralph's prompt (github.com/snarktank/ralph) with the lines that
differ for this repo marked **(Tidecaller)**.

## Your Task

1. Read the PRD at `scripts/ralph/prd.json` (in the same directory as this file). Its
   `description` names the full PRD in `tasks/ralph-runs/`: read the sections your story points
   to. The build spec is `docs/spec.md`; every game fact and every number comes from it.
   **(Tidecaller)**
2. Read the progress log at `scripts/ralph/progress.txt` (check the Codebase Patterns section first)
3. Check you're on the branch from PRD `branchName`. If not, check it out from `origin` if it
   exists there, or create it from `origin/main`. Then `git fetch origin main` and, if `main` has
   moved, merge it into the branch (merge, never rebase or force-push). **(Tidecaller)**
4. If `node_modules` is missing or `package.json` changed since the last install, run `npm ci`
   (or `npm install` when there is no lockfile yet). **(Tidecaller)**
5. Pick the **highest priority** user story where `passes: false`
6. Implement that single user story
7. Run quality checks (see Quality Requirements below) **(Tidecaller)**
8. If checks pass, commit ALL changes with message: `feat: [Story ID] - [Story Title]`
9. Update the PRD to set `passes: true` for the completed story
10. Append your progress to `scripts/ralph/progress.txt`
11. Commit the PRD and progress update, then **push the branch**:
    `git push -u origin <branchName>`. This runs in a cloud container that is thrown away when
    the session ends, so an unpushed commit is a lost commit. **(Tidecaller)**

## Rules that outrank the story **(Tidecaller)**

- **Never push to `main`, never force-push, never rebase, never open or merge a pull request.**
  Push only `branchName`. The person delivering the run opens the PR after checking your work.
- **THE ONE RULE: every game fact comes from `docs/spec.md`.** Item stats, spell values,
  formulas, mechanics, sources, level requirements and the "unconfirmed" list are all in it. Do
  not add facts from WoW Classic, TBC, Wowhead or memory, and do not "correct" a value because it
  looks different from Classic. Guide and page copy may explain and rephrase the spec, never
  extend it. If a story turns on a game fact the spec does not have, leave the story at
  `passes: false`, write the exact question into that story's `notes` field, push, and end your
  response. Do not move on to a later story that depends on it.
- **The test values in spec section 7 are the oracle.** If a check against them fails, the code
  is wrong. Never edit an expected value to make a test pass. The PRD's "Research findings"
  section lists the few places where the spec's numbers need reading carefully (for example the
  curve fit); follow it.
- **Values marked unconfirmed stay flagged.** The "Check" tag, the unconfirmed footer list and the
  `warn` flags in `spells.json` are product features, not clutter.
- **No em dashes** in anything a person reads: site copy, docs, commit messages, progress notes.
  Use commas, colons, periods or parentheses. (The owner's standing preference.)
- **No secrets, tokens or env values in the repo.** Name a variable; the owner sets values.

## Progress Report Format

APPEND to progress.txt (never replace, always append):
```
## [Date/Time] - [Story ID]
- What was implemented
- Files changed
- Checks run, with counts (tests, smoke checks)
- **Learnings for future iterations:**
  - Patterns discovered (e.g., "this codebase uses X for Y")
  - Gotchas encountered (e.g., "don't forget to update Z when changing W")
  - Useful context (e.g., "the best set table is in component X")
---
```

The learnings section is critical - it helps future iterations avoid repeating mistakes and understand the codebase better.

## Consolidate Patterns

If you discover a **reusable pattern** that future iterations should know, add it to the `## Codebase Patterns` section at the TOP of progress.txt (create it if it doesn't exist). This section should consolidate the most important learnings:

```
## Codebase Patterns
- Example: All math lives in src/lib/model.ts as pure functions
- Example: Every new page is added to src/routes.tsx, which feeds the prerender and the sitemap
```

Only add patterns that are **general and reusable**, not story-specific details.

## Learnings go in progress.txt, not CLAUDE.md **(Tidecaller)**

Upstream Ralph adds learnings to nearby `CLAUDE.md` files. **Do not do that here.** The root
`CLAUDE.md` is curated by hand and every session reads it. Put learnings in `progress.txt`. Edit
`CLAUDE.md` only when the story itself asks for it.

## Quality Requirements **(Tidecaller)**

Once the scaffold story has created them, these are the checks:

- `npm run typecheck`, always.
- `npm test` (Vitest), always. Red means something real broke.
- `npm run build`, always. The build is the product: it prerenders every page.
- `npm run smoke`, when anything a browser renders changed (components, CSS, pages, the
  prerender, `vercel.json`). It builds the site, serves `dist/` the way Vercel does and drives it in
  Chromium. In this container run it as
  `CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run smoke`.
- There is no lint script. Do not invent one.
- ALL commits must pass the checks that apply. Do NOT commit broken code.
- Keep changes focused and minimal
- Follow existing code patterns
- Every new check you add must be seen failing once against the broken state it guards (break
  the code, run, restore). Say in progress.txt which check you broke and how.
- Never leave a server running between checks: start it inside the smoke script, or kill it by
  PID. Never `pkill -f` a pattern that appears in your own command line.

## Browser Testing **(Tidecaller)**

`npm run smoke` is this repo's browser check, and a UI story is not done until it passes. There
is no dev-browser skill here: where a story's acceptance criteria say "Verify in browser", the
smoke suite is what satisfies it. Add the checks the story needs to `test/smoke.mjs`, beside the
checks for the same page, never at the end of the file. A smoke check may only test a screen that
exists by the end of the current story.

## Stop Condition

After completing a user story, check if ALL stories have `passes: true`.

If ALL stories are complete and passing, reply with:
<promise>COMPLETE</promise>

If there are still stories with `passes: false`, end your response normally (another iteration will pick up the next story).

## Important

- Work on ONE story per iteration
- Commit frequently, and push after every commit **(Tidecaller)**
- Keep the build green
- Read the Codebase Patterns section in progress.txt before starting
