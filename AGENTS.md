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

`bun scripts/pr-reviews.ts [<pr>…] [--all] [--json]` lists unresolved review threads (Codex's
included) for the named pull requests, or for every open one. `bun scripts/pr-reviews.ts reply
<thread-id> <body>` answers one.

The shared agent workflow is app-kit's own `template:agent-workflow` blocks in `AGENTS.md` and
`CLAUDE.md` and its managed files (D3): `.githooks/pre-push`, `scripts/pr-reviews.ts`,
`.claude/settings.json` and three tests, `tests/agents-commands.test.ts`,
`tests/bun-version.test.ts` and `tests/app-kit.test.ts`. Editing one here changes it for every
app at the next release. `app-kit sync` (`src/cli/`) writes them into an app; `app-kit.json`
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

## Working agreement

Agreed with the owner. It applies to every agent working here.

**Allowed without asking:** create branches, commit, push feature branches you created
(rebase and `--force-with-lease` on them is fine), open and update stacked pull requests, post
and reply to comments on pull requests you created, add non-native npm dependencies, make
implementation decisions.

**Log decisions.** An implementation decision a later reader could question goes into
`docs/decisions.md` as a new entry with status `accepted-by-default`, in the same format, with
the next free D-number. List them in the stack summary.

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
request descriptions: short bullets of what changed and why, then "Decisions" if any; no test
plan section.

**No agent-specific guard.** These rules bind every agent (Claude Code, Codex, agy) as written.
Where the forge allows it, the owner protects `main`: a change needs a pull request with passing
CI, and force pushes and deletion are refused. Where it does not, the rule rests on this
agreement, and the pre-push hook only catches mistakes. Per-tool permission lists, such as
`.claude/settings.json`, only spare prompts for routine commands; they are for speed, not
safety, and changing them is a configuration change that needs the owner's approval.

## Stacks and handover

Work arrives as stacks of pull requests: each targets the branch of the one below it, the
first targets `main`. One logical change per pull request.

For each pull request: implement → `bun run verify:full` → review your own diff (correctness,
the app contract, the rules above) → check anything with a UI or HTTP surface against the
running dev server (`playwright-cli` in its own `-s=<name>` session, closed afterwards, or
`curl`) → commit → push → open the pull request → update the plan's progress log.
Codex reviews each pushed pull request within minutes; do not wait for it. Before handing
over, run `bun scripts/pr-reviews.ts` across the stack: fix valid findings in the pull request
they belong to (restack with rebase and `--force-with-lease`), and answer invalid ones with a
one-line reason.

When the stack is ready, post a **stack summary** comment on its top pull request: what it
covers, how it was verified, the decisions logged, Codex's findings and how each was handled,
unsigned commits, and the merge order (bottom-up, squash merges; after each merge, retarget the
next pull request to `main`).

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
   branch is the current one: the copy on `main` is stale while a stack is open.
3. Read the progress log in the current plan under `docs/plans/`. Check the `Active:` line
   and take it over by updating it (one agent per stack).
4. `bun scripts/pr-reviews.ts` for unanswered review threads.
5. `bun run setup`, then `bun run verify` for a green baseline.
6. Continue from the log's "Next" entry.

## Completion

A change is done when `bun run verify:full` passes and you have seen the output, not when it
looks right. A pull request is done when CI says so. Say when a check failed, was skipped or
was not run.

<!-- template:agent-workflow end -->
