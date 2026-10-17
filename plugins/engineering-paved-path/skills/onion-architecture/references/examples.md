# Examples: good and bad pairs

## ✅ Reference module shape

```
projects/
├── routes.ts      ring 4  transport only: parses requests, maps status codes
├── service.ts     ring 3  no HTTP and no raw SQL
├── repository.ts  ring 4  the only place that touches the `projects` table
├── helpers.ts     ring 1  parseProjectUrl, toProjectDto
└── constants.ts   ring 1  job kinds, limits, secret names
```

`ProjectService.runImportJob` talks to a `GitClient` port, a secrets port and a job runner. It
never touches the git SDK or SQL. Copy this shape for new modules, and pass narrow deps instead of
the container.

## ❌ → ✅ SQL in a route handler

Before:
```ts
app.get('/settings', async (req) => {
  const { workspaceId } = await getContext(container, req);
  const rows = await container.db
    .select().from(t.settings).where(eq(t.settings.workspaceId, workspaceId));
  return rowsToSettings(rows);
});
```

After:
```ts
// settings/repository.ts  (ring 4)
export class SettingsRepository {
  constructor(private db: Db) {}
  list(workspaceId: string) {
    return this.db.select().from(t.settings).where(eq(t.settings.workspaceId, workspaceId));
  }
}

// settings/service.ts  (ring 3)
export class SettingsService {
  constructor(private deps: { settings: SettingsRepository }) {}
  async get(workspaceId: string): Promise<Settings> {
    return rowsToSettings(await this.deps.settings.list(workspaceId));
  }
}

// settings/routes.ts  (ring 4)
const service = new SettingsService({ settings: new SettingsRepository(app.container.db) });
app.get('/settings', async (req) => {
  const { workspaceId } = await getContext(app.container, req);
  return service.get(workspaceId);
});
```
Why: the tenancy filter now lives in one method, and `SettingsService` can be tested with an
in-memory `{ list: async () => [...] }`.

## ❌ → ✅ Service takes the whole container

Before:
```ts
export class RenameProject {
  constructor(private container: Container) {}
  async run(ws: string, id: string, name: string) {
    const repo = new ProjectRepository(this.container.db);   // builds its own infra
    ...
    await this.container.jobs.enqueue(ws, REINDEX_JOB_KIND, {...});
  }
}
```

After:
```ts
export interface RenameProjectDeps {
  projects: Pick<ProjectRepository, 'getById' | 'findByName' | 'rename'>;
  jobs: Pick<JobRunner, 'enqueue'>;
}
export class RenameProject {
  constructor(private deps: RenameProjectDeps) {}
  ...
}
```
Why: the constructor now documents the use case's real dependencies, and a test passes two
small fakes instead of building a full container.

## ❌ → ✅ SDK inside a service

Before:
```ts
import { Octokit } from 'octokit';
const gh = new Octokit({ auth: await container.secrets.get('GITHUB_TOKEN') });
const { data } = await gh.rest.issues.listForRepo({ owner, repo: name, state: 'open' });
```

After:
```ts
const tracker = await container.issueTracker();   // port, resolved in the composition root
const issues = await tracker.listOpenIssues({ owner, name });
```
If the port lacks the method you need, add it to the port, implement it in the adapter, and add it
to the test double.

## ❌ → ✅ Transaction leaking into the service

Before:
```ts
await this.container.db.transaction(async (tx) => {
  await tx.update(t.projects).set({ name }).where(eq(t.projects.id, id));
  await tx.insert(t.auditLog)...
});
```

After: the service calls `projects.renameWithAudit(workspaceId, id, name, userId)` or
`projects.withTransaction(async ({ projects, audit }) => …)`. The `tx` never leaves the repository
(see `drizzle.md`).

## ❌ → ✅ Route maps "not found" itself

Before:
```ts
const project = await service.get(ws, id);
if (!project) return reply.status(404).send({ message: 'nope' });
```

After: `service.get` throws `new NotFoundError('Project not found')`, and the route just returns the
value. The shared error handler produces `{ error: { code: 'not_found', … } }`, the same shape
as every other endpoint.

## Reviewing a diff: sample output

> **ring 3 → ring 4 dependency** `src/modules/foo/service.ts:4` imports `drizzle-orm`.
> Move the `select … where workspace_id = …` query (`service.ts:41-48`) into
> `FooRepository.listActive(workspaceId)` and call it from the service.
>
> **service locator** `FooService` takes the container but only uses `db` and `jobs`. Pass
> `{ foos: FooRepository, jobs }` instead so its unit test can stay hermetic.
