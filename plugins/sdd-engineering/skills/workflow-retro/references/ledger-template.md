# Workflow retro ledger

One row per run, appended by the manual `/sdd-engineering:workflow-retro` skill. Append-only: never rewrite earlier rows. Use `n/a` for anything not measured; do not estimate.

## Columns

| Column | Meaning |
|---|---|
| Date | Run date, `YYYY-MM-DD` |
| Workflow | What ran, e.g. `run-plan docs/plans/search-filters-plan.md` |
| Mode | `context` or `deep` |
| Agents | Number of agents launched, in launch order (e.g. `6: implementer>architecture-reviewer>...`) |
| Max concurrency | Peak simultaneous agents, including nested subagents |
| Tokens in / out / cache read | Totals across parent and children, `in / out / cache` |
| Tool calls | Total count |
| Duration | Wall clock, e.g. `42m` |
| Cost per AC | Total tokens / ACs closed |
| Rework loops | Extra fix iterations and BLOCKED steps |
| First-pass findings | Reviewer findings before the fix loop |
| Verifier unclosed | `plan-verifier` rows not MET |
| Top actions | 1-3 proposed improvements, short |

## Ledger

| Date | Workflow | Mode | Agents | Max concurrency | Tokens in / out / cache read | Tool calls | Duration | Cost per AC | Rework loops | First-pass findings | Verifier unclosed | Top actions |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
