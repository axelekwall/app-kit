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
