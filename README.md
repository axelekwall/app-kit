# app-kit

The shared base for small personal apps: one owner per instance, a Bun process with a local
SQLite database, a React SPA, and coding agents doing most of the work. Each app installs
app-kit as a git dependency pinned to a tag. Bumping the tag brings it the shared code,
configuration, CI and agent workflow.

**Status:** `0.1.0` carries the agent workflow, the configuration bases and CI; no application
code yet. See [docs/plans/phase-0.md](docs/plans/phase-0.md) and [CHANGELOG.md](CHANGELOG.md).
The first apps are bikestack and homeflow.

## What it will contain

| Part | Contents | How an app uses it |
|---|---|---|
| `@axelekwall/app-kit/sqlite` | Open the database: refuse newer or edited files, copy before migrating, migrate, set the pragmas | Import in the SQLite adapter |
| `@axelekwall/app-kit/runtime` | Config loading with refusals, listener, SIGTERM shutdown, dev port, static files | Import in the runtime layer |
| `@axelekwall/app-kit/server` | Host check, `/healthz`, request logs, security headers | Import in the Hono app |
| `@axelekwall/app-kit/auth` | Master key, issued keys, sessions, scopes, sign-in and Access pages | Import, and generate the auth tables into the app's migrations |
| `@axelekwall/app-kit/build` | One compiled executable with the web files and migrations embedded | Call from `scripts/build.ts` |
| `@axelekwall/app-kit/testing` | Temporary databases and auth test helpers | Import in tests |
| `biome.json`, `tsconfig.json` | Base configuration | `extends` |
| `.github/workflows/image.yml` | Verify, build, smoke-test and push the arm64 image | `uses:` at the same tag |
| `app-kit sync` / `app-kit check` | Writes the shared blocks of `AGENTS.md` and `CLAUDE.md` and the shared files; reports drift | A package script, and a test in the app |

Code moves in once two apps run a copy of it. Domain code and small values such as
`LocalDate` and `Money` stay in each app.

## Using it in an app

```jsonc
// package.json
"dependencies": {
  "@axelekwall/app-kit": "github:axelekwall/app-kit#v0.1.0"
}
```

```yaml
# .github/workflows/ci.yml
jobs:
  ci:
    uses: axelekwall/app-kit/.github/workflows/image.yml@v0.1.0
```

To upgrade, open one pull request that:

1. bumps both tags;
2. runs `bun install` and `bun run kit:sync`;
3. follows the release's upgrade notes in `CHANGELOG.md`;
4. runs `bun run verify:full`.

## Rules

- Bun only. No native npm modules: apps cross-compile to a single executable.
- TypeScript source with no build step. Shared code uses Web APIs; Bun APIs stay in
  `sqlite`, `runtime`, `build` and `testing`.
- Tags are SemVer. They are created by CI when a version bump is merged, never by hand.

## Background

The standard this implements (the app contract, auth model and stack) is `docs/app-template.md`
in the owner's homelab repository. The plan for this package is `docs/app-kit-plan.md` beside it.

## Licence

[MIT](LICENSE).
