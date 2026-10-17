# Security policy

Markdown that an agent reads is executable behavior: an instruction can ask the agent to read
credentials, run a script or send data out. Review plugin content as code.

## Prohibited in any plugin

- Secrets, API keys, tokens or OAuth credentials (including inside manifests, `.mcp.json` and examples).
- Absolute or user-specific paths (any machine-specific home or drive path).
- Personal memory, caches, production data or local experiments.
- MCP servers that need credentials, enabled together with a passive skill. Document secret
  slots and the authorization procedure in the README instead.

## Review before merge

- Read `SKILL.md`, agent prompts and README files.
- Read every script, hook and binary; list file, command, network and credential permissions.
- Confirm the plugin does not activate on unrelated requests.
- On updates, compare the permission list with the previous version.
- A green scanner is not proof of safety; it does not replace review and least privilege.

## Generative workflows

Do not make generative workflows (for example spec or plan creation) a required organization
policy. Only deterministic guardrails may become required.

## After an unsafe release

1. Stop recommending the version and remove it from the catalog (new installs are blocked;
   existing copies are not removed).
2. Publish a fixed patch version, or move the stable channel back to a known-good SHA.
3. If the plugin ran hooks, daemons or external integrations, remove that persistence and
   revoke any exposed credentials. Reverting files alone is not a security rollback.
4. Add the incident as a regression case in the plugin's `evals/`.
5. Record the incident and the fix in the plugin's `CHANGELOG.md`.

## Reporting

Report a suspected vulnerability privately to the repository owners listed in `CODEOWNERS`.
