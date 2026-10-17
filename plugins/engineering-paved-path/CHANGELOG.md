# Changelog

All notable changes to this plugin are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow SemVer.

## [1.0.0] - 2026-10-17

### Added
- Twelve skills: `react-best-practices`, `react-architecture`, `react-testing-library`,
  `next-best-practices`, `fastify-best-practices`, `onion-architecture`, `drizzle-orm-patterns`,
  `postgresql-table-design`, `zod`, `typescript-expert`, `security`, `mermaid-diagram`.
- `onion-architecture` and `react-architecture` generalized to any repository: rules map onto the
  project's documented layout instead of fixed paths.
- `typescript-expert` diagnostic script referenced through `${CLAUDE_SKILL_DIR}`.
