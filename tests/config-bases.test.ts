/**
 * An app extends the Biome and TypeScript bases by package name.
 *
 * Both tools resolve `@axelekwall/app-kit/biome.json` and
 * `@axelekwall/app-kit/tsconfig.json` through the package's exports map from
 * `node_modules`, on the versions pinned here. Resolving is not enough: an
 * `extends` that silently resolves to nothing passes too. So the consumer is
 * written to the base's formatting, which Biome's defaults reject, and then
 * given a file that TypeScript accepts only without the base's strictness.
 *
 * The package is installed from a copy of the files git would ship, the way a
 * git dependency arrives, rather than from this working tree with its
 * `node_modules`.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { cp, mkdir, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

const ROOT = `${import.meta.dir}/..`
const PACKAGE = await Bun.file(`${ROOT}/package.json`).json()
const PINNED: Record<string, string> = PACKAGE.devDependencies

let directory: string
let app: string

async function run(command: string[], cwd: string) {
  const child = Bun.spawn(command, { cwd, stdout: "pipe", stderr: "pipe" })
  const [code, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  return { code, output: stdout + stderr }
}

/** The files a git dependency at this commit would contain, tracked or about to be. */
async function shippedFiles(): Promise<string[]> {
  const { code, output } = await run(
    ["git", "ls-files", "--cached", "--others", "--exclude-standard"],
    ROOT,
  )
  if (code !== 0) throw new Error(`git ls-files failed: ${output}`)
  return output.split("\n").filter((path) => path !== "")
}

async function write(path: string, content: string) {
  await Bun.write(join(app, path), content)
}

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "app-kit-consumer-"))
  const kit = join(directory, "kit")
  app = join(directory, "app")

  for (const path of await shippedFiles()) {
    if (!(await Bun.file(join(ROOT, path)).exists())) continue
    await mkdir(dirname(join(kit, path)), { recursive: true })
    await cp(join(ROOT, path), join(kit, path))
  }

  await mkdir(app)
  await cp(join(ROOT, "bunfig.toml"), join(app, "bunfig.toml"))
  // The Biome base reads the VCS ignore file, as every app has one.
  await write(".gitignore", "node_modules/\n")
  await write(
    "package.json",
    JSON.stringify({
      name: "consumer",
      private: true,
      type: "module",
      devDependencies: {
        "@axelekwall/app-kit": "file:../kit",
        "@biomejs/biome": PINNED["@biomejs/biome"],
        "@types/bun": PINNED["@types/bun"],
        typescript: PINNED.typescript,
      },
    }),
  )
  await write("biome.json", JSON.stringify({ extends: ["@axelekwall/app-kit/biome.json"] }))
  await write(
    "tsconfig.json",
    JSON.stringify({ extends: "@axelekwall/app-kit/tsconfig.json", include: ["src"] }),
  )
  // Formatted to the base, strict under it, and using the Bun types it names.
  // Biome's defaults (tabs, semicolons) would reject it, so passing shows the
  // base applied.
  await write(
    "src/ok.ts",
    [
      "const versions: string[] = [Bun.version]",
      "",
      "export function first(): string | undefined {",
      "  return versions[0]",
      "}",
      "",
    ].join("\n"),
  )

  const install = await run([process.execPath, "install"], app)
  if (install.code !== 0) throw new Error(`bun install failed: ${install.output}`)
}, 60_000)

afterAll(async () => {
  await rm(directory, { recursive: true, force: true })
})

describe("an app extending the bases by package name", () => {
  test("passes Biome and TypeScript when it follows them", async () => {
    // Only src is checked: JSON.stringify wrote the configuration files unformatted.
    const biome = await run([process.execPath, "x", "biome", "check", "src"], app)
    expect(biome.output).not.toContain("configuration")
    expect(biome.code).toBe(0)

    const tsc = await run([process.execPath, "x", "tsc", "--noEmit"], app)
    expect(tsc.output).toBe("")
    expect(tsc.code).toBe(0)
  })

  test("fails Biome and TypeScript on a file that breaks the bases", async () => {
    // The semicolon breaks the base's formatting; noUncheckedIndexedAccess
    // makes the element `number | undefined`.
    await write("src/bad.ts", "export const n: number = [1][0];\n")
    try {
      const biome = await run([process.execPath, "x", "biome", "check", "src"], app)
      expect(biome.code).not.toBe(0)
      expect(biome.output).toContain("bad.ts")

      const tsc = await run([process.execPath, "x", "tsc", "--noEmit"], app)
      expect(tsc.code).not.toBe(0)
      expect(tsc.output).toContain("src/bad.ts")
      expect(tsc.output).toContain("TS2322")
    } finally {
      await rm(join(app, "src/bad.ts"))
    }
  })
})
