# Catalog Site Specification

A static catalog of this marketplace, published on GitHub Pages. The CLI remains the way to install
plugins; the site is for discovery: find a plugin, skill or agent, read its documentation, see its
dependencies and copy the install command.

## 1. Goal and scope

**In scope (v1):**
- Full-content keyword search over plugins, skills and agents, with results shown as cards.
- Copy install on every card and detail page.
- Plugin and artifact detail pages with deep links.
- Search facets (kind, keyword, plugin) and sorting.
- Command palette (⌘K / Ctrl+K) for quick navigation.
- What's new: release feed built from plugin changelogs.
- Stats: repository-wide numbers on the home page.
- Getting started: how to add the marketplace and install a plugin.

**Out of scope (v1):** backend, ratings, download counters, LLM or embedding search,
compatibility matrix, dependency graph view, collections, RSS.

## 2. Constraints and consequences

| Constraint | Consequence |
|---|---|
| GitHub Pages serves static files only | The browser cannot read `plugins/` at runtime. The catalog is a build-time snapshot; a merge to `main` rebuilds and redeploys it. |
| Only real data | No mocks or fixtures in the bundle. An empty marketplace shows an empty state. |
| The repository can be forked or renamed | No hardcoded repository slug, marketplace name or absolute paths. All of them come from the index. |
| Repository markdown is untrusted input | Rendered markdown is always sanitized (section 9). |
| The repository is English-only | Every user-facing string is English and lives in one dictionary file (section 10). |

## 3. Architecture

```
.claude-plugin/marketplace.json, plugins/**, CODEOWNERS
   └─ scripts/build-index.mjs                 (Node 22, build time)
        └─ site/public/index.json
           site/public/releases.json
           site/public/stats.json
           site/public/bodies/<id>.md         (generated, git-ignored)
             └─ site/  React + TypeScript + Vite
                  └─ site/dist/               (git-ignored) → GitHub Pages
```

- Root `package.json` (private, ESM) provides `npm run build:index`, which runs
  `node scripts/build-index.mjs`. Its only dependency is `yaml` for frontmatter parsing.
- `site/package.json` scripts: `dev` (builds the index, then starts Vite), `build`
  (`tsc -b && vite build`), `preview`, `typecheck`. Runtime dependencies: `react`, `react-dom`,
  `minisearch`, `marked`, `dompurify`.
- Vite runs with `base: './'` and data is fetched with relative URLs, so the site works under
  `https://<owner>.github.io/<repo>/` without extra configuration.

## 4. Index: data model and derived files

### Inputs

| Source | Used for |
|---|---|
| `.claude-plugin/marketplace.json` | marketplace name, description, owner, plugin list, category |
| `plugins/<p>/.claude-plugin/plugin.json` | version, description, author, keywords, dependencies, repository |
| `plugins/<p>/README.md` | plugin body and search text |
| `plugins/<p>/CHANGELOG.md` | releases, last updated date |
| `plugins/<p>/COMPATIBILITY.md` | minimum Claude Code version |
| `plugins/<p>/skills/*/SKILL.md` | skill frontmatter, body and supporting files |
| `plugins/<p>/agents/*.md` | agent frontmatter and body |
| `CODEOWNERS` | plugin owners |

### `index.json`

```ts
{
  marketplace: {
    name: string;            // "name" from marketplace.json
    description: string;
    owner: string;           // owner.name
    repository: string;      // "<owner>/<repo>", taken from the plugin manifests
    repositoryUrl: string;
    branch: string;          // branch used for GitHub links ("main", or CATALOG_BRANCH)
    generatedAt: string;     // ISO timestamp
    commit: string;          // GITHUB_SHA, or `git rev-parse HEAD` locally
  },
  plugins: Array<{
    id: string;              // plugin name
    kind: "plugin";
    name: string;
    version: string;
    description: string;
    author: string;
    owners: string[];        // from the CODEOWNERS line for /plugins/<name>/
    category: string;
    keywords: string[];
    dependencies: Array<{ name: string; range: string }>;
    dependents: string[];    // reverse edges, computed
    compatibility: { claudeCode: string | null; notes: string[] };
    updated: string | null;  // date of the newest CHANGELOG entry
    installCommand: string;  // "/plugin install <name>@<marketplace>"
    sourcePath: string;      // "plugins/<name>/README.md", base for relative links
    githubUrl: string;       // tree URL of the plugin folder
    counts: { skill: number; agent: number };
    components: string[];    // artifact ids
    body: string;            // "bodies/<id>.md" (README)
    searchText: string;
  }>,
  artifacts: Array<{
    id: string;              // "<plugin>.<kind>.<name>"
    kind: "skill" | "agent";
    name: string;
    plugin: string;
    pluginVersion: string;
    description: string;
    invocation: string | null; // skill: "/<plugin>:<name>" (null if user-invocable: false); agent: "<plugin>:<name>"
    keywords: string[];      // inherited from the plugin
    skill?: { argumentHint: string | null; manualOnly: boolean; userInvocable: boolean; allowedTools: string[] };
    agent?: { tools: string[]; skills: string[]; model: string | null }; // skills = preloaded, namespaced
    files: string[];         // supporting files next to SKILL.md, relative paths
    installCommand: string;  // the parent plugin's command
    sourcePath: string;      // repository path of SKILL.md or the agent file
    githubUrl: string;       // blob URL of SKILL.md or the agent file
    body: string;            // "bodies/<id>.md"
    searchText: string;
  }>
}
```

- `searchText` is the markdown body with frontmatter, code fences and markup removed.
- `bodies/<id>.md` contains the raw markdown body without frontmatter. Detail pages load it lazily.
- `manualOnly` mirrors `disable-model-invocation: true`.

### `releases.json`

```ts
Array<{
  plugin: string;
  version: string;
  date: string;                          // YYYY-MM-DD
  sections: Record<string, string[]>;    // "Added", "Changed", "Fixed", ... → bullet items
  summary: string;                       // first bullet, plain text
}>
```

Parsed from Keep a Changelog headings (`## [x.y.z] - YYYY-MM-DD`), sorted newest first, then by
plugin name.

### `stats.json`

```ts
{
  totals: { plugin: number; skill: number; agent: number; dependencyEdges: number };
  perPlugin: Array<{ name: string; version: string; skill: number; agent: number;
                     dependsOn: string[]; usedBy: string[]; updated: string | null }>;
  manualOnlySkills: number;
  agentModels: Record<string, number>;
  topAgentTools: Array<{ tool: string; count: number }>;
  topKeywords: Array<{ keyword: string; count: number }>;
  minClaudeCode: string | null;
  latestRelease: string | null;
}
```

### Build failures

`build-index.mjs` exits with code 1 and a clear message when:
- `marketplace.json` or a `plugin.json` is missing or invalid;
- a dependency is not part of this marketplace;
- a skill or agent has no `name` or `description` in its frontmatter;
- two artifacts resolve to the same id;
- the newest `CHANGELOG.md` version differs from the manifest `version`;
- plugin manifests disagree on `repository`;
- a plugin contains an unsupported component kind (section 5).

## 5. Extending the index

v1 indexes plugins, skills and agents, which is everything the marketplace ships today. If a plugin
adds `commands/`, `hooks/` or `.mcp.json`, the indexer fails with "unsupported component kind"
instead of silently hiding it from the catalog.

To support a new kind:
1. Add a reader for it in `scripts/build-index.mjs`.
2. Add the value to `ArtifactKind` in `site/src/types.ts`.
3. Add a `--kind-<kind>` color token and its labels in `site/src/i18n/en.ts`.

## 6. Routes

Hash routing, so every route works on GitHub Pages without server rewrites.

| Route | Screen |
|---|---|
| `#/` | Home (includes Stats) |
| `#/search?q=&kind=&kw=&plugin=&sort=` | Search; filter state lives in the URL and can be shared |
| `#/plugin/<name>` | Plugin detail |
| `#/artifact/<id>` | Skill or agent detail, `<id>` = `<plugin>.<kind>.<name>` |
| `#/whats-new` | Release feed |
| `#/getting-started` | Connecting the marketplace |
| any other route, unknown name or id | Not found, with a link to Home |

- The router is a small hook over `hashchange`; no routing library.
- Cards and links are real `<a href="#/...">` elements, so they open in a new tab and can be copied.
- Changing the route scrolls to the top.

## 7. Search

- MiniSearch over plugins and artifacts, built in the browser after `index.json` loads.
- Fields and boosts: `name` ×4, `description` ×2, `keywords` ×2, `plugin` ×1, `searchText` ×1
  (README, SKILL.md and agent bodies).
- Options: `prefix: true`, `fuzzy: 0.2`, `combineWith: 'OR'`, a short English stop-word list, so
  natural queries such as "skill for testing React" return useful results.
- Results scoring below 15% of the best hit are dropped, which removes incidental matches deep in
  long skill bodies.
- Facets applied after the search: kind, keyword, plugin.
- Sort: relevance (default), name, recently updated.
- An empty query lists the whole catalog with the active facets.
- The header search writes `#/search?q=...` while typing (history `replaceState`, so typing does not
  flood the back button).
- ⌘K / Ctrl+K opens a command palette over the same index; Enter opens the selected item, Esc closes.

## 8. Screens

All screens share a sticky header: logo, marketplace name (from the index), search input,
⌘K button, theme toggle and a GitHub link. Copy actions show a "Copied to clipboard" toast.
The app shows loading and error states while the index is fetched.

### Home
- Hero with the search input and the most common keywords as chips.
- **Stats:** tiles for plugins, skills, agents and dependency links (each opens Search with the
  matching filter); a compact table per plugin (version, skills, agents, depends on, used by,
  updated); minimum Claude Code version; index commit and generation date.
- What's new: the four latest releases and a link to the full feed.
- Browse by kind.
- Empty state when the marketplace has no plugins, linking to Getting started and `CONTRIBUTING.md`.

### Search
- Facets in a sidebar; on narrow screens they collapse into a "Filters (n)" disclosure above the
  results.
- Result card: kind badge, version, name, two-line description, up to three keywords, meta line
  (parent plugin for artifacts, component count for plugins), Copy install and Open.
- Empty results state with a "Clear filters" action.

### Plugin detail
- Header: name, `v<version>`, `Claude Code >= <x>`, description, author, owners, last updated.
- Install box with the command, Copy, and View on GitHub.
- Components grouped by kind: name, invocation, description; each links to its artifact page.
- Dependencies (with version range) and Used by, linking to the other plugins.
- README, rendered.
- Changelog entries for this plugin.

### Artifact detail
- Breadcrumb: Catalog / plugin / name.
- Kind badge, name, invocation.
- Description.
- Metadata: tools, model and preloaded skills (agents, linked when they are in the catalog);
  allowed tools, argument hint, "Manual only" and "Not user-invocable" badges (skills).
- Install box with the parent plugin's command and "Installed as part of `<plugin>`".
- Documentation: the rendered body.
- Supporting files with GitHub links.

### What's new
Full release feed: plugin, version, date and changelog sections as lists; each entry links to
the plugin.

### Getting started
Copyable steps built from the index:
1. `/plugin marketplace add <owner>/<repo>`
2. `/plugin install sdd-engineering@<marketplace>` (dependencies are installed automatically)
3. `/reload-plugins`
4. `/plugin marketplace update <marketplace>` to fetch new versions

Followed by short notes: marketplace update vs plugin update, and project scope vs user scope.

## 9. Markdown rendering

- `marked` converts markdown to HTML, and the result **always** passes through
  `DOMPurify.sanitize` before it reaches the DOM: no scripts, event handlers, `javascript:` URLs
  or inline styles.
- A DOMPurify hook rewrites relative links to GitHub `blob/main` URLs and relative images to
  `raw.githubusercontent.com`, and adds `target="_blank" rel="noopener noreferrer"` to external
  links.
- No syntax highlighting in v1; code blocks are monospace with horizontal scrolling.

## 10. Design and texts

- The design follows the catalog prototype: tokens `--bg*`, `--border*`, `--text*`, `--accent`,
  `--kind-*`, fonts IBM Plex Sans and IBM Plex Mono.
- Dark theme by default, light theme as an option; the choice is kept in `localStorage`
  (guarded by try/catch).
- Global `styles/tokens.css` plus CSS Modules per component.
- Responsive: single column on narrow screens, stat tiles in two columns, no horizontal scroll.
- Every user-facing string lives in `site/src/i18n/en.ts` and is read through `t(key, params)`.
  Components contain no literal UI text.

## 11. Site structure and CI/CD

```
site/
├── README.md
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── types.ts
    ├── i18n/          en.ts, t.ts
    ├── router/        useHashRoute.ts
    ├── data/          useCatalog.tsx, search.ts
    ├── lib/           markdown.ts, clipboard.ts, theme.ts, useMediaQuery.ts
    ├── components/    Header, SearchInput, CommandPalette, Card, KindBadge, InstallBox, CopyButton,
    │                  Markdown, InlineMarkdown, Toast, EmptyState
    ├── screens/       Home, Search, PluginDetail, ArtifactDetail, WhatsNew, GettingStarted, NotFound
    └── styles/        tokens.css
```

`.github/workflows/pages.yml`, separate from `validate.yml` so the site status is visible on its own:
- `pull_request` (paths: `site/**`, `scripts/build-index.mjs`, `plugins/**`, `.claude-plugin/**`,
  `CODEOWNERS`, `package*.json`, the workflow file) → job **build catalog site**: `npm ci`,
  `npm run test:index` (`node:test` checks of the index builder), `npm run build:index`, `npm ci`
  in `site/`, `npm run typecheck`, `npm run build`.
- `push` to `main` and `workflow_dispatch` → the same build, `actions/upload-pages-artifact`
  with `site/dist`, then job **deploy** with `actions/deploy-pages`. Only the deploy job gets
  `pages: write` and `id-token: write`; `concurrency: pages`.
- Repository setting: Settings → Pages → Source: GitHub Actions.

`.gitignore` additions: `node_modules/`, `site/dist/`, `site/public/*.json`, `site/public/bodies/`.

## 12. Acceptance

Local:
```bash
npm ci && npm run build:index
cd site && npm ci && npm run build && npm run preview
```

1. Searching `zod`, `testing react` and `spec` finds the plugin and its nested skills and agents.
2. Version and dependencies on a plugin page match its `plugin.json`; owners match `CODEOWNERS`.
3. Copy install copies `/plugin install sdd-engineering@<marketplace>` exactly.
4. Deep links such as `#/artifact/engineering-paved-path.skill.zod` and
   `#/search?q=react&kind=skill` open directly.
5. Markdown containing `<script>` or `onerror` renders without executing anything.
6. `npm run dev` rebuilds the index and serves the site locally.
7. `node scripts/validate-marketplace.mjs` passes (English only, no absolute paths).
8. After merge to `main`, the `pages` workflow deploys and the production URL shows the real plugins.
