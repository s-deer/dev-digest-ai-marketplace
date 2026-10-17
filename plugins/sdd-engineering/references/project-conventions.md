# Project conventions: where to look, what to assume

The SDD agents work in any repository. They never assume a fixed layout; they read it.

## Sources, in order

1. Project instructions: `CLAUDE.md` (root and per package), `AGENTS.md`, `CONTRIBUTING.md`.
2. Testing guide, if present (`TESTING.md`, `docs/testing*`).
3. Package manifests and scripts: `package.json` scripts, `Makefile`, `justfile`, `pyproject.toml`,
   `Cargo.toml`, workspace files (`pnpm-workspace.yaml`, `turbo.json`, `nx.json`).
4. CI workflows (`.github/workflows/*`, `.gitlab-ci.yml`): the commands CI runs are the commands
   that count.
5. Lessons files: `INSIGHTS.md`, ADRs, decision logs (per package and at the root).

## Verification commands

- Use the typecheck, lint and test commands the sources above define, per touched package, with the
  package manager the project uses (lockfile tells: `pnpm-lock.yaml`, `package-lock.json`,
  `yarn.lock`, `bun.lockb`).
- **If no command is found**, report the check as `SKIPPED (no command found)` or `UNVERIFIABLE`,
  name where you looked, and never report it as PASS.
- A test suite that cannot run in this environment (for example it needs Docker or a service that is
  not available) is `SKIPPED`, not PASS.
- Never run state-changing commands as "verification": migrations, seeds, deploys, publishing,
  `git push`.

## Artifact locations (defaults)

| Artifact | Default | Override |
|---|---|---|
| Spec | `specs/<YYYY-MM-DD>-<slug>.md`, or `<package>/specs/…` for a single-package feature in a monorepo | the spec convention in project instructions |
| Development Plan | `docs/plans/<feature>-plan.md` (saved by the main session) | the plan convention in project instructions |
| Retro ledger | `docs/retros/ledger.md` | the ledger path in project instructions |

## Exclusions

Never search or edit dependency folders (`node_modules/`, `vendor/` of package managers), build
output (`dist/`, `build/`, `.next/`), or any directory the project instructions mark as excluded
(for example cloned third-party repositories or fixtures).

## Generated files

Never hand-edit generated files: lockfiles, generated migrations, generated clients. Change the
source and run the generator the project documents.
