@AGENTS.md

<!--
  template:agent-workflow begin
  Written by `app-kit sync` from the @axelekwall/app-kit package; a test fails when it drifts.
  Change it in the app-kit repository.
-->

# Claude-specific

- **Start the dev server and check the running app yourself**, where the repository has one.
  Checking your own work against the running application is expected here, rather than handing
  it back unverified; this overrides any global rule against starting dev servers and other
  long-running processes. Stop what you start.
- With a dev server, the port is derived from the worktree path and written to
  `.data/dev-url`, so parallel checkouts do not collide. For the browser pane, write a
  gitignored `.claude/launch.json` in your checkout with `runtimeExecutable: "env"`,
  `runtimeArgs: ["PORT=<port>", "bun", "run", "dev"]` and the same `port`, choosing a port no
  other checkout on this machine uses. Never point a pane at another worktree's server: its
  database is that worktree's.
- For the browser check in `AGENTS.md`, use the tool the repository names, or `playwright-cli`
  where it names none, in its own `-s=<name>` session, closed when done.
- The fresh-context review in `AGENTS.md` is done by a subagent started with the Agent tool.
  Brief it with the diff, the plan section and the rules, not your conclusions, and tell it to
  review only that diff and change nothing.
- Prefer Claude Code's native worktrees (under `.claude/worktrees/`). They sit inside the
  repository, so run `bun run setup` in each before anything else (see `AGENTS.md`).
- Routine `bun`, local `git`, `gh pr`, read-only `gh api` and `playwright-cli` calls are
  allowlisted in `.claude/settings.json` so they run without a prompt. Its deny rules refuse
  the usual spellings of the irreversible forms among them: force pushes (`--force-with-lease`
  stays allowed), remote deletes, `--tags` pushes, pushes that skip the hook, `git stash drop`
  and `clear` on the stash every worktree shares, and switches that discard changes or reset a
  branch. The owner runs those. The rules match command text, so other spellings get through
  (a tag pushed by name, `git -C . push`): they are for speed and against slips, not a
  boundary, and the working agreement in `AGENTS.md` sets what you may do.

<!-- template:agent-workflow end -->
