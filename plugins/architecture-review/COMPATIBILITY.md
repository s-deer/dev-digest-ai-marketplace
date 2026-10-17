# Compatibility

| Requirement | Version |
|---|---|
| Claude Code | >= 2.1.110 (version-constrained plugin dependencies) |
| `engineering-paved-path` | ^1.0.0 |

- If `engineering-paved-path` is disabled, its skills are not preloaded (Claude Code skips missing
  skills with a debug-log warning) and the review relies on the repository's own docs only.
