/**
 * The shared agent workflow is as the installed app-kit writes it.
 *
 * The blocks between the `template:agent-workflow` markers in `AGENTS.md` and
 * `CLAUDE.md`, and the managed files, belong to app-kit. An edit made here
 * would be lost at the next sync, so it fails here instead. Change the shared
 * content in the app-kit repository; `bun run kit:sync` restores this copy.
 *
 * Managed by app-kit: `app-kit sync` writes this file and a test fails when it
 * drifts. Change it in the app-kit repository.
 */

import { describe, expect, test } from "bun:test"
import { drift } from "@axelekwall/app-kit/sync"

describe("the shared agent workflow", () => {
  test("is in step with the installed app-kit (`bun run kit:sync` restores it)", async () => {
    expect(await drift(`${import.meta.dir}/..`)).toEqual([])
  })
})
