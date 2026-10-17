# Contributing

All changes go through a pull request. `main` is protected by the `validate` check and by
code owner review (see `CODEOWNERS`).

## Adding a plugin

1. Create `plugins/<name>/` following [docs/PLUGIN-GUIDELINES.md](docs/PLUGIN-GUIDELINES.md).
2. Add the entry to `.claude-plugin/marketplace.json`. The entry `name` must equal the
   `name` in the plugin's `.claude-plugin/plugin.json`, and `source` must be `./plugins/<name>`.
3. Add a line for `plugins/<name>/` to `CODEOWNERS`.
4. Write `README.md`, `CHANGELOG.md` and `COMPATIBILITY.md` inside the plugin directory.
5. Run the checks below and open a pull request.

## Changing a plugin

1. Change the files and add a `CHANGELOG.md` entry.
2. Bump `version` in `plugin.json` (users do not receive a change without a new version).
   Use SemVer as described in [docs/RELEASES.md](docs/RELEASES.md).
3. Open a pull request. Releases and tags are created after merge.

## Checks to run locally

```bash
node scripts/validate-marketplace.mjs
claude plugin validate .
claude plugin validate ./plugins/<name>
```

## Rules

- Everything in this repository (code, comments, docs, descriptions) is written in English.
- No secrets, personal memory, caches, production data or absolute paths in any plugin.
- No product-specific names or paths. Plugins must work in any repository.
- Reference plugin-level files with `${CLAUDE_PLUGIN_ROOT}` and skill scripts with `${CLAUDE_SKILL_DIR}`.
- Do not duplicate the same instruction across an agent prompt, a skill and a CLAUDE.md.

## Pull request checklist

The pull request template lists the same items; every box must be checked or explained.
