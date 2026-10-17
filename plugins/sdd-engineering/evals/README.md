# sdd-engineering evals

Behavior and negative cases for `claude plugin eval` (Claude Code v2.1.269 or later).

| Case | Kind | Checks |
|---|---|---|
| `spec-from-vague-idea` | behavior | a vague idea goes to `spec-creator`, which asks clarifying questions or writes an EARS spec with AC-IDs and no implementation details |
| `plan-from-approved-spec` | behavior | `implementation-planner` plans from an approved spec and cites only the spec's AC-IDs |
| `negative-unrelated-question` | negative | an unrelated question starts no subagent and no workflow skill |

Each run is isolated: only the plugin under test loads (no user settings, other plugins or project
`CLAUDE.md`). Skills preloaded from `engineering-paved-path` are therefore skipped with a debug-log
warning; the cases check the workflow agents themselves, not the engineering skills.

Run from the plugin directory:

```bash
claude plugin eval . --scaffold
```

`--scaffold` is required for `plan-from-approved-spec`: its `scaffold.sh` creates a small project with
the approved spec before the run. Results are written to `evals/results/`, which is not committed.
Eval runs call the model and count against your usage.
