/**
 * The Bun version is pinned in three places, and they name the same one.
 *
 * `.bun-version` is what CI installs, `packageManager` is what `package.json`
 * declares, and `mise.toml` is what a contributor's version manager selects for
 * this directory. Bumping one and forgetting another runs the suite locally on a
 * Bun that CI never sees.
 *
 * Managed by app-kit: `app-kit sync` writes this file and a test fails when it
 * drifts. Change it in the app-kit repository.
 */

import { describe, expect, test } from "bun:test"

const ROOT = `${import.meta.dir}/..`
const PINNED = (await Bun.file(`${ROOT}/.bun-version`).text()).trim()
const PACKAGE = await Bun.file(`${ROOT}/package.json`).json()
const MISE = Bun.TOML.parse(await Bun.file(`${ROOT}/mise.toml`).text()) as {
  tools?: { bun?: unknown }
}

describe("the pinned Bun version", () => {
  test("is an exact version", () => {
    expect(PINNED).toMatch(/^\d+\.\d+\.\d+$/)
  })

  test("is the one package.json declares as its package manager", () => {
    expect(PACKAGE.packageManager).toBe(`bun@${PINNED}`)
  })

  test("is the one mise.toml selects", () => {
    expect(MISE.tools?.bun).toBe(PINNED)
  })
})
