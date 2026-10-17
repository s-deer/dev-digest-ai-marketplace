# Errors: inner rings raise domain errors, the edge maps them

Keep one error taxonomy (for example `platform/errors.ts`) that every ring may import. A typical set:

| Class | code | HTTP | Raise when |
|---|---|---|---|
| `NotFoundError` | `not_found` | 404 | entity missing **for this tenant** (don't reveal cross-tenant existence) |
| `ValidationError` | `validation_error` | 422 | a business rule rejects otherwise well-formed input |
| `ConfigError` | `config_error` | 500 | missing key/config discovered at call time |
| `ExternalServiceError` | `external_service_error` | 502 | an adapter's upstream failed |
| `AppError(code, msg, status, details?)` | custom | custom | anything else, e.g. `AppError('project_exists', …, 409)` |

If the project already has a taxonomy, use its classes and codes instead of these names.

A shared error handler (in Fastify, `app.setErrorHandler`, registered before modules) turns these
into one envelope such as `{ error: { code, message, details } }` and handles Zod request/response
validation errors.

## Rules

- **Services and domain code throw; routes don't catch.** A route that catches in order to call
  `reply.status(404)` duplicates the handler and drifts from the envelope.
- **Adapters translate foreign errors.** SDK request errors, LLM API errors, Postgres `23505`:
  convert these into the taxonomy at the adapter/repository boundary, keeping the original as
  `details` or `cause` when it helps debugging. Inner rings must not branch on vendor error classes.
- **Prefer a specific `code` over a new class.** Add a subclass only if several places raise it
  and the client branches on it.
- **Background jobs** have no HTTP edge. Let the error propagate to the job runner (which records
  and retries), or persist the failure through a repository when the job owns a status record.
