# Catalog site

Static catalog of this marketplace: search across plugins, skills and agents, read their
documentation, see dependencies and copy the install command. The full specification is in
[`docs/SITE-SPEC.md`](../docs/SITE-SPEC.md).

## How it works

GitHub Pages serves static files only, so the browser never reads `plugins/` directly.
`scripts/build-index.mjs` runs at build time and writes a snapshot of the repository to
`site/public/`:

| File | Contents |
|---|---|
| `index.json` | marketplace info, plugins and their skills and agents |
| `releases.json` | changelog entries of every plugin, newest first |
| `stats.json` | totals, per-plugin numbers, dependency links |
| `bodies/<id>.md` | README / SKILL.md / agent bodies, loaded on detail pages |

These files and `site/dist/` are generated and not committed.

The app is React + TypeScript + Vite with hash routing (`#/`, `#/search`, `#/plugin/<name>`,
`#/artifact/<plugin>.<kind>.<name>`, `#/whats-new`, `#/getting-started`), MiniSearch for keyword
search, and `marked` + DOMPurify for markdown. Every UI string lives in `src/i18n/en.ts`.

## Local development

```bash
# from the repository root
npm ci
cd site
npm ci
npm run dev          # rebuilds the index, then starts Vite
npm run typecheck
npm run build        # production build in site/dist
npm run preview      # serves site/dist
```

Re-run `npm run build:index` (or restart `npm run dev`) after changing anything in `plugins/`.

## Deployment

`.github/workflows/pages.yml` builds the index and the site on every pull request that touches
the site, the index builder or the plugins (job "build catalog site"). On push to `main` it
builds again and deploys `site/dist` to GitHub Pages. The repository setting
Settings → Pages → Source must be "GitHub Actions".
