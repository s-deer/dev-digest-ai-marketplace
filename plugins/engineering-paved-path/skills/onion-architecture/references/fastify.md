# Fastify: routes are a driving adapter (ring 4)

A route translates HTTP into a use-case call and the result back into HTTP. It owns:
validation (via the Zod type provider), tenancy context, status codes. It owns nothing else.

## Shape of a handler

```ts
export default async function projectRoutes(appBase: FastifyInstance) {
  const app = appBase.withTypeProvider<ZodTypeProvider>();
  const service = new ProjectService({ projects: new ProjectRepository(app.container.db) });

  app.post('/projects', { schema: { body: ProjectInput } }, async (req, reply) => {
    const { workspaceId, userId } = await getContext(app.container, req);
    const { project, created } = await service.add(workspaceId, userId, req.body);
    reply.status(created ? 201 : 200);
    return project;
  });
}
```

- **Schema on the route, not in the handler.** `schema: { body, params, querystring, response }`
  with schemas from the shared contracts. Invalid input becomes a `4xx` before the handler runs.
  Hand-rolled `Schema.parse(req.body)` skips that and changes the error envelope.
- **A request-context helper** (here `getContext`) is how the route gets the tenant and user ids.
  Pass those values into the service. Don't pass `req`: that would make ring 3 depend on Fastify.
- **One service call per handler** is the norm. If the handler needs `if`/loops over data, a
  second repository call, or a `Promise.all` of several queries, that orchestration is a use
  case, so move it into the service.
- **Status mapping only.** "created vs existed → 201/200" belongs here. "Not found → 404" does
  not: the service throws `NotFoundError` and the shared error handler maps it.

## Plugins and encapsulation

- Each module is an encapsulated Fastify plugin registered in one place. Cross-cutting plugins
  (helmet, cors, rate-limit, SSE) and the error handler are registered **before** modules so every
  module inherits them.
- Use plugins/decorators for transport concerns (auth hooks, SSE, headers). Don't use
  `app.decorate` as a second DI container for domain services. Dependencies are wired in the
  composition root and reach the route through one container decoration.
- SSE / streaming routes follow the same rule: the route adapts a domain event stream to the wire.
  It doesn't compute what to stream.

## Testing routes

- Build the app with test overrides for the container and call `app.inject(...)`, so route tests
  stay hermetic when they don't hit the database.
- Database-backed route flows go in integration tests. See `testing.md`.

## Smells

| Smell | Fix |
|---|---|
| `import { eq } from 'drizzle-orm'` in a routes file | Add a repository method and call it via the service |
| `container.db.select()` in a handler | Same |
| An SDK client called in a handler | Move it to the service, which depends on a port |
| `reply.status(404).send(...)` for a missing entity | `throw new NotFoundError()` in the service |
| Handler > ~15 lines | Orchestration leaked out of the service |
