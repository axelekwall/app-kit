# Changelog

One section per release, newest first. Versions are SemVer; while in `0.x`, a breaking change
bumps the minor version. "Upgrade" lists what an app must do when it bumps to that release,
besides bumping the tag and running `bun install` and `bun run kit:sync`.

## 0.1.2

The rules both apps follow, a fresh-context review, and narrower shared permissions (D8 to D11).

- **A fresh-context review** after the agent's own pass: the diff goes to a reviewer with a
  fresh context, briefed with the plan section and the rules but not the author's conclusions,
  and the stack summary lists every finding and how it was handled (D8). In `CLAUDE.md` it is
  a subagent started with the Agent tool.
- **Shared workflow rules** (D10): `verify` before every commit and the gate's output shown in
  reports; one worktree per stack, with its own `bun run setup` when it sits inside the
  repository; replaying a stack with `git rebase --onto` after a squash merge, or merging a
  stack GitHub tracks in one action; the browser check at 1280 and 390 pixels, light and dark,
  and on the keyboard, on the worktree's own database, with the tool the app names; pull
  request descriptions that name the plan section and the browser check; the decision log the
  app names; and the dev-server override covering other long-running processes.
- **The block's first section, "The shared workflow"**, says what app-kit owns, how `kit:sync`
  and `app-kit.json` work and how to upgrade. The `scripts/pr-reviews.ts` usage moved into
  "Stacks and handover".
- **`.claude/settings.json` refuses the irreversible forms of routine commands** (D9), listed
  below. `app-kit sync` keeps the package's `ask` and `deny` rules beside the app's extra
  `allow` entries, and writes the file as Biome formats it.
- **The generated `ci.yml`** words the comment on `packages: write` for the image jobs on or
  off. Its call to `image.yml` stays pinned by tag (D11).
- **The README** carries the adoption and upgrade steps, with two additions: the `tsconfig.json`
  options Bun reads (`jsx`, `jsxImportSource`, `paths`) stay in the app, since Bun ignores an
  `extends` by package name (D2), and Dependabot ignores `axelekwall/app-kit*`.

### Permission changes

In the shared `.claude/settings.json`, which `kit:sync` writes into each app:

- **Removed from `allow`:** `Bash(git stash *)`.
- **Added to `allow`:** `Bash(git stash push *)`, `Bash(git stash list *)`,
  `Bash(git stash show *)`, `Bash(git stash apply *)`. A bare `git stash` and `git stash pop`
  now prompt.
- **New `ask`:** `Bash(gh api * -X*)`, `Bash(gh api * --method*)`, `Bash(gh api *graphql*)`: a
  `GET` widened by a later method flag, or a GraphQL call, prompts instead of running.
- **New `deny`:**
  - force pushes: `Bash(git push --force *)`, `Bash(git push * --force)`,
    `Bash(git push * --force *)`, `Bash(git push -f *)`, `Bash(git push * -f)`,
    `Bash(git push * -f *)`, `Bash(git push * +*)`. `--force-with-lease` is still allowed;
  - remote deletes: `Bash(git push *--delete*)`, `Bash(git push -d *)`, `Bash(git push * -d *)`,
    `Bash(git push * -d)`, `Bash(git push * :**)`, `Bash(git push *--mirror*)`,
    `Bash(git push *--prune*)`;
  - tag pushes and skipping the hook: `Bash(git push *--tags*)`,
    `Bash(git push *--follow-tags*)`, `Bash(git push *--no-verify*)`;
  - the shared stash: `Bash(git stash drop *)`, `Bash(git stash clear *)`;
  - switches that discard changes or reset a branch: `Bash(git switch *--discard-changes*)`,
    `Bash(git switch *--force*)`, `Bash(git switch -f *)`, `Bash(git switch * -f)`,
    `Bash(git switch * -f *)`, `Bash(git switch -C *)`, `Bash(git switch * -C *)`,
    `Bash(git checkout -b * -f)`, `Bash(git checkout -b * -f *)`,
    `Bash(git checkout -b *--force*)`;
  - `Bash(gh pr comment *--delete-last*)`, `Bash(bun publish *)` and
    `Bash(mise exec -- bun publish *)`.
- **Unchanged:** every other entry, including `Bash(git push *)`, `Bash(git switch *)`,
  `Bash(git checkout -b *)`, `Bash(bun *)`, `Bash(gh pr edit *)` and `Bash(gh pr comment *)`,
  and each app's own entries from `app-kit.json`. A pushed tag by name, `git -C . push` and
  combined short flags such as `-uf` are not matched: the rules catch slips, not every
  spelling.

Deny rules hold in every permission mode, so the owner runs a refused command in a terminal,
not through Claude Code in the app. Claude Code prints a startup notice for
`Bash(git push * :**)` saying it matches as a wildcard, which is the intent.

### Upgrade

Both apps, in the bump pull request:

- Bump the tag to `#v0.1.2`, then `bun install` and `bun run kit:sync`: the blocks,
  `.claude/settings.json` and `ci.yml` (its tag and one comment) change.
- Delete the text that the block now carries, which sync does not touch because it is outside
  the block: the `bun scripts/pr-reviews.ts [<pr>…] …` sentence in the commands section, and
  the paragraph describing the shared agent workflow, its managed files, `kit:sync`,
  `app-kit.json` and upgrading. Keep any sentence in that paragraph that is the app's own,
  such as what its `biome.json` and `tsconfig.json` add to the bases.
- Re-read the app's own sections against the new block and drop what it now says, keeping
  what still differs. The block defers to the app's own sections on the decision log and the
  browser tool, so those stay or move there.

Bikestack:

- Its decision log (`docs/decisions.md`, next free D-number) and browser tool (`playwright-cli`)
  are the block's defaults: nothing to name.
- The Rules bullet on the self-review's layering and persistence checks: make it cover the
  fresh-context review's brief too, as those are "the rules to check it against".
- `CLAUDE.md`'s "In this repository" section stays (the dev server, D21).

Homeflow:

- In `AGENTS.md`'s "Where Homeflow's practice differs from the shared workflow", drop what the
  block now says: the review subagent, pull request descriptions, the browser walk's
  checklist, and from the gate and the worktree bullets the parts the block carries (`verify`
  before every commit, the output shown, one worktree per stack with `setup` and `verify`
  first, the `rebase --onto` replay).
- Keep there, as Homeflow's own: the section's opening sentences, which make it take
  precedence; the decision log (per-slice logs, numbers reserved on `main` under D18, the
  `Owner review:` line), which the block defers to; the plans without a progress log until
  the next brief; the current brief naming the browser tool, which the block also defers to;
  and the pre-push hook bullet. Two of Homeflow's rules differ from the block and stay only if
  Homeflow keeps the practice: one commit per logical unit, and review follow-ups landing as
  one step on top, where the block fixes findings in the pull request they belong to.
- In the `## Worktrees` section, drop the paragraph the block now carries (`setup` then
  `verify`, and Bun walking up to the parent checkout's `node_modules`). Keep the rest: never
  symlink `node_modules`, hooks, `.data/`, the port, and never nesting worktrees.
- Remove `CLAUDE.md`'s "Claude-specific, for Homeflow" section: the block now carries all four
  of its bullets (`bun run setup` in an inside-repository worktree, the review subagent,
  long-running processes, and the browser tool the repository names).
- The Bun pin stays at 1.3.13: `app-kit sync` from this release runs on it, and nothing in the
  release needs a newer Bun.

An app adopting the kit at this release follows the README's "Adopting the kit" with `#v0.1.2`.

## 0.1.1

No automated pull request review (D7).

- The `template:agent-workflow` block in `AGENTS.md` no longer says Codex reviews each pushed
  pull request: the agent's own review of its diff is the only one before the owner's, and the
  stack summary lists review findings from whoever left them.
- `scripts/pr-reviews.ts` lists and answers review threads from anyone. It no longer prints
  each pull request's latest Codex note, and its `--json` output drops `latestCodexNote`.

### Upgrade

- The sentence on `bun scripts/pr-reviews.ts` in `AGENTS.md`'s commands section is outside the
  synced block. Drop "(Codex's included)" from it by hand, as app-kit's own file has it.
- An app adopting the kit at this release follows the steps under 0.1.0 with `#v0.1.1`.

## 0.1.0

The agent workflow, the configuration bases and CI. No application code yet.

- `@axelekwall/app-kit/biome.json` and `@axelekwall/app-kit/tsconfig.json`, the Biome and
  TypeScript bases for `extends`.
- `app-kit sync` and `app-kit check`: the `template:agent-workflow` blocks in `AGENTS.md` and
  `CLAUDE.md`, and the managed files `.githooks/pre-push`, `scripts/pr-reviews.ts`,
  `.claude/settings.json`, `tests/agents-commands.test.ts`, `tests/bun-version.test.ts` and
  `tests/app-kit.test.ts`. `app-kit.json` holds the app's extra permission entries and its
  `ci` values.
- `.github/workflows/image.yml`, the reusable workflow: verify, the image smoke test and the
  arm64 push to GHCR. Sync writes the app's `ci.yml` to call it at the same tag.

### Upgrade

Adopting the kit, in one pull request:

1. Add `"@axelekwall/app-kit": "github:axelekwall/app-kit#v0.1.0"` to `devDependencies`, and
   a `"kit:sync": "app-kit sync"` script, documented in `AGENTS.md`'s command block.
2. Put the `template:agent-workflow` begin and end markers around the shared sections of
   `AGENTS.md` and `CLAUDE.md`, as app-kit's own files have them. Text outside them stays the
   app's.
3. Add `app-kit.json`: `permissions.allow` for entries the app needs beyond the shared list,
   and `ci` with at least `app`. `"image": false` for an app without a Dockerfile.
4. `"extends": ["@axelekwall/app-kit/biome.json"]` in `biome.json` and `"extends":
   "@axelekwall/app-kit/tsconfig.json"` in `tsconfig.json`, keeping only what the app adds.
5. `bun run kit:sync`, then `bun run verify:full`. Review the diff: the sync replaces the
   blocks and managed files whole.
