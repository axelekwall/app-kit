/**
 * The shared permission list keeps routine work prompt-free and refuses the
 * irreversible forms of it.
 *
 * Commands are classified the way Claude Code's documentation describes its
 * Bash rules: deny, then ask, then allow; a `*` stands for any text; and a
 * trailing ` *` that is a rule's only wildcard also matches the bare command.
 * A rule ending in `:*` is the legacy prefix form; beside another `*` Claude
 * Code reads the whole rule as a literal prefix, as its startup notice for such
 * a rule says. So the rule for a refspec starting with a colon ends in `:**`,
 * and the model below makes a `:*` version of it fail the deny cases.
 * Claude Code also splits compound commands and strips wrappers such as
 * `timeout` before matching, which this model leaves out: every command here
 * is a single one.
 */

import { describe, expect, test } from "bun:test"

const ROOT = `${import.meta.dir}/..`
const SETTINGS = (await Bun.file(`${ROOT}/.claude/settings.json`).json()) as {
  permissions: { allow: string[]; ask: string[]; deny: string[] }
}

function matches(rule: string, command: string): boolean {
  const pattern = /^Bash\((.*)\)$/s.exec(rule)?.[1]
  if (pattern === undefined) return false
  // The legacy `:*` suffix: alone it is a trailing ` *`, but beside another `*`
  // the whole rule is a literal prefix, which Claude Code warns about at startup.
  if (pattern.endsWith(":*")) {
    const prefix = pattern.slice(0, -2)
    if (prefix.includes("*")) return command.startsWith(prefix)
    return matches(`Bash(${prefix} *)`, command)
  }
  const source = pattern
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*")
  if (new RegExp(`^${source}$`, "s").test(command)) return true
  const bare = pattern.endsWith(" *") && pattern.indexOf("*") === pattern.length - 1
  return bare && command === pattern.slice(0, -2)
}

type Outcome = "deny" | "ask" | "allow" | "prompt"

function outcome(command: string): Outcome {
  const { allow, ask, deny } = SETTINGS.permissions
  if (deny.some((rule) => matches(rule, command))) return "deny"
  if (ask.some((rule) => matches(rule, command))) return "ask"
  if (allow.some((rule) => matches(rule, command))) return "allow"
  return "prompt"
}

const EXPECTED: Record<Outcome, string[]> = {
  allow: [
    "bun run verify:full",
    "mise exec -- bun test",
    "bun scripts/pr-reviews.ts reply PRRT_x 'Fixed in the commit above.'",
    "git push",
    "git push -u origin feat/x",
    "git push --force-with-lease",
    "git push --force-with-lease origin feat/x",
    "git push --force-with-lease --force-if-includes origin feat/x",
    "git push origin HEAD:refs/heads/feat-x",
    "git push origin claude/fix-f",
    "git stash push -u -m wip-tag",
    "git stash list --format='%H %gs'",
    "git stash apply 3f2a",
    "git switch -c feat/x",
    "git switch main",
    "git checkout -b feat/x origin/main",
    "git rebase --onto main old-base feat/x",
    "gh pr edit 12 --base main",
    "gh pr comment 12 --body-file summary.md",
    "gh api --method GET repos/o/r/pulls/12/comments",
    "gh api -X GET repos/o/r/pulls --paginate",
  ],
  ask: [
    "gh api --method GET repos/o/r/git/refs/heads/x -X DELETE",
    "gh api -X GET repos/o/r/git/refs/heads/x --method DELETE",
    "gh api -X GET repos/o/r -XPATCH",
    "gh api -X GET graphql -f query='mutation { x }'",
  ],
  deny: [
    "git push --force",
    "git push --force origin feat/x",
    "git push origin feat/x --force",
    "git push -f origin feat/x",
    "git push origin feat/x -f",
    "git push origin -f feat/x",
    "git push origin +feat/x",
    "git push origin --delete feat/x",
    "git push --delete origin feat/x",
    "git push -d origin feat/x",
    "git push origin -d feat/x",
    "git push origin feat/x -d",
    "git push origin :feat/x",
    "git push --mirror origin",
    "git push --prune origin",
    "git push --tags",
    "git push origin v1.0.0 --follow-tags",
    "git push --no-verify origin main",
    "git stash drop",
    "git stash drop stash@{0}",
    "git stash clear",
    "git switch --discard-changes main",
    "git switch -f main",
    "git switch --force main",
    "git switch main -f",
    "git switch -C main origin/main",
    "git switch --no-track -C main origin/main",
    "git checkout -b feat/x -f",
    "gh pr comment 12 --delete-last",
    "bun publish",
    "mise exec -- bun publish --dry-run",
  ],
  prompt: ["git stash", "git stash pop", "gh pr merge 12", "gh pr close 12", "git tag v1.0.0"],
}

describe("the shared permission list", () => {
  for (const [expected, commands] of Object.entries(EXPECTED)) {
    test(`gives ${expected} for ${commands.length} commands`, () => {
      expect(commands.map((command) => [command, outcome(command)])).toEqual(
        commands.map((command) => [command, expected]),
      )
    })
  }
})
