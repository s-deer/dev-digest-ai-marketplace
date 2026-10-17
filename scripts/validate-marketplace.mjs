#!/usr/bin/env node
// Repository-level checks that `claude plugin validate` does not cover:
// entry/manifest name agreement, CODEOWNERS coverage, required plugin documents,
// absolute paths and non-English text.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');
const errors = [];
const fail = (msg) => errors.push(msg);

const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    fail(`${relative(root, path)}: invalid JSON (${err.message})`);
    return null;
  }
};

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const REQUIRED_PLUGIN_DOCS = ['README.md', 'CHANGELOG.md', 'COMPATIBILITY.md'];

const marketplacePath = join(root, '.claude-plugin', 'marketplace.json');
const marketplace = existsSync(marketplacePath) ? readJson(marketplacePath) : null;
if (!marketplace) {
  fail('.claude-plugin/marketplace.json is missing or invalid');
} else {
  if (!marketplace.name) fail('marketplace.json: "name" is required');
  if (!marketplace.owner?.name) fail('marketplace.json: "owner.name" is required');
  if (!Array.isArray(marketplace.plugins)) fail('marketplace.json: "plugins" must be an array');
}

const codeownersPath = join(root, 'CODEOWNERS');
const codeowners = existsSync(codeownersPath)
  ? readFileSync(codeownersPath, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
  : [];
if (!existsSync(codeownersPath)) fail('CODEOWNERS is missing');

const seen = new Set();
for (const entry of marketplace?.plugins ?? []) {
  const label = `plugin "${entry.name}"`;
  if (!entry.name) { fail('a plugin entry has no "name"'); continue; }
  if (seen.has(entry.name)) fail(`${label}: duplicate entry`);
  seen.add(entry.name);

  const expectedSource = `./plugins/${entry.name}`;
  if (entry.source !== expectedSource) {
    fail(`${label}: source must be "${expectedSource}", got ${JSON.stringify(entry.source)}`);
  }

  const dir = join(root, 'plugins', entry.name);
  if (!existsSync(dir)) { fail(`${label}: directory plugins/${entry.name} does not exist`); continue; }

  const manifestPath = join(dir, '.claude-plugin', 'plugin.json');
  if (!existsSync(manifestPath)) {
    fail(`${label}: .claude-plugin/plugin.json is missing`);
  } else {
    const manifest = readJson(manifestPath);
    if (manifest) {
      if (manifest.name !== entry.name) {
        fail(`${label}: manifest name "${manifest.name}" differs from entry name`);
      }
      if (!manifest.version || !SEMVER.test(manifest.version)) {
        fail(`${label}: manifest "version" must be valid SemVer`);
      }
      for (const dep of manifest.dependencies ?? []) {
        const depName = typeof dep === 'string' ? dep : dep.name;
        const range = typeof dep === 'string' ? null : dep.version;
        if (!seen.has(depName) && !marketplace.plugins.some((p) => p.name === depName)) {
          fail(`${label}: dependency "${depName}" is not in this marketplace`);
        }
        if (!range) fail(`${label}: dependency "${depName}" has no version range`);
      }
    }
  }

  for (const doc of REQUIRED_PLUGIN_DOCS) {
    if (!existsSync(join(dir, doc))) fail(`${label}: ${doc} is missing`);
  }

  const covered = codeowners.some((line) => {
    const pattern = line.split(/\s+/)[0];
    return pattern === `/plugins/${entry.name}/` || pattern === `/plugins/${entry.name}`;
  });
  if (!covered) fail(`${label}: CODEOWNERS has no entry for /plugins/${entry.name}/`);
}

// Directories in plugins/ that are not registered.
const pluginsDir = join(root, 'plugins');
if (existsSync(pluginsDir)) {
  for (const name of readdirSync(pluginsDir)) {
    if (statSync(join(pluginsDir, name)).isDirectory() && !seen.has(name)) {
      fail(`plugins/${name} exists but is not listed in marketplace.json`);
    }
  }
}

// Text hygiene: absolute paths and non-English (Cyrillic) text.
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'tasks', 'temp']);
const TEXT_EXT = /\.(md|json|ya?ml|mjs|js|ts|tsx|sh|txt|css|html)$|CODEOWNERS$/;
const ABSOLUTE_PATH = /(\/Users\/[A-Za-z0-9._-]+|\/home\/[A-Za-z0-9._-]+|[A-Za-z]:\\Users\\)/;
const CYRILLIC = /[Ѐ-ӿ]/;

const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(path);
    } else if (TEXT_EXT.test(name) && name !== 'validate-marketplace.mjs') {
      const lines = readFileSync(path, 'utf8').split('\n');
      lines.forEach((line, i) => {
        const where = `${relative(root, path)}:${i + 1}`;
        if (ABSOLUTE_PATH.test(line)) fail(`${where}: absolute user path`);
        if (CYRILLIC.test(line)) fail(`${where}: non-English text`);
      });
    }
  }
};
walk(root);

if (errors.length) {
  console.error(`Validation failed with ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`Validation passed (${seen.size} plugin(s) checked).`);
