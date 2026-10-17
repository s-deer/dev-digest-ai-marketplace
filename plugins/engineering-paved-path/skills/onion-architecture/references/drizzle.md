# Drizzle: repositories are a driven adapter (ring 4)

The repository implements the persistence side of a use case. It is the only module file that
imports `drizzle-orm` or `db/schema`. Everything Drizzle-shaped (query builders, `tx`, `sql`
fragments, `$inferSelect` rows, Postgres error codes) stays behind its methods.

## Shape

```ts
export class ProjectRepository {
  constructor(private db: Db) {}

  async findByName(workspaceId: string, name: string): Promise<ProjectRow | undefined> {
    const [row] = await this.db.select().from(t.projects)
      .where(and(eq(t.projects.workspaceId, workspaceId), eq(t.projects.name, name)));
    return row;
  }
}
```

- **Name methods in domain language**: `findByName`, `archive`, `latestRunFor`,
  not `selectWhere` / `runQuery`. The method is the port. Its name is what the service reads.
- **Scope by the tenant key in every query.** Tenancy is enforced here, once. A method that
  deliberately skips it (for example one called from a trusted background job) says so in a comment.
- **Return values, not builders.** Never return a query builder or a `sql` fragment; the service
  would then be composing SQL. Return rows mapped to a domain/DTO type, `undefined`/`null`, or a
  boolean for affected-row checks.
- **Row types stay close.** `$inferSelect` types are fine inside the repository and in the
  `toXDto` mapper next to it. A service method signature should speak in shared contract types or
  a module domain type. If the row *is* the domain shape today, re-export it under a domain name
  (`export type Project = ProjectRow`) so there is one seam to change later.
- **Big modules split repositories by aggregate** (`repository/{order,line,payment}.repo.ts`)
  behind one facade. Repositories shared across modules are built in the container.

## Transactions

A transaction is a use-case decision ("these writes succeed or fail together"), but `tx` is a
Drizzle object. Keep the decision in ring 3 and the object in ring 4:

```ts
// repository.ts: the tx never leaves this file
async renameWithAudit(workspaceId: string, id: string, name: string, userId: string) {
  return this.db.transaction(async (tx) => {
    const [row] = await tx.update(t.projects).set({ name })
      .where(and(eq(t.projects.workspaceId, workspaceId), eq(t.projects.id, id))).returning();
    if (!row) return undefined;
    await tx.insert(t.auditLog).values({ workspaceId, actorId: userId, action: 'project.rename', targetId: id });
    return row;
  });
}
```

When a use case spans several repositories, give the repository layer a unit-of-work callback
instead of passing `tx` through the service:

```ts
// repository side
withTransaction<T>(fn: (repos: { projects: ProjectRepository; audit: AuditRepository }) => Promise<T>) {
  return this.db.transaction((tx) => fn({ projects: new ProjectRepository(tx), audit: new AuditRepository(tx) }));
}
```

The service sees repositories. It never sees `tx`. A Drizzle `tx` has the same query API as
`db` but a different TypeScript type, so a repository that must work inside a transaction types
its constructor with an executor union:

```ts
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
export type Executor = Db | Tx;
export class ProjectRepository { constructor(private db: Executor) {} }
```

Then the same class works inside and outside a transaction.

## Driver errors → domain errors

Translate Postgres errors at this boundary so inner rings never inspect `err.code === '23505'`:

```ts
try {
  return await this.db.insert(t.projects).values(v).returning();
} catch (err) {
  if ((err as { code?: string }).code === '23505') {
    throw new AppError('project_exists', 'A project with this name already exists', 409);
  }
  throw err;
}
```

Better still, avoid the exception: check first in the service (`findByName`) or use
`onConflictDoNothing().returning()` and return `undefined`, then let the service decide.

## Schema and migrations

The Drizzle schema files are infrastructure. Change the schema there, then generate and apply
migrations with the project's commands (for example `drizzle-kit generate` and `drizzle-kit migrate`).
Never hand-edit generated migrations. A schema change doesn't have to change the API: the
repository's mapping absorbs it. That is the payoff of not leaking rows. For schema design itself
use the `drizzle-orm-patterns` and `postgresql-table-design` skills.
