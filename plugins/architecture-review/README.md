# architecture-review

A read-only `architecture-reviewer` agent. It checks whether a diff respects architectural
boundaries and returns findings that each rest on a named rule and quoted code, plus a derived
verdict. It does not review security, style, performance or test quality.

## Install

```bash
claude plugin marketplace add s-deer/dev-digest-ai-marketplace
claude plugin install architecture-review@dev-digest-ai-marketplace
```

The installer also installs `engineering-paved-path` (dependency `^1.0.0`).
`sdd-engineering` installs this plugin automatically.

## Use

```text
@agent-architecture-review:architecture-reviewer Review my branch against main.
@agent-architecture-review:architecture-reviewer Review src/modules/billing/** using docs/plans/billing-plan.md.
```

Input: a base ref (default: merge-base with `origin/main` plus staged, unstaged and untracked
changes) or a file list, and optionally a plan path whose "Notes for reviewers → Architecture"
items become mandatory checks.

## What it checks

| Area | Rule source |
|---|---|
| Backend modules: dependency rule, ports and adapters, composition root, thin routes, tenant scoping in repositories | `engineering-paved-path:onion-architecture`, `fastify-best-practices`, `drizzle-orm-patterns` |
| React / Next.js: placement, dependency direction, data layer, RSC boundaries | `engineering-paved-path:react-architecture` |
| Contracts: shared schemas change first, no ORM rows on the wire | `engineering-paved-path:zod`, onion `references/zod-contracts.md` |
| Package boundaries and pure engine packages | the repository's own docs |

**The repository's own rules come first.** The reviewer reads `CLAUDE.md`, `AGENTS.md`,
`ARCHITECTURE.md`, `docs/architecture*`, ADRs and lint boundary configs. They override the generic
skills. Stacks the project does not use are skipped and listed under "Not reviewed".

## Output

A report with a verdict (`PASS`, `PASS WITH NOTES`, `CHANGES REQUESTED`, `BLOCK`) derived from
the findings' severity, findings with rule, `path:line` evidence, mechanism and fix, the
boundaries checked and found clean, known deviations touched, out-of-scope notes and what was not
reviewed. If in doubt, severity goes one level lower; only an added or changed line can be critical.

## Permissions and side effects

Read, Grep, Glob and read-only Bash (`git diff/log/show/blame/status/merge-base`, `ls`, `wc`,
`head`, `grep`). No file writes, no tests or typecheck, no network, no subagents. Runs on `sonnet`.

## Owner

AI Engineering (`@s-deer`).
