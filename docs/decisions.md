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
