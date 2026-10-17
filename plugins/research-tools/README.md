# research-tools

A read-only `researcher` agent. Give it one concrete question; it answers from the current
repository, from external sources, or both, backs every finding with evidence and lists what it
could not find.

## Install

```bash
claude plugin marketplace add s-deer/dev-digest-ai-marketplace
claude plugin install research-tools@dev-digest-ai-marketplace
```

`sdd-engineering` installs it automatically as a dependency.

## Use

Ask Claude to delegate, or call the agent directly:

```text
@agent-research-tools:researcher Where is the rate limit for the public API configured, and why was it set to 100 rps?
@agent-research-tools:researcher Does Fastify 5 still support the `reply.sent` property? Check the docs for our version.
```

What you get back:

- **Clarification needed** (at most 5 questions with options) when the question is vague, has
  several materially different readings, or misses scope such as the package or library version.
- **Repository report**: short answer, findings with confidence, evidence as `path:line` with short
  quotes, commits and docs consulted, and a "Not found" section.
- **External report**: the same, plus source type and date for each source, contradictions between
  sources, and a version check against the project's manifests.

Reports are written in the language of the request.

## How it reads a repository

It follows the reading order in the project's `CLAUDE.md` / `AGENTS.md`. Without one it reads specs,
then docs, then lessons files (`INSIGHTS.md`, ADRs), then code, and uses `git log -S` and
`git blame` for "why" questions. It skips dependency folders, build output and directories the
project marks as excluded.

## Permissions and side effects

| Tool | Why |
|---|---|
| Read, Grep, Glob | read the repository |
| Bash | read-only commands only: `git log/show/blame/diff`, `ls`, `wc`, `head` |
| WebSearch, WebFetch | external research; **network access** |

The agent never writes files, installs packages, starts servers or spawns other agents. It runs on
`sonnet`.

## In the spec-driven workflow

`sdd-engineering` agents do not call the researcher themselves. When a spec or plan depends on an
external fact, they list it under "Suggested research" or "Risks → researcher", and you run
`research-tools:researcher` from the main session.

## Owner

AI Engineering (`@s-deer`).
