# Plugin guidelines

## Plugin boundary

A plugin is the unit of installation and update. Put components in one plugin only when they
share an audience, similar permissions and an owner, and must be updated together. A passive
skill used by many people and an MCP server with production credentials belong in different plugins.

## Directory layout

```text
plugins/<name>/
├── .claude-plugin/
│   └── plugin.json
├── skills/<skill-name>/SKILL.md      (optional: scripts/, references/, assets/)
├── agents/<agent-name>.md
├── hooks/hooks.json                  (optional)
├── .mcp.json                         (optional, no credentials)
├── evals/                            (behavior and negative cases)
├── README.md
├── CHANGELOG.md
└── COMPATIBILITY.md
```

Only `.claude-plugin/plugin.json` is mandatory for Claude Code; the other files are mandatory
for this marketplace.

## Manifest rules (`plugin.json`)

- `name` equals the marketplace entry name.
- `version` is set and follows SemVer. It is the cache key: a new commit with the same version
  is not delivered to users.
- `dependencies` use version ranges (`^1.0.0`). Dependencies in this marketplace are resolved
  through git tags named `<plugin>--v<version>`.
- No credentials, tokens or absolute paths.
- Do not repeat `version` or component definitions in the marketplace entry unless needed.

## Paths and scripts

- A plugin is copied to a versioned cache. It must not reference files outside its directory
  (no `../shared`).
- Use `${CLAUDE_PLUGIN_ROOT}` for plugin-level files and `${CLAUDE_SKILL_DIR}` for scripts inside a skill.
- Never store state under either path; both change on update.

## Referencing components

Skills and agents from dependencies are namespaced, for example
`engineering-paved-path:react-best-practices`. Reference your own components by full name too
when a field expects a plugin-scoped reference.

## Content rules

- Written in English.
- No product-specific module names, repository names or hard-coded project paths. Take project
  facts from explicit inputs or from repository-local documentation.
- One source of truth per instruction. Keep agent prompts short and put details in skill
  references that are loaded on demand.
- Agents declare the minimum `tools` they need; reviewers are read-only.
- Network access, credentials and write tools are documented in the plugin README.

## Required documents per plugin

- `README.md`: purpose, installation, components, usage examples, dependencies.
- `CHANGELOG.md`: user-visible changes per version.
- `COMPATIBILITY.md`: minimum Claude Code version and known limitations.
