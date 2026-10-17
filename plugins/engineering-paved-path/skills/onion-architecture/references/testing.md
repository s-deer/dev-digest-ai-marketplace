# Testing by ring

The architecture pays off in tests: the further in the code sits, the cheaper its test. Follow the
project's testing guide if it has one. A common split: integration tests (real database, for
example via testcontainers) use a distinct suffix such as `*.it.test.ts`; every other `*.test.ts`
stays hermetic.

| Ring | What to test | How | File |
|---|---|---|---|
| 1 Domain / pure helpers | rules, derivations, mappers | plain unit tests, no mocks needed | `<module>-<topic>.test.ts` |
| 3 Service / use case | orchestration, error cases, what gets enqueued | construct with fake repositories and test adapters | hermetic `*.test.ts` |
| 4 Repository | SQL, tenancy scoping, constraints, mapping | real Postgres | integration test |
| 4 Routes | status codes, validation envelope, wiring | app with container overrides + `app.inject` | hermetic if no database, otherwise integration |
| 4 Adapters | request/response mapping | stub the SDK/transport | adapter test |

## Guidance

- **A service test that needs Docker is a layering smell.** If you can't test the use case
  without Postgres, the service is probably querying directly or relying on a row-shaped
  behaviour. Push the query into a repository and fake the repository.
- **Fakes over deep mocks.** A small in-memory class implementing the repository's methods
  reads better than `vi.fn()` chains mimicking Drizzle builders. Never mock Drizzle itself.
- **Narrow constructor deps make fakes trivial.** This is the practical reason new services
  take `{ repos, jobs, … }` rather than the container.
- **One integration test per data-backed workflow**, not per method. That's where SQL,
  migrations, and wiring bugs live.
- Don't add database access to a hermetic test file, and don't add a test only to raise coverage.
