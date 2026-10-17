#!/usr/bin/env node
// Builds the static catalog index for the site (see docs/SITE-SPEC.md, section 4).
// Reads the marketplace, plugin manifests, plugin documents, skill and agent frontmatter
// and CODEOWNERS, then writes site/public/{index,releases,stats}.json and site/public/bodies/.
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse as parseYaml } from 'yaml';

const DEFAULT_BRANCH = process.env.CATALOG_BRANCH || 'main';
const UNSUPPORTED_DIRS = ['commands', 'hooks'];
const UNSUPPORTED_FILES = ['.mcp.json', '.lsp.json'];
const UNSUPPORTED_MANIFEST_KEYS = ['commands', 'hooks', 'mcpServers', 'lspServers'];

// ---------- pure helpers (covered by build-index.test.mjs) ----------

export function parseFrontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!match) return { data: {}, body: text };
  return { data: parseYaml(match[1]) ?? {}, body: text.slice(match[0].length) };
}

export function splitList(value) {
  if (value == null) return [];
  const items = Array.isArray(value) ? value : String(value).split(',');
  return items.map((s) => String(s).trim()).filter(Boolean);
}

export function artifactId(plugin, kind, name) {
  return `${plugin}.${kind}.${name}`;
}

export function repoSlug(url) {
  const match = /github\.com[/:]([^/]+)\/([^/#?]+?)(?:\.git)?\/?$/.exec(url ?? '');
  return match ? `${match[1]}/${match[2]}` : null;
}

// Keep a Changelog: "## [1.0.0] - 2026-10-17", "### Added", "- item" (indented lines continue an item).
export function parseChangelog(md) {
  const releases = [];
  let release = null;
  let section = null;
  for (const line of md.split(/\r?\n/)) {
    const head = /^##\s+\[?([^\]\s]+)\]?(?:\s+-\s+(\d{4}-\d{2}-\d{2}))?/.exec(line);
    if (head && !line.startsWith('###')) {
      release = { version: head[1], date: head[2] ?? null, sections: {} };
      section = null;
      if (head[1].toLowerCase() !== 'unreleased') releases.push(release);
      continue;
    }
    if (!release) continue;
    const sub = /^###\s+(.+?)\s*$/.exec(line);
    if (sub) {
      section = sub[1];
      release.sections[section] = [];
      continue;
    }
    if (!section) continue;
    const items = release.sections[section];
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet) items.push(bullet[1].trim());
    else if (/^\s+\S/.test(line) && items.length) items[items.length - 1] += ` ${line.trim()}`;
  }
  return releases;
}

// "| Claude Code | >= 2.1.110 |" plus top-level bullet notes.
export function parseCompatibility(md) {
  let claudeCode = null;
  const notes = [];
  for (const line of md.split(/\r?\n/)) {
    const row = /^\|\s*Claude Code\s*\|\s*([^|]+?)\s*\|/i.exec(line);
    if (row) claudeCode = /\d+\.\d+(?:\.\d+)?/.exec(row[1])?.[0] ?? row[1].trim();
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet) notes.push(bullet[1].trim());
    else if (/^\s+\S/.test(line) && notes.length) notes[notes.length - 1] += ` ${line.trim()}`;
  }
  return { claudeCode, notes };
}

export function parseCodeowners(text) {
  const owners = new Map();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [pattern, ...who] = line.split(/\s+/);
    owners.set(pattern.replace(/\/$/, ''), who);
  }
  return owners;
}

export function stripMarkdown(md) {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/[*_~|]+/g, ' ')
    .replace(/^\s*[-+]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function compareVersions(a, b) {
  const pa = a.split(/[.-]/).map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split(/[.-]/).map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff) return diff;
  }
  return 0;
}

const countInto = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);
const topEntries = (map, label, limit) =>
  [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ [label]: key, count }));

// ---------- build ----------

export function buildIndex(root) {
  const errors = [];
  const fail = (msg) => errors.push(msg);
  const rel = (path) => relative(root, path).split('\\').join('/');
  const readText = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : null);
  const readJson = (path) => {
    try {
      return JSON.parse(readFileSync(path, 'utf8'));
    } catch (err) {
      fail(`${rel(path)}: missing or invalid JSON (${err.message})`);
      return null;
    }
  };

  const marketplace = readJson(join(root, '.claude-plugin', 'marketplace.json'));
  if (!marketplace) return { errors };
  const codeowners = parseCodeowners(readText(join(root, 'CODEOWNERS')) ?? '');

  const plugins = [];
  const artifacts = [];
  const releases = [];
  const bodies = new Map();
  const repositories = new Set();
  const ids = new Set();
  const claimId = (id, where) => {
    if (ids.has(id)) fail(`${where}: duplicate id "${id}"`);
    ids.add(id);
  };

  for (const entry of marketplace.plugins ?? []) {
    const dir = join(root, 'plugins', entry.name);
    const manifest = readJson(join(dir, '.claude-plugin', 'plugin.json'));
    if (!manifest) continue;
    const name = manifest.name;
    const where = `plugins/${name}`;
    if (manifest.repository) repositories.add(manifest.repository);

    for (const d of UNSUPPORTED_DIRS) {
      if (existsSync(join(dir, d))) fail(`${where}: unsupported component kind "${d}/"`);
    }
    for (const f of UNSUPPORTED_FILES) {
      if (existsSync(join(dir, f))) fail(`${where}: unsupported component kind "${f}"`);
    }
    for (const key of UNSUPPORTED_MANIFEST_KEYS) {
      if (manifest[key]) fail(`${where}: unsupported component kind "${key}" in plugin.json`);
    }

    const changelog = parseChangelog(readText(join(dir, 'CHANGELOG.md')) ?? '');
    if (changelog[0]?.version !== manifest.version) {
      fail(`${where}: newest CHANGELOG version "${changelog[0]?.version}" differs from manifest "${manifest.version}"`);
    }
    for (const r of changelog) {
      const first = Object.values(r.sections).flat()[0] ?? '';
      releases.push({ plugin: name, version: r.version, date: r.date, sections: r.sections, summary: stripMarkdown(first) });
    }

    const pluginId = name;
    claimId(pluginId, where);
    const readme = readText(join(dir, 'README.md')) ?? '';
    bodies.set(pluginId, readme);

    const components = [];
    const counts = { skill: 0, agent: 0 };
    const addArtifact = (kind, file, extra) => {
      const { data, body } = parseFrontmatter(readFileSync(file, 'utf8'));
      if (!data.name || !data.description) {
        fail(`${rel(file)}: frontmatter needs "name" and "description"`);
        return;
      }
      const id = artifactId(name, kind, data.name);
      claimId(id, rel(file));
      bodies.set(id, body);
      components.push(id);
      counts[kind] += 1;
      artifacts.push({
        id,
        kind,
        name: data.name,
        plugin: name,
        pluginVersion: manifest.version,
        description: String(data.description).trim(),
        invocation: null,
        keywords: manifest.keywords ?? [],
        ...extra(data),
        installCommand: '',
        sourcePath: rel(file),
        githubUrl: '',
        body: `bodies/${id}.md`,
        searchText: stripMarkdown(body),
      });
    };

    const skillsDir = join(dir, 'skills');
    if (existsSync(skillsDir)) {
      for (const skill of readdirSync(skillsDir).sort()) {
        const skillDir = join(skillsDir, skill);
        const file = join(skillDir, 'SKILL.md');
        if (!statSync(skillDir).isDirectory()) continue;
        if (!existsSync(file)) { fail(`${rel(skillDir)}: SKILL.md is missing`); continue; }
        addArtifact('skill', file, (data) => {
          const userInvocable = data['user-invocable'] !== false;
          return {
            invocation: userInvocable ? `/${name}:${data.name}` : null,
            skill: {
              argumentHint: data['argument-hint'] ?? null,
              manualOnly: data['disable-model-invocation'] === true,
              userInvocable,
              allowedTools: splitList(data['allowed-tools']),
            },
            files: listFiles(skillDir).filter((f) => f !== 'SKILL.md'),
          };
        });
      }
    }

    const agentsDir = join(dir, 'agents');
    if (existsSync(agentsDir)) {
      for (const file of readdirSync(agentsDir).filter((f) => f.endsWith('.md')).sort()) {
        addArtifact('agent', join(agentsDir, file), (data) => ({
          invocation: `${name}:${data.name}`,
          agent: { tools: splitList(data.tools), skills: splitList(data.skills), model: data.model ?? null },
          files: [],
        }));
      }
    }

    plugins.push({
      id: pluginId,
      kind: 'plugin',
      name,
      version: manifest.version,
      description: manifest.description ?? entry.description ?? '',
      author: manifest.author?.name ?? marketplace.owner?.name ?? '',
      owners: codeowners.get(`/plugins/${name}`) ?? [],
      category: entry.category ?? null,
      keywords: manifest.keywords ?? [],
      dependencies: (manifest.dependencies ?? []).map((d) =>
        typeof d === 'string' ? { name: d, range: null } : { name: d.name, range: d.version ?? null },
      ),
      dependents: [],
      compatibility: parseCompatibility(readText(join(dir, 'COMPATIBILITY.md')) ?? ''),
      updated: changelog.map((r) => r.date).filter(Boolean).sort().at(-1) ?? null,
      installCommand: `/plugin install ${name}@${marketplace.name}`,
      sourcePath: `plugins/${name}/README.md`,
      githubUrl: '',
      counts,
      components,
      body: `bodies/${pluginId}.md`,
      searchText: stripMarkdown(readme),
    });
  }

  // Repository and links.
  if (repositories.size > 1) fail(`plugin manifests disagree on "repository": ${[...repositories].join(', ')}`);
  const repositoryUrl = [...repositories][0]?.replace(/\.git$/, '') ?? null;
  const repository = repoSlug(repositoryUrl);
  if (!repository && plugins.length) fail('no plugin manifest has a GitHub "repository" URL');
  const blob = (path) => (repositoryUrl ? `${repositoryUrl}/blob/${DEFAULT_BRANCH}/${path}` : null);
  const tree = (path) => (repositoryUrl ? `${repositoryUrl}/tree/${DEFAULT_BRANCH}/${path}` : null);

  const byName = new Map(plugins.map((p) => [p.name, p]));
  for (const p of plugins) {
    p.githubUrl = tree(`plugins/${p.name}`);
    for (const dep of p.dependencies) {
      const target = byName.get(dep.name);
      if (!target) fail(`plugins/${p.name}: dependency "${dep.name}" is not in this marketplace`);
      else target.dependents.push(p.name);
    }
  }
  for (const a of artifacts) {
    a.installCommand = byName.get(a.plugin).installCommand;
    a.githubUrl = blob(a.sourcePath);
  }

  releases.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || a.plugin.localeCompare(b.plugin));

  // Stats.
  const models = new Map();
  const tools = new Map();
  const keywords = new Map();
  for (const a of artifacts) {
    if (a.kind !== 'agent') continue;
    countInto(models, a.agent.model ?? 'inherit');
    a.agent.tools.forEach((t) => countInto(tools, t));
  }
  plugins.forEach((p) => p.keywords.forEach((k) => countInto(keywords, k)));
  const minimums = plugins.map((p) => p.compatibility.claudeCode).filter(Boolean).sort(compareVersions);
  const stats = {
    totals: {
      plugin: plugins.length,
      skill: artifacts.filter((a) => a.kind === 'skill').length,
      agent: artifacts.filter((a) => a.kind === 'agent').length,
      dependencyEdges: plugins.reduce((n, p) => n + p.dependencies.length, 0),
    },
    perPlugin: plugins.map((p) => ({
      name: p.name,
      version: p.version,
      skill: p.counts.skill,
      agent: p.counts.agent,
      dependsOn: p.dependencies.map((d) => d.name),
      usedBy: p.dependents,
      updated: p.updated,
    })),
    manualOnlySkills: artifacts.filter((a) => a.skill?.manualOnly).length,
    agentModels: Object.fromEntries(models),
    topAgentTools: topEntries(tools, 'tool', 10),
    topKeywords: topEntries(keywords, 'keyword', 12),
    minClaudeCode: minimums.at(-1) ?? null,
    latestRelease: releases[0]?.date ?? null,
  };

  const index = {
    marketplace: {
      name: marketplace.name,
      description: marketplace.description ?? '',
      owner: marketplace.owner?.name ?? '',
      repository,
      repositoryUrl,
      branch: DEFAULT_BRANCH,
      generatedAt: new Date().toISOString(),
      commit: currentCommit(root),
    },
    plugins,
    artifacts,
  };

  return { errors, index, releases, stats, bodies };
}

function listFiles(dir, base = dir) {
  return readdirSync(dir)
    .sort()
    .flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? listFiles(path, base) : [relative(base, path).split('\\').join('/')];
    });
}

function currentCommit(root) {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execSync('git rev-parse HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return null;
  }
}

function writeOutputs(outDir, { index, releases, stats, bodies }) {
  const bodiesDir = join(outDir, 'bodies');
  rmSync(bodiesDir, { recursive: true, force: true });
  mkdirSync(bodiesDir, { recursive: true });
  writeFileSync(join(outDir, 'index.json'), JSON.stringify(index));
  writeFileSync(join(outDir, 'releases.json'), JSON.stringify(releases));
  writeFileSync(join(outDir, 'stats.json'), JSON.stringify(stats));
  for (const [id, body] of bodies) writeFileSync(join(bodiesDir, `${id}.md`), body);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const root = resolve(fileURLToPath(import.meta.url), '..', '..');
  const result = buildIndex(root);
  if (result.errors.length) {
    console.error(`Index build failed with ${result.errors.length} problem(s):`);
    for (const e of result.errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  const outDir = join(root, 'site', 'public');
  writeOutputs(outDir, result);
  const { totals } = result.stats;
  console.log(
    `Index written to ${relative(root, outDir)}: ${totals.plugin} plugin(s), ${totals.skill} skill(s), ` +
      `${totals.agent} agent(s), ${result.releases.length} release(s).`,
  );
}
