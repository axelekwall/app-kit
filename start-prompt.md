# Start prompt

The prompt for the first agent session in this repository. Start it from `~/dev/app-kit`
by pasting the block below, or by asking the agent to follow this file. Later sessions resume
from the progress log in `docs/plans/` instead (see "Resuming work" in `AGENTS.md`).

```
You're starting work in app-kit, the new shared package for my personal apps. The repository
was just created and only holds docs.

1. Read AGENTS.md, docs/decisions.md and docs/plans/phase-0.md. Then read the overall plan:
   ../homelab/docs/app-kit-plan.md on homelab's main. If it isn't merged yet, use
   git -C ../homelab show origin/docs/app-kit-plan:docs/app-kit-plan.md
   Also skim ../homelab/docs/app-template.md, and ../bikestack for the code and harness
   you'll be lifting (its AGENTS.md, CLAUDE.md, .claude/settings.json, scripts/pr-reviews.ts,
   biome.json, tsconfig.json, .github/workflows/ci.yml, the Bun pin and its tests).
2. Take over phase 0: set the Active: line in docs/plans/phase-0.md to you and this machine.
3. Review the proposed stack in phase-0.md against bikestack's actual files. Refine it if
   needed and record the result in the plan.
4. Build the stack in this repository (PRs 1–6) following AGENTS.md's working agreement:
   stacked PRs, verify:full before each, decisions logged in docs/decisions.md. Until PR 1
   adds the commands, say which checks don't exist yet rather than skipping them silently.
5. Don't touch bikestack in this run. Its adoption of v0.1.0 is a separate stack after
   app-kit's is merged and tagged.
6. Stop and ask before anything external: branch protection, repository settings, secrets,
   tags, or publishing.

Hand over with the stack summary on the top PR, and update the progress log.
```
