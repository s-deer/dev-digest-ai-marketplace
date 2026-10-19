# Cost baseline: sdd-engineering spec + plan workflow

This document records the cost of one fixed workflow on `sdd-engineering@1.0.0`, one optimization,
and the same measurement after it. The optimization ships in `sdd-engineering@1.1.0`.

**Result:** cost per successful workflow went from **$0.841 to $0.730 (−13%)**. The quality gate
passed 3/3 runs before and 3/3 after. Latency did not change beyond noise.

## Scenario

A user asks for a spec and a plan for one small feature. The workflow is:

1. `sdd-engineering:spec-creator` writes the spec.
2. The main session marks the spec approved.
3. `sdd-engineering:implementation-planner` writes the plan.
4. The main session saves the plan under `docs/plans/`.

Nothing is implemented.

- **Feature:** list the bookmarks created within a date range.
- **Prompt:** [`scripts/cost/scenario-prompt.md`](../scripts/cost/scenario-prompt.md). It is the same
  for every run. It answers the product questions up front, so the run never stops on blocking
  questions in headless mode.
- **Project:** a private sandbox repository, a dependency-free TypeScript in-memory bookmark store
  with `CLAUDE.md`, one earlier spec and one earlier plan. Every run starts from a fresh clone at
  commit `973098a`.

## Setup

| Item | Value |
|---|---|
| Claude Code | 2.1.302 |
| Main session model | `--model sonnet` (`claude-sonnet-5-5`) |
| Subagent models | `spec-creator`: opus (`claude-opus-5-5`); `implementation-planner`: sonnet |
| Plugins | all four marketplace plugins via `--plugin-dir`, nothing installed; `init` lists exactly these four plus built-ins |
| Settings | `--setting-sources project` (no user settings), `--permission-mode acceptEdits`, fixed `--allowedTools`, `--max-budget-usd 5` |
| Runner | [`scripts/cost/run-scenario.sh`](../scripts/cost/run-scenario.sh) |
| Metrics | [`scripts/cost/summarize.mjs`](../scripts/cost/summarize.mjs) |
| Quality gate | [`scripts/cost/check-run.mjs`](../scripts/cost/check-run.mjs) |
| Runs | 3 per arm, sequential and interleaved: base-1, opt-1, base-2, opt-2, base-3, opt-3 (2026-10-18) |

The runs alternate between arms because consecutive runs share the prompt cache. If all baseline
runs went first, the optimized arm would start with a warm cache for the shared prefix (system prompt,
`CLAUDE.md`, agent definitions) and look cheaper than it is.

## Baseline: sdd-engineering 1.0.0

Plugins come from the release tag `sdd-engineering--v1.0.0`, commit `146b9ec`.

`implementation-planner` preloads ten skills into every invocation: nine from `engineering-paved-path`
(onion-architecture, fastify-best-practices, drizzle-orm-patterns, postgresql-table-design,
react-architecture, react-best-practices, react-testing-library, zod, typescript-expert) and
`sdd-engineering:engineering-insights`. `claude plugin details engineering-paved-path` estimates the
nine at about 35.6k tokens on invoke. In a TypeScript-only project, only `typescript-expert` is routed.

## Optimization: the planner loads engineering skills on demand

This is one lever. The model, the routing table, the prompts and the other agents do not change.

- `implementation-planner`: `skills:` keeps only `sdd-engineering:engineering-insights`, and `Skill`
  is added to `tools`.
- Step 4 of the agent now says to load, with the Skill tool, only the skills that
  `references/skill-routing.md` maps to the files in the plan. Before, it said the skills are preloaded.
- `references/skill-routing.md` and the plugin README describe the new behavior.

The optimized arm used the same four plugins as the baseline. The only differences were these three
files in `sdd-engineering`.

## Results

### Per run

| Run | Cost $ | Wall s | Input | Output | Cache read | Cache write | API calls | Tool calls | Planner context, 1st call | Planner input, total | Skills the planner loaded | Gate |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| base-1 | 0.813 | 216 | 30 | 26,559 | 333,225 | 119,182 | 15 | 16 | 48,945 | 171,320 | (preloaded) | PASS |
| base-2 | 0.827 | 241 | 28 | 28,034 | 321,829 | 118,947 | 14 | 18 | 49,045 | 175,105 | (preloaded) | PASS |
| base-3 | 0.883 | 250 | 30 | 31,060 | 343,807 | 120,851 | 15 | 16 | 49,013 | 176,321 | (preloaded) | PASS |
| opt-1 | 0.726 | 222 | 30 | 26,829 | 287,344 | 88,077 | 15 | 17 | 16,959 | 144,785 | typescript-expert | PASS |
| opt-2 | 0.707 | 222 | 24 | 27,123 | 200,577 | 81,854 | 12 | 18 | 16,916 | 78,412 | none | PASS |
| opt-3 | 0.756 | 228 | 32 | 28,261 | 314,739 | 91,768 | 16 | 17 | 17,108 | 116,769 | typescript-expert | PASS |

How the columns are measured:
- Token columns sum all models: the main session and both subagents.
- API calls count assistant messages across the main session and subagents.
- "Planner input, total" is input plus cache read plus cache write, over all of the planner's calls.
- No run had a permission denial or a retry. One optimized run (opt-3) had one failed tool call: an
  `ls` of a file that does not exist, which did no harm.

### Per arm

| Arm | Gate pass | Cost per successful workflow | Median cost | p95 cost | Median wall | p95 wall | Median cache write | Median planner context, 1st call |
|---|---|---|---|---|---|---|---|---|
| base (1.0.0, `146b9ec`) | 3/3 | **$0.841** ($2.523 / 3) | $0.827 | $0.883 | 241 s | 250 s | 119,182 | 49,013 |
| opt (on-demand skills) | 3/3 | **$0.730** ($2.189 / 3) | $0.726 | $0.756 | 222 s | 228 s | 88,077 | 16,959 |
| change | — | **−13.2%** | −12.2% | −14.4% | −7.7% | −8.8% | −26% | −65% |

Cost per successful workflow is the total cost of all runs in an arm divided by the number of runs that
passed the quality gate. With 3 runs, p95 is the nearest-rank value, which is the maximum.

The cost split by model shows where the savings came from:

| Model | Base, median | Opt, median |
|---|---|---|
| sonnet (main session + planner) | $0.483 | $0.397 (−18%) |
| opus (spec-creator) | $0.344 | $0.332 (unchanged, within noise) |

## Quality gate

`check-run.mjs` is deterministic. A run is successful only if it has no critical finding:

- The run ends with `success`. It did not crash and did not hit the budget.
- Both `sdd-engineering:spec-creator` and `sdd-engineering:implementation-planner` were called.
- **Spec:** exactly one new spec in `specs/`, with status `approved` and no
  `[NEEDS CLARIFICATION]`. Every user story `US-n` has at least one acceptance criterion
  `AC-n (US-n)`, and every acceptance criterion is an EARS "shall" statement.
- **Plan:** exactly one new plan in `docs/plans/`, with steps `### S1…`. Every step references an
  AC, NFR or EC ID. Every AC of the spec is covered (ranges such as `AC-1..AC-20` are expanded), and
  the plan uses no AC IDs that are missing from the spec.
- No source file was changed, because the scenario stops at the plan.

Some checks are only warnings and do not fail a run: source paths, code blocks or `npm` in the spec.
All six runs got the same two warnings (a code block, and a mention of `npm`/`package.json`). These
come from the spec's verification hints, not from implementation design.

Result: 3/3 before and 3/3 after. There were no critical findings and no new false negatives.

## Conclusion

The optimization passes:
- **Cost:** cost per successful workflow fell 13% at an unchanged pass rate. The ranges do not
  overlap (base $0.813–0.883, opt $0.707–0.756), so the effect is larger than the run-to-run spread.
- **Where it comes from:** the planner's first-call context fell from about 49k to about 17k tokens,
  and cache writes fell by a quarter.
- **Latency:** the median fell 8%, but the ranges overlap (216–250 s and 222–228 s). This is within
  noise, and we do not claim a latency gain.

## Caveats

- **The cost is an estimate.** `total_cost_usd` is the client-side estimate that Claude Code reports.
  It is not billing data.
- **Wall-clock latency.** In 2.1.302, subagents run in the background, so `result.duration_ms` covers
  only the main thread. Latency is therefore measured by the runner. `duration_api_ms` is in the raw
  data.
- **Subagent token source.** In `stream-json`, subagent messages carry only start-of-message usage.
  Per-agent tokens therefore come from the subagent transcripts in the session directory. Totals and
  cost come from the `result` event, which includes subagents (its `modelUsage` lists both opus and
  sonnet).
- **Small sample.** 3 runs per arm.
- **The planner can skip the skill.** The planner loaded the routed `typescript-expert` skill in 2 of 3
  runs. In opt-2 it loaded no skill and copied the `typescript-expert` rules from the earlier plan in
  the sandbox. The gate cannot see this, and the plans were equivalent. In a project with no earlier
  plan, those rules would come from the model's general knowledge instead. This needs watching. A
  stricter wording would be a follow-up change and would need a new measurement.
- **Spec approval in headless mode.** In headless runs, spec-creator leaves the spec as `draft`. It
  does not accept approval relayed by another agent. The main session then sets `approved`, as the
  prompt asks. This happened the same way in both arms.
- **Isolated evals do not measure this.** `claude plugin eval` loads only the plugin under test, so it
  cannot measure skill preloading from `engineering-paved-path`. That is why the experiment uses
  headless runs with all four plugins.

## Reproduce

From the repository root, with the sandbox at commit `973098a` and a marketplace checkout per arm:

```bash
scripts/cost/run-scenario.sh base-1 <marketplace-at-1.0.0> <sandbox-repo> 973098a scripts/cost/scenario-prompt.md <out-dir>
scripts/cost/run-scenario.sh opt-1  <marketplace-at-1.1.0> <sandbox-repo> 973098a scripts/cost/scenario-prompt.md <out-dir>
# ...alternate arms...
node scripts/cost/summarize.mjs <out-dir>   # writes runs.csv and summary.json, prints per-arm stats
```
