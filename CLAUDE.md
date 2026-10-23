@AGENTS.md

<!--
  template:agent-workflow begin
  Owned by the shared agent-workflow template; keep it free of app-specific content.
-->

# Claude-specific

- **Start the dev server and check the running app yourself.** Checking your own work against
  the running application is expected here, rather than handing it back unverified; this
  overrides any global rule against starting dev servers. Stop what you start.
- The dev port is derived from the worktree path and written to `.data/dev-url`, so parallel
  checkouts do not collide. For the browser pane, write a gitignored `.claude/launch.json` in
  your checkout with `runtimeExecutable: "env"`, `runtimeArgs: ["PORT=<port>", "bun", "run",
  "dev"]` and the same `port`, choosing a port no other checkout on this machine uses. Never
  point a pane at another worktree's server: its database is that worktree's.
- For browser checks use `playwright-cli` with its own session (`-s=<name>`), and close the
  session when done.
- Prefer Claude Code's native worktrees (under `.claude/worktrees/`).
- Routine `bun`, local `git`, `gh pr`, read-only `gh api` and `playwright-cli` calls are
  allowlisted in `.claude/settings.json` so they run without a prompt. The list is for speed,
  not safety: the working agreement in `AGENTS.md` sets what you may do (D21).

<!-- template:agent-workflow end -->
