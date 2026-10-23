import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

const MAIN = join(import.meta.dir, "main.ts")
const BLOCK = "<!-- template:agent-workflow begin -->\n<!-- template:agent-workflow end -->\n"

let app: string

async function appKit(...args: string[]) {
  const child = Bun.spawn([process.execPath, MAIN, ...args], {
    cwd: app,
    stdout: "pipe",
    stderr: "pipe",
  })
  const [code, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  return { code, stdout, stderr }
}

beforeEach(async () => {
  app = await mkdtemp(join(tmpdir(), "app-kit-main-"))
  await Bun.write(join(app, "app-kit.json"), "{}")
  await Bun.write(join(app, "AGENTS.md"), BLOCK)
  await Bun.write(join(app, "CLAUDE.md"), BLOCK)
})

afterEach(async () => {
  await rm(app, { recursive: true, force: true })
})

describe("the app-kit command", () => {
  test("check names what is out of step and exits 1; sync fixes it", async () => {
    const before = await appKit("check")
    expect(before.code).toBe(1)
    expect(before.stderr).toContain("  scripts/pr-reviews.ts: missing")

    expect((await appKit("sync")).code).toBe(0)
    const after = await appKit("check")
    expect(after.code).toBe(0)
    expect(after.stdout).toBe("In step with app-kit.\n")
  })

  test("a refusal is a message and exit 1, not a crash", async () => {
    await rm(join(app, "app-kit.json"))
    const result = await appKit("sync")
    expect(result.code).toBe(1)
    expect(result.stderr).toStartWith("app-kit sync: app-kit.json is missing.")
    // One line: no stack trace.
    expect(result.stderr.trimEnd().split("\n")).toHaveLength(1)
  })

  test("an unknown command prints the usage and exits 2", async () => {
    const result = await appKit("update")
    expect(result.code).toBe(2)
    expect(result.stderr).toBe("Usage: app-kit <sync|check>\n")
  })
})
