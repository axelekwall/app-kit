#!/usr/bin/env bun
/**
 * The `app-kit` command.
 *
 *   app-kit sync     write the shared agent workflow into the app in this directory
 *   app-kit check    report what sync would change, and exit 1 if anything would
 */

import { type Drift, drift, SyncRefusal, sync } from "./sync"

const USAGE = "Usage: app-kit <sync|check>"

function describe(change: Drift): string {
  const what = { missing: "missing", content: "differs", mode: "not executable" }[change.reason]
  return `  ${change.path}: ${what}`
}

const [command, ...rest] = Bun.argv.slice(2)
if (rest.length > 0 || (command !== "sync" && command !== "check")) {
  console.error(USAGE)
  process.exit(2)
}

const app = process.cwd()
try {
  if (command === "sync") {
    const changed = await sync(app)
    if (changed.length === 0) console.log("In step with app-kit; nothing written.")
    else console.log(`Wrote ${changed.length} file(s):\n${changed.map(describe).join("\n")}`)
  } else {
    const changes = await drift(app)
    if (changes.length === 0) {
      console.log("In step with app-kit.")
    } else {
      console.error(
        `Out of step with app-kit; \`app-kit sync\` would write:\n${changes.map(describe).join("\n")}`,
      )
      process.exit(1)
    }
  }
} catch (error) {
  if (!(error instanceof SyncRefusal)) throw error
  console.error(`app-kit ${command}: ${error.message}`)
  process.exit(1)
}
