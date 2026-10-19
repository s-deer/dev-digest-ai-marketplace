# sdd-engineering evals

Behavior and negative cases for `claude plugin eval`. Checked with Claude Code 2.1.302.

| Case | Kind | Checks |
|---|---|---|
| `spec-from-vague-idea` | behavior | `spec-creator`, asked for a spec of a vague idea, asks clarifying questions or writes an EARS spec with AC-IDs and no implementation details |
| `plan-from-approved-spec` | behavior | `implementation-planner` plans from an approved spec and cites only the spec's AC-IDs |
| `spec-requires-ac-per-requirement` | behavior (1.1.0) | `spec-creator` keeps a spec in draft and names the requirement with no acceptance criterion, even when the user asks to approve it |
| `negative-unrelated-question` | negative | an unrelated question starts no subagent and no workflow skill |

The behavior cases name the agent in the prompt ("Use sdd-engineering:spec-creator …"). They test what
the agent does, not whether the main session routes to it on its own.

## Running

From the repository root:

```bash
scripts/eval-plugin.sh plugins/sdd-engineering                 # whole suite
scripts/eval-plugin.sh plugins/sdd-engineering --case 'spec-*' # some cases
```

The script exists because of how isolated eval runs work in Claude Code 2.1.302:

- **Only the plugin under test loads.** Its `dependencies` are not loaded, so `sdd-engineering` fails
  with `dependency-unsatisfied` and none of its agents are available. The script evaluates a temporary
  copy with `dependencies` removed from `plugin.json`. The skills the agents preload from
  `engineering-paved-path` are then skipped with a debug-log warning; the cases check the workflow
  agents themselves, not the engineering skills.
- **Write is a gated tool.** A case's `allowed_tools` does not grant it; the operator does, with
  `--allow-tools Write`. Without it, spec-creator cannot write the spec.
- **`--scaffold`** is required for `plan-from-approved-spec` and `spec-requires-ac-per-requirement`:
  their `scaffold.sh` creates the starting project.

The script also runs with `--ablation none`, `--trust-plugin` and a sonnet judge for the `llm` graders
(`EVAL_JUDGE_MODEL` overrides it): the default haiku judge split its votes on equivalent plans in
`plan-from-approved-spec`. Results go to
`eval-results/<plugin>-<timestamp>/`, which is not committed (set `EVAL_OUT` to choose the folder).
To run this suite against another release of the plugin, for example as a smoke test after a
rollback, point the script at that release and set `EVAL_SUITE` to this folder:

```bash
EVAL_SUITE=plugins/sdd-engineering/evals scripts/eval-plugin.sh <path-to-installed-or-checked-out-plugin>
```

Eval runs call the model and count against your usage.
