# Marketplace research (temporary)

Temporary notes. Delete this directory after the plugins are created.

Sources: Claude Code docs "Create a marketplace" and "Plugin dependencies".

- A marketplace is a repository with `.claude-plugin/marketplace.json`. Required: `name`, `owner`, `plugins[]`.
- Each plugin entry needs `name` and `source`. Relative sources are written from the marketplace root
  (`./plugins/<name>`), never with `..`.
- Entry name and `plugin.json` name must match; otherwise installs by manifest name fail.
- `claude plugin validate` checks JSON syntax, required fields, naming rules, `..` in sources and
  each relative plugin's manifest. It does not check that source directories exist (install does).
- Dependencies live in `plugin.json` (`dependencies`), string or `{name, version, marketplace}`.
  Ranges are semver and require Claude Code >= 2.1.110. Resolution uses git tags
  `<plugin>--v<version>`; for relative-path plugins the tags live on the marketplace repository.
- `claude plugin tag [--push|--dry-run]` validates the plugin, checks version agreement, requires a clean tree.
- `claude --plugin-dir` loads local copies and satisfies dependencies without installing.
- Conflicting ranges disable the dependent plugin (`claude plugin list` shows the requirement).
