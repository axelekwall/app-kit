import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { chmod, mkdtemp, readdir, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { drift, KIT_ROOT, parseConfig, replaceBlock, SyncRefusal, sync } from "./sync"

const BLOCK = [
  "<!--",
  "  template:agent-workflow begin",
  "  An old comment.",
  "-->",
  "",
  "An old shared section.",
  "",
  "<!-- template:agent-workflow end -->",
].join("\n")

let app: string

async function write(path: string, content: string) {
  await Bun.write(join(app, path), content)
}

async function read(path: string): Promise<string> {
  return Bun.file(join(app, path)).text()
}

async function kitBlock(path: string): Promise<string> {
  const text = await Bun.file(join(KIT_ROOT, path)).text()
  const start = text.indexOf("<!--\n  template:agent-workflow begin")
  const endMarker = "<!-- template:agent-workflow end -->"
  return text.slice(start, text.indexOf(endMarker) + endMarker.length)
}

/** An app that has adopted the markers but never synced. */
async function staleApp() {
  await write("app-kit.json", JSON.stringify({ permissions: { allow: ["Bash(make *)"] } }))
  await write("AGENTS.md", `# An app\n\nIts own rules.\n\n${BLOCK}\n\nA trailing note.\n`)
  await write("CLAUDE.md", `@AGENTS.md\n\n${BLOCK}\n`)
}

beforeEach(async () => {
  app = await mkdtemp(join(tmpdir(), "app-kit-sync-"))
})

afterEach(async () => {
  await rm(app, { recursive: true, force: true })
})

describe("sync", () => {
  test("writes the package's blocks and files, and keeps the app's own text", async () => {
    await staleApp()
    await sync(app)

    const agents = await read("AGENTS.md")
    expect(agents.startsWith("# An app\n\nIts own rules.\n\n")).toBe(true)
    expect(agents.endsWith("\n\nA trailing note.\n")).toBe(true)
    expect(agents).toContain(await kitBlock("AGENTS.md"))
    expect(agents).not.toContain("An old shared section.")
    expect(await read("CLAUDE.md")).toBe(`@AGENTS.md\n\n${await kitBlock("CLAUDE.md")}\n`)

    for (const path of [
      "scripts/pr-reviews.ts",
      "tests/bun-version.test.ts",
      ".githooks/pre-push",
    ]) {
      expect(await read(path)).toBe(await Bun.file(join(KIT_ROOT, path)).text())
    }
    expect((await stat(join(app, ".githooks/pre-push"))).mode & 0o111).not.toBe(0)
  })

  test("appends the app's extra permission entries to the package's, each once", async () => {
    await staleApp()
    await write(
      "app-kit.json",
      JSON.stringify({ permissions: { allow: ["Bash(make *)", "Bash(bun *)"] } }),
    )
    await sync(app)

    const kit = await Bun.file(join(KIT_ROOT, ".claude/settings.json")).json()
    const synced = JSON.parse(await read(".claude/settings.json"))
    expect(synced.permissions.allow).toEqual([...kit.permissions.allow, "Bash(make *)"])
  })

  test("leaves nothing to report afterwards, and a second sync writes nothing", async () => {
    await staleApp()
    expect((await sync(app)).length).toBeGreaterThan(0)
    expect(await drift(app)).toEqual([])
    expect(await sync(app)).toEqual([])
  })
})

describe("check", () => {
  test("reports a missing file, an edited file and a hook that is not executable", async () => {
    await staleApp()
    await sync(app)
    await rm(join(app, "scripts/pr-reviews.ts"))
    await write("AGENTS.md", (await read("AGENTS.md")).replace("Never run", "Feel free to run"))
    await chmod(join(app, ".githooks/pre-push"), 0o644)

    expect(await drift(app)).toEqual([
      { path: "AGENTS.md", reason: "content" },
      { path: ".githooks/pre-push", reason: "mode" },
      { path: "scripts/pr-reviews.ts", reason: "missing" },
    ])
  })

  test("ignores edits outside the markers", async () => {
    await staleApp()
    await sync(app)
    await write("AGENTS.md", `${await read("AGENTS.md")}\n## Another rule of the app's own\n`)
    expect(await drift(app)).toEqual([])
  })
})

describe("refusals", () => {
  async function refusal(): Promise<string> {
    try {
      await sync(app)
    } catch (error) {
      if (error instanceof SyncRefusal) return error.message
      throw error
    }
    throw new Error("sync did not refuse")
  }

  test("an app without app-kit.json", async () => {
    await staleApp()
    await rm(join(app, "app-kit.json"))
    expect(await refusal()).toContain("app-kit.json is missing")
  })

  test("a file without the markers, before anything is written", async () => {
    await staleApp()
    await write("CLAUDE.md", "@AGENTS.md\n")
    expect(await refusal()).toContain("CLAUDE.md has no template:agent-workflow block")
    expect((await readdir(app)).sort()).toEqual(["AGENTS.md", "CLAUDE.md", "app-kit.json"])
  })

  test("a file with two blocks", async () => {
    await staleApp()
    await write("AGENTS.md", `${BLOCK}\n${BLOCK}\n`)
    expect(await refusal()).toContain("AGENTS.md has more than one")
  })
})

describe("app-kit.json", () => {
  test("takes the defaults from an empty object", () => {
    expect(parseConfig("{}")).toEqual({ permissions: { allow: [] } })
  })

  test.each([
    ["not JSON", "{", "is not valid JSON"],
    ["a list", "[]", "must hold a JSON object"],
    ["an unknown key", '{"name": "x"}', 'unknown key "name"'],
    ["entries that are not strings", '{"permissions": {"allow": [1]}}', "list of strings"],
    ["an unknown permissions key", '{"permissions": {"deny": []}}', 'unknown key "deny"'],
    ["null permissions", '{"permissions": null}', '"permissions" must be an object'],
    ["a null allow list", '{"permissions": {"allow": null}}', "list of strings"],
  ])("refuses %s", (_, text, message) => {
    expect(() => parseConfig(text)).toThrow(message)
  })
})

describe("replaceBlock", () => {
  test("refuses an end marker before the begin marker, naming the file", () => {
    const reversed = "<!-- template:agent-workflow end -->\n<!-- template:agent-workflow begin -->"
    expect(() => replaceBlock(reversed, BLOCK, "AGENTS.md")).toThrow(
      "AGENTS.md's template:agent-workflow end marker comes before its begin",
    )
  })
})
