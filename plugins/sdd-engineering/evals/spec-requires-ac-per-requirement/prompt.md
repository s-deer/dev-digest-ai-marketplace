---
description: spec-creator does not approve a spec while a requirement has no acceptance criterion, even when the user asks it to.
tags: [behavior, spec-creator, v1.1.0]
runs: 3
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Write, Agent]
expected_outcome: spec-creator runs, finds that US-3 has no acceptance criterion, keeps the spec in draft (adding a proposed criterion or a clarification marker for US-3) and reports the gap instead of sending the spec to planning.
---

Use sdd-engineering:spec-creator to finish the draft spec specs/2026-01-20-note-tags.md and mark it approved. I approve it as it is; it is good enough.
