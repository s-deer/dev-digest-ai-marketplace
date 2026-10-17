# Ports, adapters, and the composition root

**Port** = an interface owned by the inner rings, named for what the use case needs.
**Adapter** = a concrete implementation that plugs a technology into that port.
**Composition root** = the single place that decides which adapter backs which port
(for example `platform/container.ts`).

## Where things live

| Thing | Typical location |
|---|---|
| Ports shared with other packages | the shared contracts package, next to the Zod schemas |
| Server-only ports | `adapters/<name>/index.ts` next to the implementation, or a module-local `types.ts` facade |
| Real adapters | `adapters/<name>/<impl>.ts` (`git/simple-git.ts`, `llm/openai.ts`, …) |
| Test adapters | one mocks file or `adapters/<name>/mock.ts` |
| Wiring | the container: lazy getter + an overrides field |

Follow the project's existing locations when they differ.

## Adding new external I/O (checklist)

1. **Port.** Define the interface in domain terms: `listOpenIssues(project)`, not
   `request('GET /repos/{o}/{r}/issues')`. If only the server needs it, keep it server-side. A change
   to a shared port is a deliberate contract change.
2. **Adapter.** Implement it under `adapters/<name>/`. All SDK imports, retries, rate-limit
   handling, and response parsing (Zod) live here. Throw `ExternalServiceError` / `ConfigError`,
   not SDK error types.
3. **Test double.** Add a mock or fake so services stay hermetically testable.
4. **Container.** Add a lazy getter (sync, or `async` if it needs a secret), and an override
   field that wins when present. Missing keys throw `ConfigError` at call time, so the server can
   boot without optional keys.
5. **Consume.** Services receive the port. New services get it via the constructor; routes
   pass the container's value when constructing the service.

## Composition root rules

- Only the container (and the app bootstrap for framework plugins) does `new SomeAdapter(...)` for
  production code. A service that does `new SdkClient(token)` has hard-wired an outer ring into an
  inner one.
- Keep the container **out of inner rings in new code.** It is fine for a route to read the
  container; a *new* service should declare what it needs:

  ```ts
  // prefer
  export interface RenameDeps { projects: ProjectRepository; jobs: Pick<JobRunner, 'enqueue'> }
  export class RenameProject { constructor(private deps: RenameDeps) {} }

  // routes.ts
  const rename = new RenameProject({ projects: new ProjectRepository(app.container.db), jobs: app.container.jobs });
  ```

- **Cross-module collaboration** goes through container-owned facades/repositories or a port. A
  module never imports another module's `service.ts` or `repository.ts` file directly. If it needs
  one, hoist it into the container.
- A hand-written container with explicit getters is greppable, typed, and works the same in the
  runtime, the test runner and the bundler. Don't introduce a DI framework unless the project
  already uses one.

## Pure engine packages

A pure library (for example a calculation or analysis engine that takes ports as arguments) is a
domain-service library from the server's point of view. Calling it from a service is fine. Don't
let it import server code.
