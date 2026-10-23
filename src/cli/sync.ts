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

const BEGIN = /<!--\s*template:agent-workflow begin[\s\S]*?-->/g
const END = /<!--\s*template:agent-workflow end\s*-->/g

/** A reason not to sync, naming the file at fault. Not a crash. */
export class SyncRefusal extends Error {
  override readonly name = "SyncRefusal"
}

export interface Config {
  readonly permissions: { readonly allow: readonly string[] }
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

export function parseConfig(text: string): Config {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (error) {
    throw new SyncRefusal(`${CONFIG_FILE} is not valid JSON: ${(error as Error).message}`)
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new SyncRefusal(`${CONFIG_FILE} must hold a JSON object.`)
  }
  const known = new Set(["permissions"])
  for (const key of Object.keys(raw)) {
    if (!known.has(key)) {
      throw new SyncRefusal(`${CONFIG_FILE} has an unknown key "${key}". Known keys: permissions.`)
    }
  }

  // An absent key takes its default; an explicit null is refused below like any other wrong type.
  const given = (raw as { permissions?: unknown }).permissions
  const permissions = given === undefined ? {} : given
  if (typeof permissions !== "object" || permissions === null || Array.isArray(permissions)) {
    throw new SyncRefusal(`${CONFIG_FILE}: "permissions" must be an object with an "allow" list.`)
  }
  for (const key of Object.keys(permissions)) {
    if (key !== "allow") {
      throw new SyncRefusal(`${CONFIG_FILE}: "permissions" has an unknown key "${key}".`)
    }
  }
  const listed = (permissions as { allow?: unknown }).allow
  const allow = listed === undefined ? [] : listed
  if (!Array.isArray(allow) || !allow.every((entry) => typeof entry === "string")) {
    throw new SyncRefusal(`${CONFIG_FILE}: "permissions.allow" must be a list of strings.`)
  }
  return { permissions: { allow } }
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

/** The package's settings with the app's extra entries appended, each once. */
export function settings(kitText: string, config: Config): string {
  const base = JSON.parse(kitText) as { permissions: { allow: string[] } }
  const allow = [...new Set([...base.permissions.allow, ...config.permissions.allow])]
  return `${JSON.stringify({ ...base, permissions: { ...base.permissions, allow } }, null, 2)}\n`
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
