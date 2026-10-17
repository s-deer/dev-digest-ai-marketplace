---
name: onion-architecture
description: Enforces Onion Architecture (dependency rule, ports & adapters, composition root) in a TypeScript backend organized as feature modules (routes, service, repository, adapters, a composition root). Use this skill whenever you add or change a backend module, route, service, repository, job handler, adapter, or port; whenever you move logic between routes/service/repository; when a Fastify handler, Drizzle query, Zod contract, or external SDK is being wired into a feature; and when reviewing a backend diff or PR for layering, "where should this code live", coupling, or testability — even if the user never says "onion" or "architecture". Not for frontend code.
---

# Onion Architecture for backend modules

The one rule everything else follows from: **source-code dependencies point inward only.**
Inner rings (domain types, pure logic, use cases) never import outer rings (HTTP framework,
ORM, SDKs, the container). Outer rings depend on inner ones and implement the interfaces (ports)
the inner rings declare.

Why this matters, concretely:
- Services that only see ports are testable with in-memory fakes or mock adapters: hermetic, no
  Docker, no keys. A service that touches the database or an SDK directly forces every test of
  it to become an integration test.
- Tenancy (for example `workspaceId` or `tenantId` scoping) lives in repositories. SQL written in a
  route handler has to re-implement that guard by hand, and eventually one forgets.
- Shared contracts (Zod schemas) drive both server and client. If an ORM row leaks to the wire, a
  schema migration silently becomes an API change.

## Map the rings to the repository first

Before applying the rules, read the repository's own docs (`CLAUDE.md`, `AGENTS.md`,
`ARCHITECTURE.md`, `docs/`) and map the roles below to its real paths. If the project names
things differently, keep its names and apply the same rings. The default layout this skill uses
in examples:

```text
src/
├── modules/<name>/        one vertical slice per feature
│   ├── routes.ts          HTTP edge (Fastify plugin)
│   ├── service.ts         use cases
│   ├── repository.ts      persistence (Drizzle)
│   ├── helpers.ts         pure functions
│   └── domain.ts          domain types and rules (optional)
├── adapters/<name>/       SDK and transport implementations of ports
├── platform/container.ts  composition root
├── platform/errors.ts     error taxonomy
└── db/                    schema and migrations
<shared contracts>         Zod request/response schemas shared with clients
```

The file role is the ring. Do not introduce `domain/ application/ infrastructure/` folders if the
project does not already use them.

| Ring | Files | May import | Must not import |
|---|---|---|---|
| 1 Domain model | `domain.ts`, pure functions in `helpers.ts`; types from the shared contracts | shared contracts, other ring-1 code | HTTP framework, ORM, `db/**`, `adapters/**`, the container, any SDK |
| 2 Ports | adapter interfaces (shared or server-only, next to the adapter); module-local `interface XRepo` / `type XDeps` | ring 1 | anything concrete |
| 3 Application | `service.ts`, job handlers, use-case executors | rings 1–2, `platform/errors.ts` | HTTP framework, ORM, `db/schema`, concrete adapters, SDKs |
| 4 Infrastructure / UI | `repository.ts`, `routes.ts`, `adapters/**`, `platform/container.ts`, app bootstrap | everything inward | another module's `service.ts` / `repository.ts` directly |

The container is the **composition root**: the only place that knows which concrete adapter backs
which port. A container override mechanism is how tests swap adapters.

## Workflow for a new feature (inside → out)

1. **Contract**: request/response Zod schemas in the shared contracts first. If the project keeps
   several copies of the contracts, follow its documented sync procedure. See `references/zod-contracts.md`.
2. **Domain**: types (`z.infer<…>` or plain TS) and pure functions: validation rules,
   derivations, mappings. No I/O. Put them in `helpers.ts` or `domain.ts`.
3. **Ports**: what the use case needs from the outside, expressed as an interface in the
   domain's language (`findByName`, not `select … where`). Reuse an existing port before inventing one.
4. **Service**: the use case. Takes its collaborators through the constructor, orchestrates
   domain + ports, throws domain errors. No HTTP, no SQL.
5. **Repository**: Drizzle implementation of the persistence port. Scopes every query by the
   tenant key, maps rows to domain/DTO shapes, translates driver errors. See `references/drizzle.md`.
6. **Routes**: Fastify plugin: Zod `schema` on the route, request context, one service call,
   status code. See `references/fastify.md`.
7. **Wire**: register the module; new adapters or shared repositories get a lazy getter and an
   override in the container. See `references/ports-adapters.md`.
8. **Tests** by ring. See `references/testing.md`.

For trivial CRUD, steps 2–3 can be nearly empty and the service thin. That is fine: onion is
about the *direction* of dependencies, not about the number of files.

## Rules

- **The ORM stays in the repository.** `drizzle-orm` and `db/schema` are imported only by
  repositories and `db/**`. A route or service that needs data calls a repository method; add one
  if it doesn't exist.
- **The HTTP framework stays at the edge.** `fastify` / `FastifyRequest` appear only in routes,
  app bootstrap, platform code and the request-context helper. Services receive plain values
  (tenant id, user id, parsed body), never `req`/`reply`.
- **SDKs stay in adapters.** Git, HTTP API, LLM and other SDK clients are used only under
  `adapters/**`, behind a port.
- **New services get narrow dependencies.** Pass `{ repo, jobs, git, secrets, … }` (ports)
  into the constructor rather than the whole container. Passing the container turns it into a
  service locator: the real dependencies become invisible and tests must build a full container.
- **Repositories return domain/DTO shapes, not query builders.** Row types (`$inferSelect`) are
  allowed inside the repository and its mapping helper; don't let a new service or route
  signature be expressed in row types.
- **Cross-module access goes through the container or a port**, never
  `import … from '../other-module/service'`.
- **Errors are domain errors.** Inner rings throw the project's error taxonomy (not found,
  validation, config, external service, or a generic app error with a code and status); the shared
  error handler owns the HTTP envelope. See `references/errors.md`.
- **Parse at the boundary.** Input is parsed by the route schema, external responses by the
  adapter. Inner rings work with typed values and never call `Schema.parse(req.body)`.

## Known deviations

Existing code may already break these rules. Don't copy deviations and don't deepen them. When you
already have to change such a file for your task, move the touched query or call to the right ring
(boy-scout rule). Don't mass-refactor unless the user asks. If the project documents its known
deviations, name the applicable one in one line before acting.

## Before you finish: review checklist

Run searches like these on your diff, adjusted to the project's paths and SDKs:

```sh
# ORM / schema outside the persistence ring
grep -rnE "from 'drizzle-orm'|db/schema" src/modules \
  --include=routes.ts --include=service.ts --include=helpers.ts --include=domain.ts
# HTTP framework outside the edge
grep -rn "from 'fastify'" src/modules --include=service.ts --include=repository.ts
# SDKs outside adapters (list the SDKs the project uses)
grep -rnE "from '(octokit|openai|@anthropic-ai/sdk|simple-git)'" src/modules
```

Then check:
1. Every new file has a clear ring, and its imports only point inward.
2. The route handler is: schema → request context → one service call → status. No branching business logic.
3. Every repository query is scoped by the tenant key (or documents why not).
4. New external I/O has a port, an adapter, a test double, and a container getter + override.
5. Contract changes landed in the shared contracts first.
6. The service has a hermetic test with faked ports; the repository has an integration test.
7. No new service takes the whole container.

When reviewing someone else's diff, report violations by ring ("service imports `drizzle-orm`
→ ring 3 depending on ring 4") with the file:line and the concrete fix.

## Reference files — read when relevant

- `references/fastify.md`: writing or changing routes, plugins, route tests with `inject`.
- `references/drizzle.md`: repositories, row→domain mapping, transactions, driver errors.
- `references/zod-contracts.md`: adding or changing a request or response shape.
- `references/ports-adapters.md`: any new external service, SDK, or shared repository.
- `references/errors.md`: choosing or adding an error type.
- `references/testing.md`: which test goes in which ring and file.
- `references/examples.md`: good/bad pairs. Read when unsure.
- `references/sources.md`: the articles this is based on, for the "why" behind a rule.

Related skills: `fastify-best-practices`, `drizzle-orm-patterns`, `zod`, `typescript-expert`.
