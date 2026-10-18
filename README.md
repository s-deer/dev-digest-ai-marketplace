# dev-digest-ai-marketplace

A Claude Code plugin marketplace that distributes reusable AI harness components:
skills, agents and workflows that a team can install, update and roll back like any other
dependency.

## Plugins

| Plugin | What it provides | Depends on |
|---|---|---|
| [`sdd-engineering`](plugins/sdd-engineering/README.md) | Spec-Driven Development workflow: spec-creator, implementation-planner, implementer, test-writer, plan-verifier; `/run-plan`, `/workflow-retro`, engineering-insights | the three plugins below |
| [`architecture-review`](plugins/architecture-review/README.md) | Read-only `architecture-reviewer` agent | `engineering-paved-path` |
| [`research-tools`](plugins/research-tools/README.md) | Read-only `researcher` agent | — |
| [`engineering-paved-path`](plugins/engineering-paved-path/README.md) | 11 shared engineering skills (React, Next.js, Fastify, onion architecture, Drizzle, PostgreSQL, Zod, TypeScript, testing, security, Mermaid) | — |

```text
sdd-engineering
├── engineering-paved-path
├── research-tools
└── architecture-review
    └── engineering-paved-path
```

Installing `sdd-engineering` installs its dependencies automatically.

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

## Catalog site

A searchable catalog of every plugin, skill and agent is published to GitHub Pages from `main`
(see [docs/SITE-SPEC.md](docs/SITE-SPEC.md)). To run it locally:

```bash
npm ci && npm run build:index        # writes site/public/{index,releases,stats}.json and bodies/
cd site && npm ci && npm run dev     # dev server; rebuilds the index first
npm run build && npm run preview     # production build in site/dist
```

## Repository layout

```text
.claude-plugin/marketplace.json   catalog of plugins (source of truth for the list)
plugins/<name>/                   one directory per plugin, each with .claude-plugin/plugin.json
docs/                             guidelines, security policy, release process
scripts/                          validation, release and catalog index helpers
site/                             static catalog UI published to GitHub Pages
.github/workflows/                CI (validation, site build and deploy)
```

## Documentation

- [CONTRIBUTING.md](CONTRIBUTING.md) - how to add or change a plugin
- [docs/PLUGIN-GUIDELINES.md](docs/PLUGIN-GUIDELINES.md) - plugin structure and manifest rules
- [docs/SECURITY.md](docs/SECURITY.md) - permissions, secrets and incident response
- [docs/RELEASES.md](docs/RELEASES.md) - SemVer, tags, updates and rollback
- [docs/COST-BASELINE.md](docs/COST-BASELINE.md) - cost baseline of the spec + plan workflow and one optimization

## License

[MIT](LICENSE). Third-party skills keep their upstream licenses; see the Sources section of
[plugins/engineering-paved-path/README.md](plugins/engineering-paved-path/README.md).
