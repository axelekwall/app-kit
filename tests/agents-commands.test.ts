/**
 * `AGENTS.md`'s command block and `package.json` say the same thing.
 *
 * The block is the first thing an agent reads and the last thing anyone
 * remembers to update. A command nobody documented is a command nobody runs,
 * and a documented command that no longer exists sends the reader after a
 * script that is not there. `bun test` is written as itself in the block,
 * because that is how it is run.
 */

import { describe, expect, test } from "bun:test"

const ROOT = `${import.meta.dir}/..`
const AGENTS = await Bun.file(`${ROOT}/AGENTS.md`).text()
const PACKAGE = await Bun.file(`${ROOT}/package.json`).json()

/** The script each line of the block invokes, in the order the block lists them. */
function documentedCommands(markdown: string): string[] {
  const block = /## Commands\s*\n+```\n([\s\S]*?)```/.exec(markdown)
  if (block === null) throw new Error("No fenced command block under a `## Commands` heading")

  const commands: string[] = []
  for (const line of (block[1] ?? "").split("\n")) {
    const invocation = /^bun (?:run )?([\w:-]+)/.exec(line.trim())
    if (invocation?.[1] !== undefined) commands.push(invocation[1])
  }
  return commands
}

describe("the command block in AGENTS.md", () => {
  test("documents every script in package.json, and no script that is gone", () => {
    expect([...documentedCommands(AGENTS)].sort()).toEqual(
      Object.keys(PACKAGE.scripts as Record<string, string>).sort(),
    )
  })

  test("lists each command once", () => {
    const documented = documentedCommands(AGENTS)
    expect(documented).toEqual([...new Set(documented)])
  })
})
