# sdd-engineering

A Spec-Driven Development workflow for Claude Code: write a spec, plan it, implement it in
reviewed and tested steps, and verify the result against every acceptance criterion.

```text
idea ──► spec-creator ──► spec ──► [you approve]
                                       ▼
          implementation-planner ──► plan ──► [you approve]
                                       ▼
   /sdd-engineering:run-plan <plan>
     implementer (one run per phase)
       ▼
     architecture-review:architecture-reviewer
       CHANGES REQUESTED / BLOCK ──► implementer (fixes, max 2 loops) ──► re-review
       ▼
     test-writer (limited)
       ▼
     plan-verifier (final, read-only: AC → step → test → commit)
       NOT VERIFIED ──► one implementer fix pass ──► re-verify
                                       ▼
   /sdd-engineering:workflow-retro (manual, optional)

research-tools:researcher answers questions at any point, on request.
```

## Install

```bash
claude plugin marketplace add s-deer/dev-digest-ai-marketplace --scope project
claude plugin install sdd-engineering@dev-digest-ai-marketplace --scope project
```

The installer also installs the dependencies:

| Plugin | Range | Provides |
|---|---|---|
| `engineering-paved-path` | ^1.0.0 | the engineering skills the agents preload (the planner loads them on demand) |
| `research-tools` | ^1.0.0 | `researcher` for delegated discovery |
| `architecture-review` | ^1.0.0 | `architecture-reviewer`, the review gate in `run-plan` |

Then run `/reload-plugins` or start a new session, and check with `claude plugin list --json`.

## Components

### Agents

| Agent | Model | Tools | Input → output |
|---|---|---|---|
| `sdd-engineering:spec-creator` | opus | Read, Grep, Glob, Write (one spec file) | idea and design → one spec with EARS acceptance criteria and stable AC-IDs, status `draft` (or blocking questions) |
| `sdd-engineering:implementation-planner` | sonnet | Read, Grep, Glob, read-only Bash | approved spec → Development Plan S1..Sn with AC coverage, file inventory, skills and verify commands (or "Clarification needed") |
| `sdd-engineering:implementer` | sonnet | Read, Grep, Glob, Edit, Write, Bash, Skill | approved plan (+ step ids) → code, tests, implementation report |
| `sdd-engineering:test-writer` | sonnet | Read, Grep, Glob, Edit, Write, Bash (test files only) | plan steps, a file or the diff → tests at the seams, test report |
| `sdd-engineering:plan-verifier` | sonnet | Read, Grep, Glob, Bash (verification commands only) | plan (+ spec, reports) → traceability matrix and verdict |

From the dependencies: `research-tools:researcher` (sonnet, read-only, network) and
`architecture-review:architecture-reviewer` (sonnet, read-only).

### Skills

| Skill | How it runs | What it does |
|---|---|---|
| `/sdd-engineering:run-plan <plan> [extra prompt] [design refs]` | manual only | runs an approved plan end to end with the subagents above, strictly sequentially |
| `/sdd-engineering:workflow-retro [deep]` | manual only | retrospective of a run: tokens, tool calls, agents, duplicated context, rubric scores, 3–7 proposals, one ledger row |
| `sdd-engineering:engineering-insights` | automatic, preloaded into implementer, planner and test-writer | records verified, non-obvious lessons in the right `INSIGHTS.md` |

## Walkthrough

1. **Spec.** Describe the feature and ask for a spec, or call `@agent-sdd-engineering:spec-creator`.
   It asks blocking questions first (at most 5, with options), then writes one file. Answer the
   open questions and approve the spec: tell Claude to set `Status: approved`.
2. **Plan.** `@agent-sdd-engineering:implementation-planner plan specs/<file>.md`. The first pass
   validates the spec and asks the execution mode (single-agent or phased multi-agent). The plan
   comes back as a message; ask the main session to save it to the plan location and approve it.
3. **Run.** `/sdd-engineering:run-plan docs/plans/<feature>-plan.md`. The main session only
   orchestrates; each stage is a subagent with a narrow brief. It stops and asks you on BLOCKED
   steps, unresolved review findings after two loops, or a plan that is not approved.
4. **Retro (optional).** `/sdd-engineering:workflow-retro deep` reads the session transcripts on
   disk (counters only, never full transcripts) and appends a row to the retro ledger.

`run-plan` and `workflow-retro` never start on their own (`disable-model-invocation: true`), and
nothing in this plugin commits, pushes or opens pull requests.

## Where artifacts go

| Artifact | Default location | Written by |
|---|---|---|
| Spec | `specs/<YYYY-MM-DD>-<slug>.md`, or `<package>/specs/…` for a single-package feature in a monorepo | `spec-creator` |
| Development Plan | `docs/plans/<feature>-plan.md` | the main session (the planner only returns the plan) |
| Retro ledger | `docs/retros/ledger.md`, created from the bundled template if missing | `workflow-retro` |
| Lessons | the nearest `INSIGHTS.md` (package or root) | `engineering-insights` via implementer / test-writer |

If your `CLAUDE.md` or `AGENTS.md` defines other locations or names, the agents follow your
conventions instead. See `references/project-conventions.md`.

## How it adapts to your repository

- **Project instructions first.** Every agent reads `CLAUDE.md` / `AGENTS.md` and follows the reading
  order, exclusions and conventions defined there.
- **Verification commands** come from your instructions, package scripts and CI. If none is found,
  the check is reported as `SKIPPED (no command found)` or `UNVERIFIABLE`, never as PASS.
- **Skill routing.** `references/skill-routing.md` maps file types to `engineering-paved-path`
  skills. A routing document in your repository takes precedence.
- **Stacks you don't use** (for example no Fastify or no React) are skipped; the skills are
  guidance, not a required stack.

## Permissions and safety

- `spec-creator` writes one spec file; `implementation-planner`, `plan-verifier` and the
  dependency agents never write files.
- `implementer` edits only files in the plan's File inventory (plus listed minimal deviations);
  `test-writer` edits only test files.
- No agent commits, pushes, merges, runs migrations against real data, or spawns subagents. Only
  the main session (through `run-plan`) launches agents.
- No hooks, no MCP servers, no credentials. Network access exists only through
  `research-tools:researcher`.

## Evals

`evals/` holds behavior and negative cases for `claude plugin eval`; see `evals/README.md`.

## Owner

AI Engineering (`@s-deer`). Release notes in `CHANGELOG.md`, requirements in `COMPATIBILITY.md`.
