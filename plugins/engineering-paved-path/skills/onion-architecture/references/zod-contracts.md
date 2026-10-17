# Zod: contracts are the core's vocabulary, parsing happens at the edge

The shared contracts (a package or folder of Zod schemas) are the innermost, shared ring: every
package depends on them, and they depend on nothing but `zod`. The same schema validates requests
and serializes responses.

## Rules

- **Contract first.** A new or changed request/response shape goes into the shared contracts first,
  and then into consumers. If the project vendors several copies of the contracts, port **only the
  targeted diff** between copies and compare them before and after; copying whole files can revert
  unrelated changes.
- **Parse, don't validate, and do it once, at the boundary.**
  - HTTP input: `schema: { body, params, querystring }` on the route
    (`fastify-type-provider-zod`). Handlers receive typed `req.body`.
  - HTTP output: `schema: { response }` or the DTO type from `z.infer`. Serialization errors are
    caught by the shared handler (500, never leaks the raw object).
  - External data (third-party API payloads, LLM structured output, JSON columns): parsed in the
    **adapter** or repository that received it, so the inner rings get typed values.
- **Inner rings take typed values, not `unknown`.** A service signature like
  `add(workspaceId: string, userId: string, input: ProjectInput)` is right;
  `add(body: unknown)` followed by `ProjectInput.parse(body)` inside the service is not.
- **Domain rules may use Zod too**, e.g. a `refine` for a business invariant in a `domain.ts`
  schema. That is fine because Zod is a ring-1 dependency. What's not fine is importing Fastify or
  Drizzle to express the rule.
- **Contracts are not rows.** Don't `createSelectSchema(t.projects)` as an API contract. That
  makes the DB schema the API. Map rows to the contract in the repository/helper (`toProjectDto`).

For Zod API details (refinements, `safeParse`, error formatting) use the `zod` skill.
