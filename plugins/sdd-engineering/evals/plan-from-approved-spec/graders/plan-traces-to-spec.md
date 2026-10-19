---
type: llm
focus: last_message
---

PASS if the final reply presents a development plan with numbered steps (S1, S2, …) where every step cites at least one of AC-1, AC-2, AC-3, NFR-1 or EC-1, and every one of AC-1, AC-2 and AC-3 is covered by some step; or if it returns a clarification block with planning questions instead of a plan.

Defaults for behaviour the spec leaves undefined (for example an unknown note id) are fine when the plan labels them as assumptions, cites no AC-ID for them and lists them as open questions for the spec author. They are not new requirements.

FAIL if the plan adds features that are not in the spec (for example deleting notes, sharing, search), invents or rewrites acceptance criteria, or has steps without any AC reference.
