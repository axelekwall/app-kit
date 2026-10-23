/**
 * The version in package.json is releasable.
 *
 * `.github/workflows/release.yml` tags `v<version>` when a bump lands on main,
 * and refuses a version without its `## <version>` section in CHANGELOG.md. This
 * catches the missing section in the release pull request instead.
 */

import { describe, expect, test } from "bun:test"

const ROOT = `${import.meta.dir}/..`
const { version } = (await Bun.file(`${ROOT}/package.json`).json()) as { version: string }
const CHANGELOG = await Bun.file(`${ROOT}/CHANGELOG.md`).text()

describe("the package version", () => {
  test("is SemVer without a range", () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+$/)
  })

  test("has its section in CHANGELOG.md, unless it is the unreleased 0.0.0", () => {
    if (version === "0.0.0") return
    expect(CHANGELOG.split("\n")).toContain(`## ${version}`)
  })
})
