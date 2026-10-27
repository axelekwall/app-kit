# app-kit

The shared base for the owner's small personal apps: infrastructure code, configuration bases,
the reusable CI workflow, and the agent workflow that `app-kit sync` writes into each app.
Apps pin it as a git dependency at a tag. The first two are bikestack and homeflow, sibling
checkouts in `~/dev` (`../bikestack`, `../homeflow`).

Read these when the task calls for them:

- `../homelab/docs/app-kit-plan.md`: the plan. It covers what is shared, the package's exports,
  sync, releases, and the phases. Until homelab's pull request #2 is merged, read it with
  `git -C ../homelab show origin/docs/app-kit-plan:docs/app-kit-plan.md`.
- `../homelab/docs/app-template.md`: the app standard this package implements.
- `docs/plans/`: the plan for the current phase, with its progress log.
- `docs/decisions.md`: why each contested choice was made.
- `../bikestack`: the source of the first release. Its code and tests are copied from there;
  read it, but change it only through a pull request in that repository.

## This repository is public

Commit nothing private: no secrets, no tailnet or host names, no details of the homelab, and
nothing from the apps' data. Code and docs here describe the shared standard only.

## Commands

```
bun run setup            idempotent bootstrap: install, and activate the pre-push hook
bun run verify           Biome + TypeScript + tests. The fast gate.
bun run verify:full      the full gate, what CI runs. The same as verify until there is more
bun run check            Biome, reporting only
bun run check:fix        apply formatting and lint fixes
bun run typecheck        types only (TypeScript 7's native compiler)
bun test                 tests only
bun run kit:sync         app-kit sync on this repository: rewrite the shared blocks and managed
                         files from its own copies (a no-op unless app-kit.json changed)
```

A test holds this block and `package.json` together. The Bun version is pinned in
`.bun-version` (what CI installs), `packageManager` and `mise.toml`; a test holds the three
equal. Run commands on the pinned Bun: if `bun --version` does not match `.bun-version` (an
agent's shell often skips mise's activation), run them through `mise exec -- bun …`.

The shared agent workflow is app-kit's own `template:agent-workflow` blocks in `AGENTS.md` and
`CLAUDE.md` and its managed files (D3), listed in the block's first section. Editing one here
changes it for every app at the next release. `app-kit sync` (`src/cli/`) writes them into an app; `app-kit.json`
holds the app's values, and `tests/app-kit.test.ts` fails on drift. When `app-kit.json` has
`ci` values, sync also writes the app's `.github/workflows/ci.yml`, which calls the reusable
workflow `.github/workflows/image.yml` at the package's tag.

CI (`.github/workflows/ci.yml`) runs `verify:full` in a job named `verify`, the check branch
protection on `main` requires, and runs `image.yml` from the same commit with the image jobs
off.

## Rules

- Bun only: never npm, npx, pnpm, yarn or node. No native npm modules.
- TypeScript source, no build step. Shared code uses Web APIs. Bun APIs are allowed only in the
  `sqlite`, `runtime`, `build` and `testing` exports and the `app-kit` command.
- Exact versions for every dependency. Hono, Drizzle and Zod are peer dependencies.
- A change that apps must act on is listed under "Upgrade" in `CHANGELOG.md` for its release.
- A release is a pull request that bumps `version` in `package.json` and adds its section to
  `CHANGELOG.md`. `.github/workflows/release.yml` tags `v<version>` when it is merged. Agents
  never create or push tags.

<!--
  template:agent-workflow begin
  Everything from here to "template:agent-workflow end" is written by `app-kit sync` from the
  @axelekwall/app-kit package, and a test fails when it drifts. Change it in the app-kit
  repository. App-specific rules go in the sections above.
-->

## The shared workflow

This block and the one in `CLAUDE.md` come from `@axelekwall/app-kit`
(`github.com/axelekwall/app-kit`), a dev dependency pinned to a tag, with its managed files:
`.githooks/pre-push`, `scripts/pr-reviews.ts`, `.claude/settings.json`,
`tests/agents-commands.test.ts`, `tests/bun-version.test.ts`, `tests/app-kit.test.ts`, and
`.github/workflows/ci.yml` when `app-kit.json` has `ci` values. `bun run kit:sync` writes them,
and `tests/app-kit.test.ts` fails when one drifts: change them in app-kit, never here.
`app-kit.json` holds this repository's own values: the permission entries it adds to the shared
list, and the inputs of the reusable CI workflow. To upgrade, bump the tag, run `bun install`
and `bun run kit:sync`, and follow the release's upgrade notes in app-kit's `CHANGELOG.md`. In
the app-kit repository itself these are its own files, and `kit:sync` rewrites them from those.

## Working agreement

Agreed with the owner. It applies to every agent working here.

**Allowed without asking:** create branches, commit, push feature branches you created
(rebase and `--force-with-lease` on them is fine), open and update stacked pull requests, post
and reply to comments on pull requests you created, add non-native npm dependencies, make
implementation decisions.

**Log decisions.** An implementation decision a later reader could question goes into the
decision log, in its format, and is listed in the stack summary. The log is
`docs/decisions.md`, with a new entry under the next free D-number and status
`accepted-by-default`, unless the sections above name another log and how it numbers entries.

**Stop and report back, without proceeding, for:**

- a major decision: contradicting the spec or the decision log; changing anything expensive to
  migrate (record shapes, identifiers, data formats, the auth model); a heavy or unusual
  dependency; anything security-relevant beyond what the app template specifies;
- anything outside this repository (other repositories, dotfiles, global configuration).
  Reading is fine;
- external settings: repository settings on the forge, branch protection, secrets, Actions
  permissions, password managers, network and DNS providers;
- irreversible actions: merging any pull request, pushing to `main`, force-pushing branches you
  did not create, deleting branches or tags, publishing anything. **Never run `gh pr merge`.**
  The owner merges stacks.

**Signing.** Commits are signed. If signing fails, try once more, then commit with
`git -c commit.gpgsign=false commit …` and keep going. Record which commits are unsigned in the
stack summary.

**Messages.** Conventional commits, ending with a `Co-Authored-By:` line for the agent. Pull
request descriptions: short bullets of what changed and why, the plan section the change
implements, then "Decisions" if any, and for a change with a UI what the browser check covered.
No test plan section, and no references to local, untracked files.

**No agent-specific guard.** These rules bind every agent (Claude Code, Codex, agy) as written.
Where the forge allows it, the owner protects `main`: a change needs a pull request with passing
CI, and force pushes and deletion are refused. Where it does not, the rule rests on this
agreement, and the pre-push hook only catches mistakes. Per-tool permission lists, such as
`.claude/settings.json`, spare prompts for routine commands and refuse a few irreversible forms
of them; they match command text, so they catch slips rather than enforce the agreement, and
changing them is a configuration change that needs the owner's approval.

## Stacks and handover

Work arrives as stacks of pull requests: each targets the branch of the one below it, the
first targets `main`. One logical change per pull request.

**One worktree per stack**, created from an up-to-date `origin/main`. Run `bun run setup`, then
`bun run verify`, before changing anything. A worktree inside the repository, as Claude Code's
native ones are, needs its own `bun run setup` even though commands seem to work without it:
Bun walks up to the parent checkout's `node_modules` and runs on another checkout's
dependencies. Each pull request's branch starts from the one below it.

For each pull request: implement → the browser check, for a change with a UI, or `curl`
against the running dev server for one with an HTTP surface → `bun run verify:full` → review
your own diff (correctness, the app contract, the rules above) → a fresh-context review →
`bun run verify:full` again if the reviews changed anything → commit → push → open the pull
request → update the plan's progress log. Run `bun run verify` before every commit, and commit
nothing that is red.

**The fresh-context review.** After your own pass, hand the change's diff against the branch
below (`main` for the first pull request) to a reviewer with a fresh context: a subagent, or a
new session of any agent, which only reads. Give it the diff, the plan section the change
implements and the rules to check it against, but not your own conclusions: a reviewer handed
your reading of the change tends to confirm it. Ask for ranked findings, each with file, line
and consequence. Fix the valid ones in the pull request they belong to, and answer the rest
with a one-line reason.

**The browser check.** Run the change in a browser against the worktree's own dev server and
database (seeded where the repository can seed one), never another checkout's: at 1280 and 390
pixels wide, in light and dark, and along the keyboard path through every new control. Use the
browser tool the sections above name, or `playwright-cli` where they name none, in a session of
its own that you close afterwards.

No automated reviewer runs on pull requests, so your own pass and the fresh-context review are
the only reviews before the owner's: make both real passes, not skims. Before handing over, run
`bun scripts/pr-reviews.ts` across the stack: fix valid findings in the pull request they
belong to (restack with rebase and `--force-with-lease`), and answer invalid ones with a
one-line reason. `bun scripts/pr-reviews.ts [<pr>…] [--all] [--json]` lists unresolved review
threads for the named pull requests, or for every open one; `bun scripts/pr-reviews.ts reply
<thread-id> <body>` answers one.

When the stack is ready, post a **stack summary** comment on its top pull request: what it
covers, how it was verified, the decisions logged, every review finding (your own pass, the
fresh-context review and any review thread) and how each was handled, unsigned commits, and
the merge order.

**Merging a stack.** The owner merges bottom-up with squash merges. A squash merge leaves the
next branch holding the merged commits under their old hashes, so replay it onto `main` before
it is merged or built on: `git rebase --onto origin/main <old tip of the merged branch>
<next branch>`, push with `--force-with-lease`, and retarget its pull request to `main`. A
stack GitHub tracks as stacked pull requests merges in one action instead: merging its top
pull request merges every pull request below it.

**One agent per stack at a time.** The plan's progress log has an `Active:` line naming the
agent and the machine. Check it before starting; set it when you start and clear it when you
hand over.

**Session context and agent memory are not state. The repository and GitHub are.** Anything
the next agent needs goes into the plan's progress log, a decision entry, a commit or a pull
request comment.

## Resuming work

1. `git fetch --prune`, then `gh pr list` to see the open stack. With no open pull requests,
   `main` is current.
2. Check out the top branch of the stack, or `main` when nothing is open. The plan on that
   branch is the current one: the copy on `main` is stale while a stack is open. If a pull
   request of the stack was squash-merged since, replay the branches above it first (Merging a
   stack, above).
3. Read the progress log in the current plan under `docs/plans/`. Check the `Active:` line
   and take it over by updating it (one agent per stack).
4. `bun scripts/pr-reviews.ts` for unanswered review threads.
5. `bun run setup`, then `bun run verify` for a green baseline.
6. Continue from the log's "Next" entry.

## Completion

A change is done when `bun run verify:full` passes and you have seen the output, not when it
looks right. When you report, show the gate's output (its summary lines), not a statement that
it passed. A pull request is done when CI says so. Say when a check failed, was skipped or was
not run.

<!-- template:agent-workflow end -->
