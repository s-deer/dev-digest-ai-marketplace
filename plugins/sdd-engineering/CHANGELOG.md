# Changelog

All notable changes to this plugin are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow SemVer.

## [1.0.0] - 2026-10-17

### Added
- Agents: `spec-creator`, `implementation-planner`, `implementer`, `test-writer`, `plan-verifier`.
- Skills: `run-plan` (manual executor of an approved plan), `workflow-retro` (manual retrospective
  with a bundled ledger template), `engineering-insights` (lessons capture).
- Shared references: `references/project-conventions.md` and `references/skill-routing.md`.
- Dependencies: `engineering-paved-path@^1.0.0`, `research-tools@^1.0.0`,
  `architecture-review@^1.0.0`; cross-plugin references are namespaced.
- Evals: `spec-from-vague-idea`, `plan-from-approved-spec`, `negative-unrelated-question`.
