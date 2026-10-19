---
type: llm
focus: last_message
---

PASS if the final reply does one of these:
- lists clarifying questions about the sharing feature (for example who can be shared with, permissions, revocation), each with options, and does not claim a finished spec; or
- reports a spec file under `specs/` with acceptance criteria: EARS sentences ("When …, the … shall …", "If …, then the … shall …"), IDs such as AC-1, AC-2, or a `Coverage: N/N` line for acceptance criteria.

FAIL if the reply contains an implementation plan, file or function names to create, database tables, library choices, or code; or if it writes a spec without acceptance criteria IDs.
