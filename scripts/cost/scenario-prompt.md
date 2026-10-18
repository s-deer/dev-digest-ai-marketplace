Use sdd-engineering:spec-creator to write a spec for this feature of the bookmark store: list the bookmarks created within a date range.

Decisions (treat them as final, do not ask questions): a new read-only operation takes optional `from` and `to` bounds (ISO-8601 strings or Date); both bounds are inclusive; a missing bound is open-ended; no bounds returns the same as list(); an invalid date or from > to raises ValidationError; results keep insertion order; no paging, no sorting options, no time zones beyond what ISO-8601 carries, no new dependencies.

Resolve any remaining minor point with the most conservative option and record it as a decision, not as [NEEDS CLARIFICATION].

I approve the spec as written for this experiment: set its status to approved.

Then use sdd-engineering:implementation-planner on the approved spec, execution mode single-agent, and save the plan under docs/plans/. Do not implement anything.
