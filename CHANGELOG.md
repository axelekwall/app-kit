# Changelog

One section per release, newest first. Versions are SemVer; while in `0.x`, a breaking change
bumps the minor version. "Upgrade" lists what an app must do when it bumps to that release,
besides bumping the tag and running `bun install` and `bun run kit:sync`.

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
