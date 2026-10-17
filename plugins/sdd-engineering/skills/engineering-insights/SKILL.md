---
name: engineering-insights
description: Captures non-obvious engineering lessons into the matching INSIGHTS.md — the package or folder where the lesson matters, or the repository root for repo-wide findings. Use proactively the moment something non-obvious is verified during work — a root cause that differed from the first guess, an approach tried and abandoned, a library/tool/environment quirk, a misleading error message, a trade-off decision, or a user correction ("no, we don't do X here because…"). Also use as a wrap-up sweep when finishing a non-trivial task, and when the user asks to record, log, review, or prune insights, learnings, or lessons. Skips routine changes.
---

# Engineering insights

`INSIGHTS.md` is the memory the next agent reads before touching a package:
what works, what was tried and rejected, why decisions were made, and which
traps cost time. It is only useful while it stays short and sharp — **noise
costs more than silence.** Most tasks produce zero entries; a single task
should rarely produce more than three.

## When to capture

Capture **as you go**, the moment a finding is *verified* (test passes, error
reproduced and fixed, user confirmed) — not only at the end, because context
may be compacted before then. Trigger moments:

- The root cause turned out different from the first hypothesis.
- An approach was tried and abandoned (dead ends are the most valuable entries).
- A library, tool, or environment behaved contrary to its docs or expectations.
- An error message pointed at the wrong place.
- A decision was made between real alternatives, for a reason.
- The user corrected you with project knowledge you could not have inferred.
- A fix needed more than one failed attempt.

**Wrap-up sweep:** when finishing a non-trivial task, scan the session for the
moments above that were not yet recorded. Finding nothing is a valid outcome —
say so in one line and move on.

## When NOT to capture

- Routine edits, renames, one-off typos.
- Anything an agent could infer from the code or config in ~5 minutes.
- Anything already in a `AGENTS.md`, `README.md`, `docs/`, or `specs/`.
- Unverified hypotheses ("probably a race condition").
- Generic programming knowledge ("await inside loops is slow").
- Facts about code that the same change is rewriting.
- Secrets, tokens, customer data, or contents of directories the project marks as excluded
  (for example cloned third-party repositories).

## Workflow

Copy this checklist and tick it off:

```
Insight progress:
- [ ] 1. One-sentence insight passes the quality gate
- [ ] 2. Target INSIGHTS.md routed
- [ ] 3. Target read in full; duplicates/conflicts checked
- [ ] 4. Section picked
- [ ] 5. Entry appended from the template
- [ ] 6. Verified cold
- [ ] 7. Reported to the user
```

**1. Quality gate.** Write the insight as one sentence, then answer all five.
Any "no" → stop, do not write.

| Question    | Passes when                                                        |
| ----------- | ------------------------------------------------------------------ |
| Non-obvious | A competent agent reading the code and docs would not know it.     |
| Durable     | Still true next month; not tied to this one task.                  |
| Actionable  | Knowing it changes what the next agent does.                       |
| Verified    | Confirmed by a run, a reproduction, or the user — not a guess.     |
| Specific    | Names a path, command, error text, version, or config key.         |

**2. Route.** The home is the package where the next agent will be *working*
when this lesson matters — not where you happened to discover it.

- If the project instructions (`CLAUDE.md`, `AGENTS.md`) name the lessons files or use another
  name for them (for example `LESSONS.md`, `docs/decisions/`), follow them.
- Otherwise use the nearest `INSIGHTS.md`: the one in the package or top-level folder that owns the
  code the lesson is about (`<package>/INSIGHTS.md` in a monorepo). Create it with a one-line intro
  if the package has none.
- Repo tooling (`scripts/`, container files, CI, root configs) or a lesson that truly spans packages
  → `INSIGHTS.md` at the repository root.

Tie-breaks:
- Shared contract lessons → the side that changes the contract first.
- Library behavior observed through a consumer → the library's package.
- A frontend symptom caused by an API shape → the side where the fix belongs.
- Never write into excluded directories (cloned repositories, fixtures), even if they contain
  their own `INSIGHTS.md` files.

See [examples.md](examples.md#routing) for a routing table in a sample monorepo.

**3. Read the target in full, then check for duplicates and conflicts.** Grep
it for the key terms (tool name, error text, file name).
- A similar entry exists → do not add a new one. Append under it:
  `> **Update YYYY-MM-DD:** <what is new>`
- The new finding contradicts an entry → append under the old one:
  `> **Superseded YYYY-MM-DD:** see "<new entry title>"`, then add the new entry.

**4. Pick the section.** Entries are grouped under four fixed sections:

| Finding                                            | Section                        |
| -------------------------------------------------- | ------------------------------ |
| An approach confirmed to work well here             | `## What works`                |
| Tried and rejected, with the reason it failed       | `## What doesn't work`         |
| Chose X over Y, for a stated reason                 | `## Decisions`                 |
| Tool/library/env quirk, or a recurring error → fix  | `## Gotchas & recurring errors`|

**5. Append** the entry at the end of that section (newest last), using the
entry format in [examples.md](examples.md#entry-format) and today's date.
- The section heading does not exist yet → create it, keeping the order in the
  table above. Leave the file's intro paragraph untouched.
- The file still says `No entries yet.` → remove that line.
- Never add format docs, templates, or other boilerplate to INSIGHTS.md —
  only entries and section headings.

**6. Verify cold.** Re-read the entry as an agent with none of this session's
context:
- Can it act on the entry without asking anything?
- Do the cited paths and line numbers exist? Open them to check.
- Does it match the entry format, and is it at most ~8 lines?
- Is the title a claim ("`pnpm db:generate` ignores X") rather than a topic ("Drizzle")?

If any check fails, fix the entry before moving on.

**7. Report** in one line: `Recorded insight → api/INSIGHTS.md · Gotchas: "<title>"`.
Entries are drafts for a human to spot-check, so always surface them.
If the file now holds more than ~40 entries, add: "consolidation is due".
Do not prune unless asked.

## Rules

- **Append-only.** Never rewrite or delete an existing entry. Corrections are
  dated `Update` / `Superseded` lines. The only exception is a prune the user
  asked for.
- **Record the lesson, not the story.** No session narrative, no "we then tried…".
- **One insight per entry.** Split compound findings.
- **English**, terse, declarative.
- Spell the four section headings exactly as in step 4 — agents grep for them.

## Promotion to AGENTS.md

When an insight has hardened into a rule every change must follow (it keeps
getting applied, and ignoring it breaks things), propose moving it into that
package's `AGENTS.md`. Ask before editing AGENTS.md. Once moved, append
`> **Promoted YYYY-MM-DD** to AGENTS.md` under the entry.

## Prune and consolidate (only on request)

1. Read the whole file.
2. Delete entries about bugs since fixed, code since deleted, or workarounds no longer needed.
3. Merge duplicates into one entry, keeping the earliest date.
4. Resolve `Superseded` pairs: keep the newer entry, drop the old one.
5. Open every `Evidence` path; update line numbers or remove dead references.
6. Show the user the diff before finishing.

## More

- Entry format, vague vs useful entries, routing and marker examples:
  [examples.md](examples.md)
