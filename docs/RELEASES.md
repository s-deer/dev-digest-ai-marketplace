# Releases

## Versioning (SemVer)

- **patch**: fixes behavior without changing the documented contract.
- **minor**: adds a backward-compatible capability.
- **major**: changes a schema, a required dependency or the usual workflow.

Prompts are not functions: a one-sentence change can alter activation or output. Every bump
must pass the plugin's behavior evals.

`version` in `plugin.json` is the cache key. If it is not bumped, `plugin update` considers the
installed copy current. Always bump the version for any change users should receive.

## Tags

Each release is tagged `<plugin>--v<version>` on the commit that passed CI, for example
`sdd-engineering--v1.0.0`. Dependency ranges (`^1.0.0`) resolve against these tags.

```bash
cd plugins/<name>
claude plugin tag --dry-run
claude plugin tag --push
```

Or use the helper: `scripts/release.sh <plugin> [--push]`.

Release order: dependencies first, then the plugins that depend on them.

A tag, not the version number, identifies the exact commit. Never move a published tag.

## Release checklist

1. `CHANGELOG.md` updated, `version` bumped.
2. CI green; evals green (when the plugin has evals).
3. Tag dependencies, then consumers.
4. Record version, tag, commit SHA and eval result in the pull request or release notes.

## Updating (three separate operations)

```bash
claude plugin marketplace update dev-digest-ai-marketplace   # refresh the catalog
claude plugin update <plugin>@dev-digest-ai-marketplace --scope project   # update the plugin
```

Then run `/reload-plugins` or start a new session. Active hooks, MCP servers and cache paths
stay bound to the old version until the session reloads.

Verify three scenarios: clean install, upgrade from the previous release, and activation in a
fresh session (a version number in `claude plugin list` alone proves nothing).

## Auto-update

Auto-update is controlled per user and per marketplace. It requires that the plugin version is
bumped. Releases are always created manually; users pull them.

## Rollback

Claude Code has no documented `plugin rollback` command. The rollback procedure is:

1. Keep a **stable** marketplace pinned to a verified ref or SHA, next to the default (latest) one.
2. Disable or remove the current plugin installation.
3. Install the plugin from the stable marketplace.
4. Run `/reload-plugins` (or start a new session) and run the smoke eval.
5. Move back to the latest channel only after the fix is verified and no plugin data is lost.

If the plugin changed external state (hooks, daemons, integrations), describe and perform its
recovery separately; see [SECURITY.md](SECURITY.md).
