# Phase 0: the kit and its plumbing

The first phase of `../homelab/docs/app-kit-plan.md`. It packages the layer that is already
stable (the agent workflow, the configuration bases and CI) and proves the delivery path
before any app code moves. No application code is extracted in this phase.

**Done when** bikestack's CI is green on `v0.1.0`, and a `v0.1.1` bump has gone through the
whole cycle: release, tag, bump in bikestack, sync, verify.

## Stack in this repository

Proposed. The first agent refines it and records the result here.

| # | Pull request |
|---|---|
| 1 | Tooling: `package.json` (`@axelekwall/app-kit`, `0.0.0`, private exports map), the Bun pin in `.bun-version`, `packageManager` and `mise.toml` with the test that holds them equal, Biome, TypeScript 7, `setup`, `verify`, `verify:full`, the pre-push hook, `scripts/pr-reviews.ts` copied from bikestack, and a CI workflow running `verify:full`. The commands test for `AGENTS.md`. |
| 2 | Configuration bases: `biome.json` and `tsconfig.json` exported for `extends`, with a fixture consumer under `tests/` that proves both resolve from `node_modules` on the pinned Biome and TypeScript. If the package name does not resolve, a path does; record which in a decision. |
| 3 | The agent-workflow content: the `AGENTS.md` and `CLAUDE.md` blocks and the managed files, lifted from bikestack and made generic. Bikestack-specific wording comes out: the reference to its D21, "the persistence and layering rules above", and anything about a dev server that an app without one would not have. |
| 4 | `app-kit sync` and `app-kit check`: blocks between the `template:agent-workflow` markers, managed files, `app-kit.json` variables, refusals that name the file. Tests over temporary directories. app-kit runs `check` on itself. |
| 5 | The reusable workflow `.github/workflows/image.yml`, built from bikestack's `ci.yml`: verify, the amd64 image smoke test, and the arm64 push to GHCR on `main`. Inputs for the app name, the time zone, and whether the image steps run. |
| 6 | Releasing: `CHANGELOG.md`, and a workflow on `main` that tags `v<version>` when `package.json`'s version changes. The bump to `0.1.0`. |

Then, in bikestack, as its own one-pull-request stack: the dependency at `v0.1.0`,
`app-kit.json`, `kit:sync`, the drift test, `extends`, and `ci.yml` calling the reusable
workflow. The sync must reproduce bikestack's current files, so the pull request changes no
behaviour. Then a `v0.1.1` round trip.

## For the owner

- Branch protection on `main`, as on the apps: a pull request with passing CI, and no force
  pushes or deletion. Until it is on, nothing technical stops a push to `main`. The working
  agreement still forbids it.
- Codex review on this repository, if it should review here as it does in the apps.
- Allow the release workflow to push tags (`contents: write` for that workflow).

## Progress log

Update after every pull request: what is done, what is next, and the `Active:` line.

Active: none.

- 2026-10-23: repository created with this plan, the README, the MIT licence, the agent setup
  copied from bikestack and D1. Next: PR 1, tooling.
