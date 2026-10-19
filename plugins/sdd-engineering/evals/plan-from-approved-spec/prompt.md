---
description: implementation-planner builds a plan from an approved spec and maps steps only to the spec's own AC-IDs.
tags: [behavior, implementation-planner]
runs: 3
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Bash, Agent]
expected_outcome: implementation-planner runs and returns a Development Plan whose steps cite only AC-1..AC-3, NFR-1 and EC-1, or a clarification block with planning questions; it invents no new requirement IDs.
---

The spec specs/2026-01-15-note-archive.md is approved. Use sdd-engineering:implementation-planner to plan its implementation, single-agent execution mode. Reply with the plan exactly as the planner returned it, without summarizing it.
