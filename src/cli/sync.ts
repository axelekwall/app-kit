/**
 * `app-kit sync` and `app-kit check`: the shared agent workflow, written into an
 * app from the installed package.
 *
 * The package's own files are the source (D3). Between the
 * `template:agent-workflow` markers in `AGENTS.md` and `CLAUDE.md` the app holds
 * the package's block; outside them, its own text. Each managed file is the
 * package's file at the same path, except `.claude/settings.json`, which also
 * takes the app's extra permission entries from `app-kit.json`.
 *
 * Anything that cannot be synced safely is refused before a file is written,
 * with the file named.
 */

import { chmod, mkdir, stat } from "node:fs/promises"
import { dirname, join } from "node:path"

/** The package root: this file is `src/cli/sync.ts` inside it. */
export const KIT_ROOT = join(import.meta.dir, "..", "..")

export const CONFIG_FILE = "app-kit.json"

const BLOCK_FILES = ["AGENTS.md", "CLAUDE.md"] as const

/** Copied byte for byte from the package. */
const COPIED_FILES = [
  ".githooks/pre-push",
  "scripts/pr-reviews.ts",
  "tests/agents-commands.test.ts",
  "tests/app-kit.test.ts",
  "tests/bun-version.test.ts",
] as const

const EXECUTABLE_FILES: ReadonlySet<string> = new Set([".githooks/pre-push"])

const SETTINGS_FILE = ".claude/settings.json"

const CI_FILE = ".github/workflows/ci.yml"

const KIT_REPOSITORY = "axelekwall/app-kit"

const CI_REUSABLE = ".github/workflows/image.yml"

const BEGIN = /<!--\s*template:agent-workflow begin[\s\S]*?-->/g
const END = /<!--\s*template:agent-workflow end\s*-->/g

/** A reason not to sync, naming the file at fault. Not a crash. */
export class SyncRefusal extends Error {
  override readonly name = "SyncRefusal"
}

export interface Config {
  readonly permissions: { readonly allow: readonly string[] }
  /** The inputs of the reusable workflow. Without them, `ci.yml` is not managed. */
  readonly ci?: CiConfig
}

export interface CiConfig {
  readonly app: string
  readonly image?: boolean
  readonly timeZone?: string
  readonly smokeApiPath?: string
  readonly smokeStopLog?: string
}

/** One file as the sync would write it. */
export interface Planned {
  readonly path: string
  readonly content: string
  readonly executable: boolean
}

/** A file whose content or mode differs from what the sync would write. */
export interface Drift {
  readonly path: string
  readonly reason: "missing" | "content" | "mode"
}

/** `value` as an object holding only `known` keys, or a refusal naming `where`. */
function object(value: unknown, where: string, known: readonly string[]): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new SyncRefusal(`${where} must be a JSON object.`)
  }
  for (const key of Object.keys(value)) {
    if (!known.includes(key)) {
      throw new SyncRefusal(
        `${where} has an unknown key "${key}". Known keys: ${known.join(", ")}.`,
      )
    }
  }
  return value as Record<string, unknown>
}

function optional<T>(value: unknown, type: "string" | "boolean", where: string): T | undefined {
  if (value === undefined) return undefined
  if (typeof value !== type) throw new SyncRefusal(`${where} must be a ${type}.`)
  return value as T
}

export function parseConfig(text: string): Config {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (error) {
    throw new SyncRefusal(`${CONFIG_FILE} is not valid JSON: ${(error as Error).message}`)
  }
  const root = object(raw, CONFIG_FILE, ["permissions", "ci"])

  // An absent key takes its default; an explicit null is refused like any other wrong type.
  const given = root.permissions === undefined ? {} : root.permissions
  const permissions = object(given, `${CONFIG_FILE}: "permissions"`, ["allow"])
  const allow = permissions.allow === undefined ? [] : permissions.allow
  if (!Array.isArray(allow) || !allow.every((entry) => typeof entry === "string")) {
    throw new SyncRefusal(`${CONFIG_FILE}: "permissions.allow" must be a list of strings.`)
  }
  if (root.ci === undefined) return { permissions: { allow } }

  const where = `${CONFIG_FILE}: "ci"`
  const ci = object(root.ci, where, ["app", "image", "timeZone", "smokeApiPath", "smokeStopLog"])
  const app = optional<string>(ci.app, "string", `${where}.app`)
  if (app === undefined || !/^[a-z0-9]+(?:-+[a-z0-9]+)*$/.test(app)) {
    throw new SyncRefusal(
      `${where}.app must name the app in lower case (letters and digits, with hyphens between them): it names the binary, the image and the container.`,
    )
  }
  const values: Record<string, unknown> = { app }
  for (const [key, type] of [
    ["image", "boolean"],
    ["timeZone", "string"],
    ["smokeApiPath", "string"],
    ["smokeStopLog", "string"],
  ] as const) {
    const value = optional(ci[key], type, `${where}.${key}`)
    if (value !== undefined) values[key] = value
  }
  return { permissions: { allow }, ci: values as unknown as CiConfig }
}

/** The span of the one marked block in `text`, or a refusal naming `path`. */
function blockSpan(text: string, path: string): { start: number; end: number } {
  const begins = [...text.matchAll(BEGIN)]
  const ends = [...text.matchAll(END)]
  if (begins.length === 0 || ends.length === 0) {
    throw new SyncRefusal(
      `${path} has no template:agent-workflow block. Add the begin and end markers around the shared section, as app-kit's own ${path} has them.`,
    )
  }
  if (begins.length > 1 || ends.length > 1) {
    throw new SyncRefusal(`${path} has more than one template:agent-workflow begin or end marker.`)
  }
  const [begin] = begins
  const [end] = ends
  if (begin === undefined || end === undefined || end.index < begin.index) {
    throw new SyncRefusal(`${path}'s template:agent-workflow end marker comes before its begin.`)
  }
  return { start: begin.index, end: end.index + end[0].length }
}

/** `appText` with its marked block replaced by the one in `kitText`. */
export function replaceBlock(appText: string, kitText: string, path: string): string {
  const kit = blockSpan(kitText, `app-kit's ${path}`)
  const app = blockSpan(appText, path)
  return appText.slice(0, app.start) + kitText.slice(kit.start, kit.end) + appText.slice(app.end)
}

/** The Biome base's `formatter.lineWidth`. */
const LINE_WIDTH = 100

/**
 * `value` as JSON laid out the way Biome formats it, so a synced file passes the
 * app's own check: two-space indents, and a list of strings on one line when it
 * fits, since Biome collapses those. Lists of anything else stay expanded, which
 * matches Biome only because the settings hold none.
 */
export function biomeJson(value: unknown): string {
  const text = JSON.stringify(value, null, 2)
  const list = /^( *)("(?:[^"\\]|\\.)*": )?\[\n((?: *"(?:[^"\\]|\\.)*",?\n)+) *\](,?)$/gm
  return `${text.replace(list, (whole, indent: string, key = "", items: string, comma: string) => {
    const joined = items
      .split("\n")
      .filter((item) => item !== "")
      .map((item) => item.trim())
      .join(" ")
    const line = `${indent}${key}[${joined}]${comma}`
    return line.length <= LINE_WIDTH ? line : whole
  })}\n`
}

/**
 * The package's settings with the app's extra allow entries appended, each once.
 * The package's ask and deny rules are kept as they are: Claude Code evaluates
 * deny, then ask, then allow, so an app entry cannot reopen what they close.
 */
export function settings(kitText: string, config: Config): string {
  const base = JSON.parse(kitText) as { permissions: { allow: string[] } }
  const allow = [...new Set([...base.permissions.allow, ...config.permissions.allow])]
  return biomeJson({ ...base, permissions: { ...base.permissions, allow } })
}

/**
 * The app's `ci.yml`: app-kit's reusable workflow at the package's own tag, with
 * the inputs `app-kit.json` sets. Inputs it leaves out take the workflow's
 * defaults.
 */
export function ciWorkflow(ci: CiConfig, version: string): string {
  const inputs: [string, string | boolean | undefined][] = [
    ["app", ci.app],
    ["image", ci.image],
    ["time-zone", ci.timeZone],
    ["smoke-api-path", ci.smokeApiPath],
    ["smoke-stop-log", ci.smokeStopLog],
  ]
  return [
    "# Managed by app-kit: `app-kit sync` writes this file from app-kit.json, and a",
    "# test fails when it drifts. The jobs are app-kit's reusable workflow, at the",
    "# same tag as the package; change them in the app-kit repository.",
    "name: ci",
    "",
    "on:",
    "  push:",
    "    branches: [main]",
    "  pull_request:",
    "",
    "# A newer push to a pull request supersedes its in-flight run. Runs on main are",
    "# never cancelled, so every merge gets its image.",
    "concurrency:",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: a GitHub Actions expression
    "  group: ${{ github.workflow }}-${{ github.ref }}",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: a GitHub Actions expression
    "  cancel-in-progress: ${{ github.event_name == 'pull_request' }}",
    "",
    "permissions:",
    "  contents: read",
    "",
    "jobs:",
    "  ci:",
    `    uses: ${KIT_REPOSITORY}/${CI_REUSABLE}@v${version}`,
    "    # GitHub refuses to start a caller that grants less than a called job asks",
    "    # for, on pull requests too and even when the job is skipped, so this grant",
    "    # covers publish's packages: write whether or not the image jobs run.",
    "    permissions:",
    "      contents: read",
    "      packages: write",
    "    with:",
    ...inputs
      .filter(([, value]) => value !== undefined)
      .map(([name, value]) => `      ${name}: ${JSON.stringify(value)}`),
    "",
  ].join("\n")
}

async function readText(path: string): Promise<string | null> {
  const file = Bun.file(path)
  return (await file.exists()) ? await file.text() : null
}

async function isExecutable(path: string): Promise<boolean> {
  return ((await stat(path)).mode & 0o111) !== 0
}

/** Every managed file as the sync would write it into `app`. */
export async function plan(app: string, kit: string = KIT_ROOT): Promise<Planned[]> {
  const configText = await readText(join(app, CONFIG_FILE))
  if (configText === null) {
    throw new SyncRefusal(
      `${CONFIG_FILE} is missing. Create it with {} to take the defaults; it holds the values that differ per app.`,
    )
  }
  const config = parseConfig(configText)

  const planned: Planned[] = []
  for (const path of BLOCK_FILES) {
    const appText = await readText(join(app, path))
    if (appText === null) throw new SyncRefusal(`${path} is missing.`)
    const kitText = await Bun.file(join(kit, path)).text()
    planned.push({ path, content: replaceBlock(appText, kitText, path), executable: false })
  }
  for (const path of COPIED_FILES) {
    const content = await Bun.file(join(kit, path)).text()
    planned.push({ path, content, executable: EXECUTABLE_FILES.has(path) })
  }
  const kitSettings = await Bun.file(join(kit, SETTINGS_FILE)).text()
  planned.push({ path: SETTINGS_FILE, content: settings(kitSettings, config), executable: false })
  if (config.ci !== undefined) {
    const { version } = (await Bun.file(join(kit, "package.json")).json()) as { version: string }
    planned.push({ path: CI_FILE, content: ciWorkflow(config.ci, version), executable: false })
  }
  return planned
}

async function compare(app: string, planned: readonly Planned[]): Promise<Drift[]> {
  const found: Drift[] = []
  for (const file of planned) {
    const target = join(app, file.path)
    const current = await readText(target)
    if (current === null) found.push({ path: file.path, reason: "missing" })
    else if (current !== file.content) found.push({ path: file.path, reason: "content" })
    else if (file.executable && !(await isExecutable(target))) {
      found.push({ path: file.path, reason: "mode" })
    }
  }
  return found
}

/** What `sync` would change in `app`. Empty when the app is in step. */
export async function drift(app: string, kit: string = KIT_ROOT): Promise<Drift[]> {
  return compare(app, await plan(app, kit))
}

/** Writes what drifted. Returns what it changed. */
export async function sync(app: string, kit: string = KIT_ROOT): Promise<Drift[]> {
  const planned = await plan(app, kit)
  const changed = await compare(app, planned)
  for (const { path } of changed) {
    const file = planned.find((candidate) => candidate.path === path)
    if (file === undefined) continue
    const target = join(app, path)
    await mkdir(dirname(target), { recursive: true })
    await Bun.write(target, file.content)
    if (file.executable) await chmod(target, 0o755)
  }
  return changed
}
