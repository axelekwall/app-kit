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
