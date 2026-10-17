# dev-digest-ai-marketplace

A Claude Code plugin marketplace that distributes the reusable AI harness components
extracted from DevDigest: skills, agents and workflows that a team can install, update
and roll back like any other dependency.

> Status: scaffold. Plugins are added in follow-up pull requests.

## Usage

Add the marketplace once, then install plugins from it:

```bash
claude plugin marketplace add s-deer/dev-digest-ai-marketplace --scope project
claude plugin install <plugin>@dev-digest-ai-marketplace --scope project
```

After installing or updating, run `/reload-plugins` or start a new session.

## Updating

Updating the catalog, updating a plugin and reloading a running session are three separate steps:

```bash
claude plugin marketplace update dev-digest-ai-marketplace
claude plugin update <plugin>@dev-digest-ai-marketplace --scope project
```

Then run `/reload-plugins` in the open session.

## Repository layout

```text
.claude-plugin/marketplace.json   catalog of plugins (source of truth for the list)
plugins/<name>/                   one directory per plugin, each with .claude-plugin/plugin.json
docs/                             guidelines, security policy, release process
scripts/                          validation and release helpers
site/                             static catalog UI published to GitHub Pages
.github/workflows/                CI (validation, site build and deploy)
```

## Documentation

- [CONTRIBUTING.md](CONTRIBUTING.md) - how to add or change a plugin
- [docs/PLUGIN-GUIDELINES.md](docs/PLUGIN-GUIDELINES.md) - plugin structure and manifest rules
- [docs/SECURITY.md](docs/SECURITY.md) - permissions, secrets and incident response
- [docs/RELEASES.md](docs/RELEASES.md) - SemVer, tags, updates and rollback
