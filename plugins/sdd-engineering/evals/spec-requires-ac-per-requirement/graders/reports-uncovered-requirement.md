---
type: llm
focus: last_message
---

PASS if the final reply says the spec is not approved (it stays draft or is not ready for planning) and names US-3, the story about seeing all notes with a given tag, as having no acceptance criterion, or as having only a proposed criterion that the user still has to confirm.

FAIL if the reply says the spec is approved or ready for implementation-planner, or if it does not mention that US-3 lacked an acceptance criterion.
