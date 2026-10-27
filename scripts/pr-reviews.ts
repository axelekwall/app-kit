/**
 * Review threads that still need an answer, for one pull request or every open
 * one.
 *
 *   bun scripts/pr-reviews.ts              every open pull request
 *   bun scripts/pr-reviews.ts 42 43        the named pull requests
 *   bun scripts/pr-reviews.ts --all        include resolved threads
 *   bun scripts/pr-reviews.ts --json       machine-readable output
 *   bun scripts/pr-reviews.ts reply <thread-id> <body>
 *                                          reply to a review thread
 *
 * A review thread is handled when it is fixed in the pull request it belongs
 * to or answered with a one-line reason. This lists what is left, with the
 * thread id a reply needs.
 *
 * Managed by app-kit: `app-kit sync` writes this file and a test fails when it
 * drifts. Change it in the app-kit repository.
 */

interface Comment {
  readonly author: { readonly login: string } | null
  readonly body: string
  readonly url: string
}

interface Thread {
  readonly id: string
  readonly isResolved: boolean
  readonly isOutdated: boolean
  readonly path: string
  readonly line: number | null
  readonly comments: { readonly nodes: readonly Comment[] }
}

interface PullRequest {
  readonly number: number
  readonly title: string
  readonly url: string
  readonly headRefName: string
  readonly baseRefName: string
  readonly reviewThreads: { readonly nodes: readonly Thread[] }
}

const QUERY = `
query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      number title url headRefName baseRefName
      reviewThreads(first: 100) {
        nodes {
          id isResolved isOutdated path line
          comments(first: 50) { nodes { author { login } body url } }
        }
      }
    }
  }
}`

const REPLY = `
mutation($thread: ID!, $body: String!) {
  addPullRequestReviewThreadReply(input: { pullRequestReviewThreadId: $thread, body: $body }) {
    comment { url }
  }
}`

async function gh(args: readonly string[]): Promise<string> {
  const child = Bun.spawn(["gh", ...args], { stdout: "pipe", stderr: "pipe" })
  const [code, out, err] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  if (code !== 0) throw new Error(`gh ${args.slice(0, 2).join(" ")} failed: ${err.trim()}`)
  return out
}

async function repository(): Promise<{ owner: string; name: string }> {
  const child = Bun.spawn(["git", "remote", "get-url", "origin"], { stdout: "pipe" })
  const url = (await new Response(child.stdout).text()).trim()
  const match = /github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/.exec(url)
  if (match?.[1] === undefined || match[2] === undefined) {
    throw new Error(`origin is not a GitHub repository: ${url}`)
  }
  return { owner: match[1], name: match[2] }
}

async function pullRequest(owner: string, name: string, number: number): Promise<PullRequest> {
  const out = await gh([
    "api",
    "graphql",
    "-f",
    `query=${QUERY}`,
    "-f",
    `owner=${owner}`,
    "-f",
    `name=${name}`,
    "-F",
    `number=${number}`,
  ])
  return (JSON.parse(out) as { data: { repository: { pullRequest: PullRequest } } }).data.repository
    .pullRequest
}

async function openNumbers(): Promise<number[]> {
  const out = await gh(["pr", "list", "--state", "open", "--json", "number", "--limit", "100"])
  return (JSON.parse(out) as { number: number }[]).map((pr) => pr.number).sort((a, b) => a - b)
}

function excerpt(body: string, length = 300): string {
  const flat = body
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
  return flat.length > length ? `${flat.slice(0, length)}…` : flat
}

async function reply(thread: string, body: string): Promise<void> {
  const out = await gh([
    "api",
    "graphql",
    "-f",
    `query=${REPLY}`,
    "-f",
    `thread=${thread}`,
    "-f",
    `body=${body}`,
  ])
  const url = (
    JSON.parse(out) as {
      data: { addPullRequestReviewThreadReply: { comment: { url: string } } }
    }
  ).data.addPullRequestReviewThreadReply.comment.url
  console.log(`Replied: ${url}`)
}

const argv = Bun.argv.slice(2)
if (argv[0] === "reply") {
  const [, thread, ...words] = argv
  if (thread === undefined || words.length === 0) {
    console.error("Usage: bun scripts/pr-reviews.ts reply <thread-id> <body>")
    process.exit(1)
  }
  await reply(thread, words.join(" "))
  process.exit(0)
}

const includeResolved = argv.includes("--all")
const asJson = argv.includes("--json")
const named = argv.filter((arg) => /^\d+$/.test(arg)).map(Number)
const { owner, name } = await repository()
const numbers = named.length > 0 ? named : await openNumbers()

const report = []
for (const number of numbers) {
  const pr = await pullRequest(owner, name, number)
  const threads = pr.reviewThreads.nodes.filter((thread) => includeResolved || !thread.isResolved)
  report.push({ pr, threads })
}

if (asJson) {
  console.log(
    JSON.stringify(
      report.map(({ pr, threads }) => ({
        number: pr.number,
        title: pr.title,
        url: pr.url,
        head: pr.headRefName,
        base: pr.baseRefName,
        threads: threads.map((thread) => ({
          id: thread.id,
          resolved: thread.isResolved,
          outdated: thread.isOutdated,
          path: thread.path,
          line: thread.line,
          comments: thread.comments.nodes.map((comment) => ({
            author: comment.author?.login ?? null,
            body: comment.body,
            url: comment.url,
          })),
        })),
      })),
      null,
      2,
    ),
  )
} else {
  if (report.length === 0) console.log("No open pull requests.")
  for (const { pr, threads } of report) {
    console.log(`\n#${pr.number} ${pr.title}  (${pr.headRefName} → ${pr.baseRefName})\n${pr.url}`)
    if (threads.length === 0) console.log("  No unresolved review threads.")
    for (const thread of threads) {
      const [first, ...replies] = thread.comments.nodes
      const flags = [
        thread.isResolved ? "resolved" : "unresolved",
        thread.isOutdated ? "outdated" : null,
      ].filter(Boolean)
      console.log(
        `\n  ${thread.path}:${thread.line ?? "?"}  [${flags.join(", ")}]  thread ${thread.id}`,
      )
      if (first !== undefined) {
        console.log(`    ${first.author?.login ?? "?"}: ${excerpt(first.body)}`)
        console.log(`    ${first.url}`)
      }
      for (const answer of replies) {
        console.log(`    ↳ ${answer.author?.login ?? "?"}: ${excerpt(answer.body, 160)}`)
      }
    }
  }
}
