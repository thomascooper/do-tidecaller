---
name: ralph-deliver
description: "The delivery workflow for Tidecaller: turn a request into a PRD, convert it to Ralph stories, run the Ralph loop, verify the result yourself and hand the owner a tested branch with its preview links. Use whenever asked to build, add, fix or change something in this repo through Ralph, or to 'run ralph', 'prd this', 'deliver a branch'."
user-invocable: true
---

# ralph-deliver

**The role.** Write the PRD, let Ralph build it story by story, prove the result yourself, and hand
Tom (the owner) a branch he can test at its own preview URL. The deliverable is **a tested branch
and its links**. A branch is done when Tom can open its preview, test it, and merge it with nothing
left to fix.

**Never**: push to `main`, force-push, rebase, merge anything, run two Ralph loops at once, or
invent a game fact (THE ONE RULE in root `CLAUDE.md`: every game fact comes from `docs/spec.md`).

**Pull requests.** Tom, 18 Oct 2026, choosing how work reaches `main`: all build work goes on a
feature branch and reaches `main` *"only through a PR you merge after testing the preview."* So at
handoff open ONE pull request into `main` and give him its link with the test card. He merges it.
Never merge it yourself.

## 1. State the WHY

Before anything else, write one sentence: **what will a player (or Tom) be able to DO that they
cannot now.** If you cannot write it, or the request is a slice that is useless alone, ask him
before building.

## 2. Research, then write the PRD with /prd

Read the code and `docs/spec.md` **before** asking anything, so the PRD cites real paths and the
questions are only the ones the code and spec cannot answer. Ask with lettered options (or
AskUserQuestion with a "(Recommended)" option). When Tom is away and a question remains, write it
into the PRD's Open Questions and leave that part out of the run; never fill the gap with a guess.

Save the PRD straight to `tasks/ralph-runs/<nnn>-<slug>/prd.md` (a zero-padded run number, then a
kebab-case slug), not upstream's `tasks/prd-<feature>.md`, so it is already in its run folder
(step 7 says why).

## 3. Turn it into stories with /ralph

- `branchName` is `claude/<slug>`, never upstream's `ralph/...`: cloud sessions push the `claude/`
  prefix. **If the session was assigned a designated branch, use that branch name instead.**
- `description` names the PRD path, so every iteration can read the full PRD.
- Each story fits one iteration and names its real verify commands: `npm run typecheck`,
  `npm test` and `npm run build` always, plus
  `CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run smoke` when anything a
  browser renders changes.
- **A story may not ask for a smoke check on a screen a LATER story builds.** Ralph runs stories in
  priority order, so that criterion cannot be met and the iteration either fakes it or stalls. Put
  the check in the first story that renders the thing.
- Where the spec gives a number, the acceptance criterion quotes it, so a test can pin it.

## 4. Cut the branch from main

```bash
git fetch origin main
git checkout -b <branchName> origin/main     # or: git worktree add -b <branchName> /home/user/ralph-<nnn> origin/main
npm ci
```

A worktree keeps Ralph's checkouts away from this session's own branch when the session has other
work in flight. Put the PRD and `scripts/ralph/prd.json` in, commit, and push, so the run starts
from origin.

## 5. Run the loop

From the checkout, in the background (Bash `run_in_background`, timeout 7200000), with a ceiling
of stories plus two:

```bash
scripts/ralph/ralph.sh --tool claude <N> > <scratchpad>/ralph-run-<k>.log 2>&1
```

Each iteration is a fresh `claude --permission-mode auto --print`: autonomous, but every action
still goes through the auto-mode safety check and the deny rules in `.claude/settings.json`
(Tom asked for Ralph on this repo on 18 Oct 2026). The log stays empty until an iteration ends, so
read progress off `git log`, `git diff` and the `passes` flags in `prd.json`. Record the start time
and report the pace.

**A background command is stopped at 2 hours, and Ralph goes with it.** Size a run to about 6 to 8
stories (UI stories that run the browser suite take longer), and run a bigger PRD as several runs on
the same branch: `prd.json` keeps all the stories, and each run just continues from the first story
still at `passes: false`. If a run is stopped mid-story anyway, check what it left uncommitted,
finish that story in this session, and say so in the handoff rather than relaunching blind.

Never touch the checkout while a run is going: Ralph commits from it.

## 6. Verify it yourself. `passes: true` is Ralph's claim, not proof

On the branch's final commit run every check, in this session. Then read the diff against the PRD
and the spec, and report anything Ralph did outside the PRD. Spot-check the spec's section 7
numbers on the built site, not only in unit tests.

## 7. Finalize the branch for handoff

```bash
git fetch origin main && git merge origin/main          # a merge, never a rebase
git mv scripts/ralph/prd.json     tasks/ralph-runs/<nnn>-<slug>/prd.json
git mv scripts/ralph/progress.txt tasks/ralph-runs/<nnn>-<slug>/progress.txt
```

**Why the move is not optional:** every Ralph run writes `scripts/ralph/prd.json` and
`progress.txt`, so two branches each carrying their own would conflict at merge. A per-run folder is
a path no other branch touches, and it keeps the PRD and the learnings for the record. If `main`
already carries a previous run's files at the shared paths, the next branch's first commit moves
them into that run's folder (read its `branchName` to name it) before the new `prd.json` is written.

Run the checks again on the commit you are about to push, then push.

## 8. Hand it over

Give Tom, in one message, his **test card**, one row per feature the branch delivers:

```
| What | What to test | Preview |
|---|---|---|
| The stat weights calculator | 1. Open the preview. 2. Click Raid boss. 3. MP5 reads 4.49 | <branch URL> |
```

- **What** is one short line in his words, not the code's. **What to test** is numbered clicks on
  the preview that show it working.
- **Preview** is the **stable branch URL** from the Vercel connector's `list_deployment_aliases`;
  under the table give the **deployment URL** of the final commit from `list_deployments` (team slug
  and project in root `CLAUDE.md`, filtered by branch or full sha). Look both up: a long branch name
  is shortened with a hash, so it cannot be built by hand, and the agent proxy blocks `*.vercel.app`,
  so never curl it (read a preview with `web_fetch_vercel_url`).
- Previews sit behind Vercel Authentication: Tom sees them signed in to Vercel.
- Under the table: the branch name, the PR link, the checks you ran with their counts, the pace,
  anything Ralph did outside the PRD, and any calls you made that he can overturn.
- If he has a step to do (DNS, a setting), give it under a **Your step** label with exact clicks.
