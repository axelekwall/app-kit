# Phase 0: the kit and its plumbing

The first phase of `../homelab/docs/app-kit-plan.md`. It packages the layer that is already
stable (the agent workflow, the configuration bases and CI) and proves the delivery path
before any app code moves. No application code is extracted in this phase.

**Done when** bikestack's CI is green on `v0.1.0`, and a `v0.1.1` bump has gone through the
whole cycle: release, tag, bump in bikestack, sync, verify.

## Stack in this repository

Refined against bikestack's and homeflow's files on 2026-10-23.

Layout: `config/` holds the exported Biome and TypeScript bases, and app-kit's own root
configuration extends them by path. `workflow/` holds the canonical agent-workflow content:
the two blocks and the managed files, as templates. `src/cli/` is the `app-kit` command.
app-kit syncs itself from `workflow/` like any app, so its own copies are checked for drift.

| # | Pull request |
|---|---|
| 1 | Tooling: `package.json` (`@axelekwall/app-kit`, `0.0.0`, `private`, an exports map with only `./package.json` so far), the Bun pin in `.bun-version`, `packageManager` and `mise.toml` with the test that holds them equal, `bunfig.toml` (isolated linker, exact versions, as both apps have), Biome, TypeScript 7, `setup`, `verify`, `verify:full`, the pre-push hook, `scripts/pr-reviews.ts` copied from bikestack, and a CI workflow running `verify:full` in a job named `verify`, the check branch protection requires. The commands block in `AGENTS.md` and its test. With no build, `verify:full` equals `verify` until PR 2 extends it. No peer dependencies yet: Hono, Drizzle and Zod arrive with the first export that imports them, and the Biome fence on Bun APIs with the first Web-API export (phase 3). |
| 2 | Configuration bases: `config/biome.json` and `config/tsconfig.json`, exported as `./biome.json` and `./tsconfig.json`. A base holds what both apps' files share; layer fences, `files.includes`, `paths`, `include`, `jsx` and Tailwind parsing stay in each app. A fixture consumer under `tests/` installs the package and runs the pinned Biome and TypeScript over it, proving both resolve by package name from `node_modules`. A scratch check on 2026-10-23 found both resolve by name on Biome 2.5.12 and TypeScript 7.0.2. |
| 3 | The agent-workflow content in `workflow/`: the `AGENTS.md` and `CLAUDE.md` blocks and the managed files, lifted from bikestack and made generic. Bikestack-specific wording comes out: the reference to its D21, "the persistence and layering rules above", and the dev-server instructions an app without one would not have. Managed files: `scripts/pr-reviews.ts`, `.githooks/pre-push`, `.claude/settings.json`, `.github/workflows/ci.yml` (PR 5), and the two harness tests both apps already carry, `tests/bun-version.test.ts` and `tests/agents-commands.test.ts`. |
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
- Codex review on this repository, if it should review here as it does in the apps.
- Allow the release workflow to push tags (`contents: write` for that workflow).

## Progress log

Update after every pull request: what is done, what is next, and the `Active:` line.

Active: Claude Code (Opus 5.5) on the owner's Mac, building PRs 1 to 6.

- 2026-10-23: repository created with this plan, the README, the MIT licence, the agent setup
  copied from bikestack and D1. Next: PR 1, tooling.
