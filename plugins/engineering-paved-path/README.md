# engineering-paved-path

Shared engineering skills for TypeScript web projects: one source of truth for React, Next.js,
Fastify, onion architecture, Drizzle, PostgreSQL, Zod, TypeScript, testing, security and Mermaid.
Other plugins (`architecture-review`, `sdd-engineering`) preload these skills into their agents
instead of copying the rules.

## Install

```bash
claude plugin marketplace add s-deer/dev-digest-ai-marketplace
claude plugin install engineering-paved-path@dev-digest-ai-marketplace
```

`sdd-engineering` and `architecture-review` install it automatically as a dependency.

## Skills

| Skill | Use it for |
|---|---|
| `engineering-paved-path:react-best-practices` | React components, hooks, state, data fetching, anti-patterns |
| `engineering-paved-path:react-architecture` | Where React / Next.js code lives: components, hooks, constants, business logic, data layer, boundaries |
| `engineering-paved-path:react-testing-library` | Component and hook tests with Vitest and React Testing Library |
| `engineering-paved-path:next-best-practices` | Next.js App Router conventions, RSC boundaries, data patterns, metadata, route handlers (background knowledge, not user-invocable) |
| `engineering-paved-path:fastify-best-practices` | Fastify routes, plugins, schemas, errors, security headers, testing with `inject` |
| `engineering-paved-path:onion-architecture` | Backend modules: dependency rule, ports and adapters, composition root, testing by ring |
| `engineering-paved-path:drizzle-orm-patterns` | Drizzle schema, queries, relations, transactions, migrations |
| `engineering-paved-path:postgresql-table-design` | PostgreSQL data types, constraints, indexes, schema design |
| `engineering-paved-path:zod` | Zod schemas, parsing, refinements, error handling, type inference |
| `engineering-paved-path:typescript-expert` | Type-level TypeScript, tsconfig, performance, tooling; includes a read-only diagnostic script |
| `engineering-paved-path:security` | OWASP Top 10 review and secure coding: auth, input handling, secrets, uploads |
| `engineering-paved-path:mermaid-diagram` | Mermaid diagrams in Markdown: flowcharts, sequence, class, ER, state |

Claude loads a skill when a task matches its description; you can also call one directly, for
example `/engineering-paved-path:onion-architecture`.

## How the skills adapt to your repository

The skills describe generic layouts and name example paths (`src/modules/<name>/…`). When your
repository documents its own structure in `CLAUDE.md`, `AGENTS.md` or architecture docs, those
conventions win; the skills tell Claude to map their roles onto your paths.

## Permissions and side effects

- Read-only knowledge. No hooks, no MCP servers, no network access.
- `drizzle-orm-patterns` declares `allowed-tools` (Read, Write, Edit, Bash, Grep, Glob) so it can be
  applied while editing code.
- `typescript-expert` ships `scripts/ts_diagnostic.py`, which runs `npx tsc --noEmit` and `grep` in the
  current project and prints a report. It changes no files.

## Sources

Third-party skills are included with their upstream source:

| Skill | Upstream |
|---|---|
| `next-best-practices` | [vercel-labs/next-skills](https://github.com/vercel-labs/next-skills) |
| `fastify-best-practices` | [mcollina/skills](https://github.com/mcollina/skills) |
| `drizzle-orm-patterns` | [giuseppe-trisciuoglio/developer-kit](https://github.com/giuseppe-trisciuoglio/developer-kit) |
| `postgresql-table-design` | [wshobson/agents](https://github.com/wshobson/agents) |
| `typescript-expert` | [sickn33/antigravity-awesome-skills](https://github.com/sickn33/antigravity-awesome-skills) |
| `zod` | [pproenca/dot-skills](https://github.com/pproenca/dot-skills) |

`react-architecture` lists its own sources in `skills/react-architecture/README.md`;
`onion-architecture` in `skills/onion-architecture/references/sources.md`; `security` in
`skills/security/references.md`.

## Owner

AI Engineering (`@s-deer`). Changes go through a pull request; see the marketplace
`CONTRIBUTING.md`.
