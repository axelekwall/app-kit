# Decisions

One entry per contested choice: what was picked and why. Agents add entries with status
`accepted-by-default` and the next free number. The owner's choices are `accepted`.

## D1 — A public package, delivered by tag

**Date:** 2026-10-23 · **Status:** accepted

- **A package, not a project template.** One versioned package carries the shared code,
  configuration, CI workflow and agent workflow to every app. Copier and a template repository
  copy files once and leave later changes to a merge in each app. The comparison is in the
  homelab plan's "Considered" section.
- **Name:** `axelekwall/app-kit`, package `@axelekwall/app-kit`.
- **Public, MIT-licensed.** Installs, the reusable workflow and cloud agents need no
  credentials. A private repository would have needed a deploy key and a secret in every app.
- **A git dependency pinned to an exact tag**, with no registry.
- **Small values stay in each app.** `LocalDate`, `Money`, `Result` and `uuidv7` are copied
  rather than exported, so the apps' domain layers keep importing only their own modules.

## D2 — Configuration bases resolve by package name, from `*.base.json` files

**Date:** 2026-10-23 · **Status:** accepted-by-default

- **By package name.** An app writes `"extends": ["@axelekwall/app-kit/biome.json"]` in
  `biome.json` and `"extends": "@axelekwall/app-kit/tsconfig.json"` in `tsconfig.json`. Biome
  2.5.12 and TypeScript 7.0.2 both resolve these through the exports map, so no path into
  `node_modules` is needed. `tests/config-bases.test.ts` installs the package into a consumer
  and holds this.
- **The files are `config/biome.base.json` and `config/tsconfig.base.json`.** Biome treats any
  `biome.json` under the project as a nested root configuration and refuses two roots, so the
  base cannot be named `biome.json` inside app-kit. The export names stay `./biome.json` and
  `./tsconfig.json`.
- **A base holds what both apps' files share.** Layer fences, `files.includes`, `paths`,
  `include`, `jsx` and Tailwind parsing stay in each app: they name the app's directories or
  depend on its frontend. `resolveJsonModule`, which only bikestack sets, is in the base; it
  only allows more.
- **Bun does not follow it** (found adopting `v0.1.1`, 2026-10-27). Bun's bundler and runtime
  read a relative `extends` but ignore one given by package name: on Bun 1.4.4 a base's
  `jsxImportSource` applies through a relative path and not through a package-name path. So
  the base never takes an option Bun reads, and the ones the apps set (`jsx`,
  `jsxImportSource`, `paths`) stay in each app's own `tsconfig.json`. `tsc` would accept them
  in the base while Bun's bundle silently changed.
- **`verify:full` stays equal to `verify`.** The consumer test needs one offline-cacheable
  `bun install` and takes about a second, so it runs in `bun test`.

## D3 — app-kit's own files are the canonical shared content

**Date:** 2026-10-23 · **Status:** accepted-by-default

- **No template copies.** The shared blocks are the `template:agent-workflow` blocks in
  app-kit's own `AGENTS.md` and `CLAUDE.md`, and each managed file is app-kit's own file at the
  same path. `app-kit sync` copies them from the installed package. A separate `workflow/`
  directory would have held a second copy of every file inside app-kit, and `bun test` would
  have run the template copies of the two managed tests. Only files that differ per app
  (`.claude/settings.json` with an app's extra entries, and the app's `ci.yml`) are generated.
- **The managed files:** `scripts/pr-reviews.ts`, `.githooks/pre-push`, `.claude/settings.json`,
  `tests/bun-version.test.ts` and `tests/agents-commands.test.ts`, which both apps already
  carry, the drift test, and the app's `ci.yml`. Each says it is managed, where its format
  allows a comment.
- **The blocks take no variables.** Their app-specific wording was rewritten instead: the review
  step names "the rules above" rather than bikestack's persistence and layering rules; the
  dev-server bullet applies "where the repository has one"; and the guard paragraph says the
  owner protects `main` where the forge allows it and the agreement holds where it does not,
  without a decision number. The apps are private repositories on a plan with no branch
  protection, and each records that in its own log (bikestack D21, homeflow D11).

## D4 — `app-kit sync`: whole managed files, one block per file, `app-kit.json` required

**Date:** 2026-10-23 · **Status:** accepted-by-default

- **The block** runs from the start of the HTML comment holding `template:agent-workflow begin`
  to the end of the `template:agent-workflow end` comment, so the marker comment's own text is
  shared too. A file with no block, two blocks or the markers reversed is refused, naming the
  file. Every refusal comes before anything is written.
- **Managed files are replaced whole.** `.githooks/pre-push` is also made executable, and
  `check` reports a hook that is not. `.claude/settings.json` is the package's list with the
  app's `permissions.allow` from `app-kit.json` appended, each entry once.
- **`app-kit.json` is required**, with `{}` for the defaults, so adopting the kit is explicit.
  Unknown keys are refused, so a misspelt key is not silently ignored. It holds only
  `permissions` until the reusable workflow adds its values.
- **The drift test imports `@axelekwall/app-kit/sync`.** `tests/app-kit.test.ts` is the same
  file in every app and in app-kit, where the import resolves through the package's own name;
  Bun and TypeScript both support that. Running the check in-process keeps a failure in the
  test output rather than in a subprocess's.
- **The command runs on Bun as TypeScript** (`bin` points at `src/cli/main.ts` with a Bun
  shebang). An app calls it from its `kit:sync` script.

## D5 — The reusable workflow takes the smoke test's app-specific values as inputs

**Date:** 2026-10-23 · **Status:** accepted-by-default

- **`image.yml` is bikestack's `ci.yml` with its names made inputs:** `app` (the binary, the
  image and the container), `image` (whether the image jobs run), `time-zone`, and two smoke
  values that are bikestack's rather than the template's: `smoke-api-path`, an API path that
  answers 401 without a session and 200 with one, and `smoke-stop-log`, the line logged on a
  clean shutdown. Empty skips the probe, so the template's own checks (health, the Host check,
  exit code 0 on SIGTERM) always run. The image goes to `ghcr.io/<owner>/<app>`.
- **The app's `ci.yml` is generated** from the `ci` values in `app-kit.json` and calls
  `image.yml` at `v<package version>`, so bumping the package and syncing moves both. It always
  grants `packages: write`: GitHub refuses to start a caller that grants less than a called job
  asks for, even when that job is skipped (`startup_failure`). Without `ci` values the file is
  not managed, which is how app-kit leaves its own `ci.yml` alone.
- **app-kit's own `ci.yml` keeps a direct `verify` job** and adds a job that calls `image.yml`
  from the same commit with the image jobs off. A job inside a called workflow reports as
  `<caller job> / verify`, which the required `verify` check would not match. Requiring
  `image-workflow / verify` instead would drop the duplicate run; that is a branch protection
  change for the owner.
- **The image jobs are first exercised in bikestack's adoption pull request**, where the smoke
  test runs on the pull request before anything is published.

## D6 — Releases are tagged by a workflow on the merged bump

**Date:** 2026-10-23 · **Status:** accepted-by-default

- **`.github/workflows/release.yml`** runs on pushes to `main` that touch `package.json`. When
  the version is not `0.0.0` and `v<version>` does not exist, it tags the pushed commit with a
  lightweight tag. The tag is the release; there is no GitHub release object or registry.
- **A version needs its `## <version>` section in `CHANGELOG.md`.** The workflow refuses to
  tag without it, and `tests/release.test.ts` fails the release pull request first.
- **`0.0.0` is the unreleased version**, so the stack's earlier pull requests, which change
  `package.json` without releasing, tag nothing.
- **Only the tagging job has `contents: write`.** The rest of the workflow is read-only.

## D7 — No automated pull request review

**Date:** 2026-10-27 · **Status:** accepted (the owner's decision)

The owner turned off Codex's automatic review of pull requests. The shared agent workflow no
longer says a reviewer arrives within minutes: the agent's own review of its diff is the only
one before the owner's, and the stack summary lists review findings from whoever left them.
`scripts/pr-reviews.ts` lists and answers review threads from anyone, and no longer looks for
Codex's notes.

## D8 — A fresh-context review before each pull request

**Date:** 2026-10-27 · **Status:** accepted-by-default

Amends D7. With no automated reviewer, the agent's own pass was the only review before the
owner's, and an agent reviewing its own diff reads it through its own intent. The shared
workflow now adds a second review after that pass, by a reviewer with a fresh context: a
subagent, or a new session of any agent. Homeflow already worked this way in its slice 4.

- **The brief is the diff, the plan section and the rules**, not the author's conclusions. A
  reviewer handed the author's reading of the change tends to confirm it.
- **Findings come ranked, with file, line and consequence**, so they can be checked and
  answered one by one. Valid ones are fixed in the pull request they belong to; the rest get a
  one-line answer.
- **The diff is the change against the branch below**, reviewed before it is committed, and
  the reviewer only reads. `verify:full` runs again after the fixes, so nothing the reviews
  changed reaches a commit unchecked; the dev-server check comes first, so the reviewers see
  anything it changed.
- **The stack summary lists every finding**, from the agent's own pass, the fresh-context
  review and any review thread, with how each was handled.
- **`CLAUDE.md` names the mechanism for Claude Code**: a subagent started with the Agent tool.
  `AGENTS.md` stays tool-neutral, so another agent can use a new session.

## D9 — The shared permissions refuse the irreversible forms of routine commands

**Date:** 2026-10-27 · **Status:** accepted-by-default (narrowing them is the owner's decision)

Homeflow's review of `v0.1.1` found the shared allow list wider than the work needs:
`git push *` covered force pushes and remote deletes, `git stash *` covered dropping and
clearing the stash every worktree shares, and `gh api --method GET *` let a later `-X DELETE`
through. The list keeps routine work prompt-free and now closes those forms.

- **Deny rules, not a narrower allow list.** Claude Code evaluates deny, then ask, then allow,
  and an allow rule cannot carve an exception out of a deny. So `git push *` stays allowed and
  deny rules refuse `--force` and `-f` in any position, a `+` refspec, `--delete`, `-d`, a `:`
  refspec, `--mirror`, `--prune`, `--tags`, `--follow-tags` and `--no-verify`, each in the
  positions git accepts it.
  `--force-with-lease` stays allowed: the working agreement allows it on the agent's own
  branches, and the `--force` rules match the flag as a whole word, not as a prefix.
- **The stash.** `git stash *` becomes `push`, `list`, `show` and `apply`; `drop` and `clear`
  are denied rather than asked, so an agent cannot drop even its own entry: an entry left
  behind costs nothing, and the owner clears the stash. `pop` and a bare `git stash` prompt,
  since pop drops an entry another session may own.
- **`git switch` that discards changes or resets a branch** (`-f`, `--force`,
  `--discard-changes`, `-C` and `--force-create`) is denied, as is `git checkout -b` with `-f`
  or `--force`; the rest of `git switch *` and `git checkout -b *` stays allowed.
- **`gh pr edit` and `gh pr comment` stay allowed on any pull request.** The agent edits its own
  stacked pull requests constantly (retargeting, descriptions, the stack summary), and a rule
  cannot tell its pull requests from anyone else's; the working agreement limits them to its
  own. `gh pr comment --delete-last` is denied.
- **`gh api` reads.** A second `-X` or `--method` after the `GET`, and any `graphql` call, ask
  rather than run: ask rules come before allow, so the `GET` entries cannot be widened by a
  later flag.
- **`bun *` stays.** Narrowing it to `bun run`, `bun test` and `bun install` would not contain
  anything, since any script can run any code; `bun publish` is denied, with its `mise exec`
  form, because a deny rule does not match past `mise exec --`.
- **The matcher's limits.** The rules match the command text after Claude Code splits compound
  commands and strips wrappers such as `timeout`. They do not match `git -C . push`, combined
  short flags such as `-uf`, or a tag pushed by name, and they are not a security boundary;
  `CLAUDE.md`'s block says so where agents read it.
  A rule ending in `:*` is Claude Code's legacy prefix form, so the `:` refspec rule ends in
  `:**`; Claude Code prints a startup notice for it saying it matches as a wildcard.
- **Checked twice.** `tests/permissions.test.ts` classifies routine and irreversible commands
  under the documented matching rules. A headless Claude Code 2.1.309 run in a checkout with
  this list refused the force, `+`, `--delete`, `:`, `--no-verify` and `stash drop` probes
  (dry runs), ran `--force-with-lease` and `-u` pushes, and asked for a second `-X`.
- **Apps still add allow entries** through `app-kit.json`; the package's ask and deny rules are
  written as they are, and an app entry that a deny rule covers stays refused.
- **The sync writes JSON as Biome formats it.** A list short enough for one line is written on
  one line, as Biome's formatter collapses it; before, a short `ask` list would have failed
  every app's `bun run check` after the sync.

## D10 — The rules both apps follow move into the shared blocks

**Date:** 2026-10-27 · **Status:** accepted-by-default

Adopting `v0.1.1`, homeflow kept a section of rules that differ from the shared text, and
bikestack moved app-specific text out of the blocks. The rules both apps follow are now shared;
what stays different is named by the app, in its own sections above the block, which the
shared text defers to.

- **The gate:** `verify` before every commit and nothing red committed, `verify:full` before a
  pull request, and the gate's output shown when reporting rather than a statement that it
  passed.
- **Worktrees:** one per stack, from an up-to-date `origin/main`, with `setup` and `verify`
  first. A worktree inside the repository needs its own `bun run setup`, since Bun resolves the
  parent checkout's `node_modules` otherwise; `CLAUDE.md` says so beside its native-worktree
  bullet.
- **Merging a stack:** after a squash merge the branches above it are replayed with
  `git rebase --onto … --update-refs` from the top branch, since they still hold the merged
  commits under their old hashes. The old tip comes from the merged pull request's
  `headRefOid`, which outlives the pruned branch. A stack created as GitHub stacked pull
  requests merges in one action from its top pull request instead. Both are the owner's
  merges; the agent replays.
- **The browser check:** 1280 and 390 pixels, light and dark, the keyboard path through every
  new control, on the worktree's own server and database. The tool is the one the app names,
  `playwright-cli` where it names none: bikestack uses `playwright-cli`, and homeflow's current
  build brief names another.
- **Pull request descriptions** also name the plan section implemented and, for a UI change,
  what the browser check covered, and reference no local, untracked files.
- **The decision log** defaults to `docs/decisions.md` with the next free D-number, unless the
  app names another log, numbering or format above the block. Homeflow keeps per-slice logs and
  reserves numbers on `main` first.
- **The dev-server bullet** overrides the global rule for other long-running processes too.
- **The block's first section says where the workflow comes from**: the managed files,
  `kit:sync`, `app-kit.json` and how to upgrade, so each app's copy of that list cannot go
  stale. The `pr-reviews.ts` usage moved into "Stacks and handover" for the same reason. Each
  app drops its hand-written copies of both.

## D11 — The reusable workflow stays called by tag

**Date:** 2026-10-27 · **Status:** accepted (the owner's decision)

The generated `ci.yml` calls `image.yml` at `v<package version>`, not at a commit SHA. An app
that pins every action by SHA, as bikestack does (its D36), records this call as an exception.
The tag is the release: sync writes it from the installed package, so bumping the dependency
and syncing moves the workflow with the rest of the kit, and the drift test fails if `ci.yml`
alone moves. For the same reason an app's Dependabot ignores `axelekwall/app-kit*`.

The cost: the lockfile pins the package to a commit, but GitHub resolves `uses: …@v0.1.x` when
the run starts, so a moved tag would change the job that builds and publishes an app's image
without a commit in the app. The mitigation is D6: tags are created only by the release
workflow on a merged bump, `main` is protected, and agents never create or push tags.
