---
description: A vague feature idea is routed to spec-creator, which clarifies or writes a spec with EARS acceptance criteria and no implementation details.
tags: [behavior, spec-creator]
runs: 3
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Write, Agent]
expected_outcome: spec-creator runs; it either returns blocking clarification questions with options, or writes one spec under specs/ whose every requirement has an EARS acceptance criterion with an AC-ID.
---

I want users of our notes app to be able to share a note with someone else. There is no spec yet. Use sdd-engineering:spec-creator to write the spec for this feature before anyone plans or codes it. Reply with spec-creator's final message exactly as it returned it.
