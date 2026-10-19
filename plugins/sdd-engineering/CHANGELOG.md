# Changelog

All notable changes to this plugin are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow SemVer.

## [1.1.0] - 2026-10-19

### Added
- `spec-creator` requirement coverage gate: every user story and stated requirement must have at least
  one acceptance criterion. An uncovered requirement gets a `(proposed)` criterion or a
  `[NEEDS CLARIFICATION]` marker, and the spec stays `draft` even when the user asks to approve it.
  The final message reports `Coverage: N/N` and, when the gate fails, a `Spec incomplete` block instead
  of the next step to planning.
- Eval case `spec-requires-ac-per-requirement` for the coverage gate.

### Changed
- Eval prompts of `spec-from-vague-idea` and `plan-from-approved-spec` name the agent they test;
  both ask for the agent's output verbatim, because their graders read the final reply.
- `plan-traces-to-spec` grader: defaults the plan labels as assumptions (no AC-ID, listed as open
  questions) are not new requirements.
- `implementation-planner` no longer preloads the nine `engineering-paved-path` skills. It loads only
  the skills that `references/skill-routing.md` maps to the plan's files, with the Skill tool. In the
  cost baseline, this cut the planner's first-call context from about 49k to about 17k tokens and the
  cost per successful spec + plan workflow by 13% (see `docs/COST-BASELINE.md` in the repository).

### Fixed
- The eval suite could not pass in isolated runs (Claude Code 2.1.302): dependencies are not loaded,
  so the plugin failed with `dependency-unsatisfied`, and `Write` needs an operator grant. Run it with
  `scripts/eval-plugin.sh` from the repository; `evals/README.md` explains why.
- `plan-from-approved-spec` scaffold is a complete TypeScript project (dev dependencies, `tsconfig.json`,
  `CLAUDE.md`), so the planner no longer adds a tooling step that cites no acceptance criterion.

## [1.0.0] - 2026-10-17

### Added
- Agents: `spec-creator`, `implementation-planner`, `implementer`, `test-writer`, `plan-verifier`.
- Skills: `run-plan` (manual executor of an approved plan), `workflow-retro` (manual retrospective
  with a bundled ledger template), `engineering-insights` (lessons capture).
- Shared references: `references/project-conventions.md` and `references/skill-routing.md`.
- Dependencies: `engineering-paved-path@^1.0.0`, `research-tools@^1.0.0`,
  `architecture-review@^1.0.0`; cross-plugin references are namespaced.
- Evals: `spec-from-vague-idea`, `plan-from-approved-spec`, `negative-unrelated-question`.
