---
type: llm
focus: last_message
---

PASS if the final reply does one of these:
- lists clarifying questions about the sharing feature (for example who can be shared with, permissions, revocation), each with options, and does not claim a finished spec; or
- reports a spec file under `specs/` whose acceptance criteria use EARS sentences ("When …, the … shall …", "If …, then the … shall …") with IDs such as AC-1, AC-2.

FAIL if the reply contains an implementation plan, file or function names to create, database tables, library choices, or code; or if it writes a spec without acceptance criteria IDs.
