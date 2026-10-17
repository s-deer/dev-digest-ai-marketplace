# Engineering insights — examples

> **Illustrative only.** The entries below show *shape and specificity*. They
> are not verified facts about any repo — never copy one into an INSIGHTS.md.

## Contents
- Entry format
- Vague vs useful, per section
- Not worth an entry
- Update and Superseded markers
- Routing

## Entry format

Every entry uses exactly this shape. It lives here — never copy it into an
INSIGHTS.md as documentation.

```markdown
## <Section heading — create it if missing>

### YYYY-MM-DD · <claim-style title: the lesson, not the topic>
- **Context:** where/when it bites — path, command, flow
- **Insight:** what is true and why. Dead end: what was tried and why it failed. Decision: the alternative rejected and why.
- **Do:** ALWAYS/NEVER … — the concrete behavior change
- **Evidence:** `path/to/file.ts:42`, test name, exact error text, or commit
```

- Add `- **Confidence:** low` only when the effect is reproduced but the cause
  is not proven. No confidence line means verified.
- Title is a claim ("`e2e:hermetic` leaves the API bound to :3101 after
  Ctrl+C"), not a topic ("e2e ports").
- At most ~8 lines. One insight per entry.

## Vague vs useful, per section

### What works

Vague: "Batch the embeddings calls."

Useful:
```markdown
### 2026-09-15 · Embedding repo chunks in batches of 64 keeps indexing under the provider rate limit
- **Context:** `api/src/modules/search-index/` indexing of repositories with >2k files
- **Insight:** One request per chunk hit HTTP 429 after ~300 calls; batches of 64 finished a 5k-file repo with no retries.
- **Do:** ALWAYS send embedding inputs in batches of ≤64 from the indexer.
- **Evidence:** `api/src/modules/search-index/embed.ts:88`, 429 body `rate_limit_exceeded`
```

### What doesn't work

Vague: "Mocking the DB in repo tests is tricky."

Useful:
```markdown
### 2026-09-15 · Mocking Drizzle in a hermetic test cannot catch pgvector query errors
- **Context:** `api/` tests for similarity search
- **Insight:** Tried a hand-rolled Drizzle mock in `search.test.ts`; it passed while the real query failed with `operator does not exist: vector <=> text` because the mock never builds SQL.
- **Do:** NEVER test vector queries hermetically — put them in a `*.it.test.ts` against testcontainers Postgres.
- **Evidence:** `api/src/modules/search/search.it.test.ts`, error text above
```

### Decisions

Vague: "We chose SSE."

Useful:
```markdown
### 2026-09-15 · Job progress streams over SSE, not WebSockets
- **Context:** live job status in `web/` ← `api/` job routes
- **Insight:** Traffic is server→client only, SSE rides the existing Fastify plugin chain (helmet, rate-limit) and reconnects for free. WebSockets were rejected: a second auth path, no gain for one-way data.
- **Do:** ALWAYS add new one-way live updates as SSE events on the existing stream; revisit only if the client must send mid-run.
- **Evidence:** `api/src/plugins/sse.ts`, PR discussion in commit `abc1234`
```

### Gotchas & recurring errors

Vague: "Be careful with ports in e2e."

Useful:
```markdown
### 2026-09-15 · `e2e:hermetic` fails with "address already in use :3101" when a previous run was killed
- **Context:** `npm run e2e:hermetic` after Ctrl+C mid-run
- **Insight:** The killed run leaves the hermetic API process alive; the next run cannot bind and the error names the port, not the orphan process.
- **Do:** ALWAYS `lsof -ti :3101 :3100 | xargs kill` before re-running after an interrupted hermetic run.
- **Evidence:** stderr `EADDRINUSE: address already in use :::3101`, `scripts/e2e.sh`
```

## Not worth an entry

| Candidate                                                    | Why it fails the gate                                   |
| ------------------------------------------------------------ | ------------------------------------------------------- |
| "Renamed `JobCard` to `JobSummaryCard`."                | Routine change, no lesson.                               |
| "`NEXT_PUBLIC_API_BASE` is read at build time."               | Already in `web/AGENTS.md` → not new.                    |
| "Use `pnpm` in api, `npm` in engine."                         | Already in root `AGENTS.md`.                             |
| "Async code can be tricky."                                   | Generic, not specific, not actionable.                   |
| "Flow 03 might be flaky because of timing?"                   | Unverified hypothesis.                                   |
| "The `foo` helper I added in this PR returns null on empty."  | Inferable from the code written in the same change.      |

## Update and Superseded markers

A second occurrence adds detail to an existing entry — no duplicate:
```markdown
### 2026-09-15 · `e2e:hermetic` fails with "address already in use :3101" when a previous run was killed
- ...
> **Update 2026-10-02:** Port `:5433` (hermetic Postgres container) can be orphaned the same way — `docker rm -f` it.
```

A later finding contradicts an older entry — mark the old one, add the new one:
```markdown
### 2026-09-15 · Embedding repo chunks in batches of 64 keeps indexing under the provider rate limit
- ...
> **Superseded 2026-11-20:** see "Embedding batches must be sized by tokens, not by chunk count"
```

## Routing

Example layout: a monorepo with `api/` (backend), `web/` (frontend), `engine/` (a pure library) and
`e2e/` (end-to-end flows), each with its own `INSIGHTS.md`, plus one at the root.

| Where the lesson surfaced                                                | Goes to                     | Why                                          |
| ------------------------------------------------------------------------ | --------------------------- | -------------------------------------------- |
| Drizzle migration generated an unexpected `DROP` for a renamed column     | `api/INSIGHTS.md`           | Next agent hits it editing the schema         |
| TanStack Query cache showed stale data after a mutation                   | `web/INSIGHTS.md`           | Fix lives in a frontend hook                 |
| The engine dropped valid results for renamed files                        | `engine/INSIGHTS.md`        | Engine logic, even if seen via an API route   |
| `wait --text` matched hidden text in a collapsed panel                     | `e2e/INSIGHTS.md`           | Flow authoring concern                        |
| A Zod contract default broke frontend form parsing                         | `api/INSIGHTS.md`           | Contracts change server-first in this layout  |
| The dev script seeds before migrations finish on a cold Docker start       | `INSIGHTS.md` (root)        | Repo tooling, no single package owns it       |
