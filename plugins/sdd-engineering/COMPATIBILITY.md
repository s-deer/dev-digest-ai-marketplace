# Compatibility

| Requirement | Version |
|---|---|
| Claude Code | >= 2.1.110 (version-constrained plugin dependencies) |
| `engineering-paved-path` | ^1.0.0 |
| `research-tools` | ^1.0.0 |
| `architecture-review` | ^1.0.0 |
| `claude plugin eval` (optional, for `evals/`) | Claude Code >= 2.1.269; checked with 2.1.302 through `scripts/eval-plugin.sh` (see `evals/README.md`) |

- The agents use `${CLAUDE_PLUGIN_ROOT}` to read the shared references, and `workflow-retro` uses
  `${CLAUDE_SKILL_DIR}` for its ledger template.
- `spec-creator` runs on `opus`; the other agents run on `sonnet`. Change `model` in the agent
  frontmatter only with a new release and a fresh eval run.
- `workflow-retro deep` reads session transcripts under `~/.claude/projects/`; it needs `grep`,
  `wc` and optionally `jq`.
