# Phase 0: the kit and its plumbing

The first phase of `../homelab/docs/app-kit-plan.md`. It packages the layer that is already
stable (the agent workflow, the configuration bases and CI) and proves the delivery path
before any app code moves. No application code is extracted in this phase.

**Done when** bikestack's CI is green on `v0.1.0`, and a `v0.1.1` bump has gone through the
whole cycle: release, tag, bump in bikestack, sync, verify.

## Stack in this repository

Refined against bikestack's and homeflow's files on 2026-10-23.

Layout: `config/` holds the exported Biome and TypeScript bases, and app-kit's own root
configuration extends them by path. The shared agent-workflow content is app-kit's own: the
blocks in its `AGENTS.md` and `CLAUDE.md` and the managed files at their own paths (D3).
`src/cli/` is the `app-kit` command. app-kit syncs itself like any app.

| # | Pull request |
|---|---|
| 1 | Tooling: `package.json` (`@axelekwall/app-kit`, `0.0.0`, `private`, an exports map with only `./package.json` so far), the Bun pin in `.bun-version`, `packageManager` and `mise.toml` with the test that holds them equal, `bunfig.toml` (isolated linker, exact versions, as both apps have), Biome, TypeScript 7, `setup`, `verify`, `verify:full`, the pre-push hook, `scripts/pr-reviews.ts` copied from bikestack, and a CI workflow running `verify:full` in a job named `verify`, the check branch protection requires. The commands block in `AGENTS.md` and its test. With no build, `verify:full` equals `verify`. No peer dependencies yet: Hono, Drizzle and Zod arrive with the first export that imports them, and the Biome fence on Bun APIs with the first Web-API export (phase 3). |
| 2 | Configuration bases: `config/biome.json` and `config/tsconfig.json`, exported as `./biome.json` and `./tsconfig.json`. A base holds what both apps' files share; layer fences, `files.includes`, `paths`, `include`, `jsx` and Tailwind parsing stay in each app. A fixture consumer in `tests/config-bases.test.ts` installs the package and runs the pinned Biome and TypeScript over it, proving both resolve by package name from `node_modules`. A scratch check on 2026-10-23 found both resolve by name on Biome 2.5.12 and TypeScript 7.0.2. |
| 3 | The agent-workflow content, made generic in place (D3): the `AGENTS.md` and `CLAUDE.md` blocks and the managed files. Bikestack-specific wording comes out: the reference to its D21, "the persistence and layering rules above", and the dev-server instructions as if every repository had one. Managed files: `scripts/pr-reviews.ts`, `.githooks/pre-push`, `.claude/settings.json`, `.github/workflows/ci.yml` (PR 5), and the two harness tests both apps already carry, `tests/bun-version.test.ts` and `tests/agents-commands.test.ts`. |
| 4 | `app-kit sync` and `app-kit check`: blocks between the `template:agent-workflow` markers, managed files, `app-kit.json` variables, refusals that name the file. Tests over temporary directories. A managed drift test, `tests/app-kit.test.ts`, runs `check`; app-kit carries it too, and its own `ci.yml` is left out of the managed set (PR 5). |
| 5 | The reusable workflow `.github/workflows/image.yml`, built from bikestack's `ci.yml`: verify, the amd64 image smoke test, and the arm64 push to GHCR on `main`. Inputs for the app name, the time zone, whether the image steps run, and the app-specific values of bikestack's smoke test. The thin `ci.yml` that sync writes calls it at the package's version. app-kit's own `ci.yml` keeps its direct `verify` job: a job inside a called workflow reports as `<caller> / verify`, which the required check would not match. |
| 6 | Releasing: `CHANGELOG.md`, and a workflow on `main` that tags `v<version>` when `package.json`'s version changes. The bump to `0.1.0`. |

Then, in bikestack, as its own one-pull-request stack: the dependency at `v0.1.0`,
`app-kit.json`, `kit:sync`, the drift test, `extends`, and `ci.yml` calling the reusable
workflow. The sync must reproduce bikestack's current files, so the pull request changes no
behaviour. Then a `v0.1.1` round trip.

## For the owner

- Branch protection on `main` is on (2026-10-23), enforced for admins: a pull request with
  no required approvals, a passing `verify` check (not strict, so a retargeted stack does not
  need a rebase), linear history, and no force pushes or deletion.
- Codex review: settled, there is none, here or in the apps (D7).
- Allow the release workflow to push tags. It asks for `contents: write` on its one job (D6);
  if the repository's Actions settings cap the token at read, the first tag push fails.
- Optional: requiring `image-workflow / verify` in place of `verify` would let app-kit's CI drop
  its duplicate `verify` job (D5).

## Progress log

Update after every pull request: what is done, what is next, and the `Active:` line.

Active: Claude Code (Opus 5.5), in a native worktree on the owner's machine, building the
0.1.2 stack.

- 2026-10-23: repository created with this plan, the README, the MIT licence, the agent setup
  copied from bikestack and D1. Next: PR 1, tooling.
- 2026-10-23: PR 1 (#1), tooling, commands, pre-push hook and CI; `verify:full` green
  locally. Next: PR 2, configuration bases.
- 2026-10-23: PR 2 (#2), configuration bases: both resolve by package name (D2); the bases are
  `config/*.base.json` because Biome refuses a second `biome.json` in the project. Next: PR 3,
  the agent-workflow content.
- 2026-10-23: PR 3 (#3), the shared blocks and managed files made generic in place (D3). Next:
  PR 4, `app-kit sync` and `app-kit check`.
- 2026-10-23: PR 4 (#4), `app-kit sync` and `app-kit check` (D4), with `tests/app-kit.test.ts` as the
  managed drift test and app-kit synced from itself. Next: PR 5, the reusable workflow.
- 2026-10-23: PR 5 (#5), the reusable workflow `image.yml` and the generated `ci.yml` (D5); app-kit's
  CI runs it with the image jobs off. Next: PR 6, releasing.
- 2026-10-23: PR 6 (#6), releasing: `CHANGELOG.md`, `release.yml` (D6) and the bump to `0.1.0`.
  The stack (#1 to #6) is ready for the owner. Next, after it is merged and `v0.1.0` is tagged:
  bikestack's adoption, as its own one-pull-request stack, which is also the first install from
  the public tag and the first run of the image jobs from `image.yml`.
- 2026-10-27: the owner turned off Codex's automatic review. The shared agent workflow and
  `scripts/pr-reviews.ts` no longer expect it (D7). It reaches the apps with the next release.
- 2026-10-27: release `0.1.1` prepared (#9, stacked on #8): the bump and its `CHANGELOG.md`
  section, carrying D7. Bikestack skips `v0.1.0` and adopts `v0.1.1` directly, in its adoption
  pull request after its open stack merges. The phase 0 round trip is then completed by
  `v0.1.2`, homeflow's phase 1 differences, bumped in both apps. Next, after #8 and #9 are
  merged and `v0.1.1` is tagged: bikestack's adoption.
- 2026-10-27: the 0.1.2 stack started, from the harness differences bikestack (its D71) and
  homeflow (its slice 4 decisions log) found adopting `v0.1.1`. PR 1: a fresh-context review
  after the agent's own pass, in the shared block (D8). Next: narrower shared permissions.
- 2026-10-27: PR 2, narrower shared permissions: deny rules for the irreversible forms of the
  allowed `git` and `gh` commands, ask rules for widened `gh api` reads, and the sync writing
  JSON as Biome formats it (D9). Next: the shared workflow rules both apps follow.
