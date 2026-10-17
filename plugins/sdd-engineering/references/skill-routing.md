# Skill routing

Which engineering skill governs which file. `implementation-planner` attaches rules from these
skills to each plan step, and `implementer` and `test-writer` follow the same skills, so the plan,
the code and the tests agree.

**Precedence.** If the target repository has its own routing document (look for it in `CLAUDE.md`,
`AGENTS.md`, or a file named like `routing.md` / `skill-routing.md`), it wins over this table.
Skip a row when the project does not use that stack (for example no Fastify, no Drizzle).

All skills below come from the `engineering-paved-path` plugin. Load them by their namespaced
name, for example `engineering-paved-path:onion-architecture`.

| Files | Skills |
|---|---|
| Backend modules: routes, services, repositories, adapters, job handlers, the composition root | `onion-architecture`, `fastify-best-practices` (Fastify projects), `zod` |
| ORM schema, repositories, migrations | `drizzle-orm-patterns`, `postgresql-table-design` (PostgreSQL) |
| Shared request/response schemas, validation of external data | `zod` |
| React components, hooks, client state, data hooks | `react-architecture`, `react-best-practices` |
| Next.js routes, layouts, Server Components, Server Actions, route handlers | `react-architecture` |
| Component and hook tests (`*.test.tsx`) | `react-testing-library` |
| Backend tests | `onion-architecture` → `references/testing.md`, `fastify-best-practices` (`app.inject`) |
| Any TypeScript file, `tsconfig*.json`, type-level code | `typescript-expert` |
| Authentication, authorization, tenancy, user input handling, secrets, file uploads, HTML rendering of untrusted content, shell or git commands built from input | `security` |
| Diagrams in specs, plans and docs | `mermaid-diagram` |

`security` is not preloaded into any agent. `implementation-planner` reads it when a file routes
to it and lists the points under "Notes for reviewers → Security"; `implementer` loads it with the
Skill tool for those files.
