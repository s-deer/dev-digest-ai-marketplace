import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  artifactId,
  buildIndex,
  compareVersions,
  parseChangelog,
  parseCodeowners,
  parseCompatibility,
  parseFrontmatter,
  repoSlug,
  splitList,
  stripMarkdown,
} from './build-index.mjs';

test('parseFrontmatter splits YAML data from the body', () => {
  const { data, body } = parseFrontmatter('---\nname: zod\ndescription: Schemas\n---\n# Title\n');
  assert.deepEqual(data, { name: 'zod', description: 'Schemas' });
  assert.equal(body, '# Title\n');
  assert.deepEqual(parseFrontmatter('no frontmatter').data, {});
});

test('splitList accepts comma strings and arrays', () => {
  assert.deepEqual(splitList('Read, Grep ,Glob'), ['Read', 'Grep', 'Glob']);
  assert.deepEqual(splitList(['a', ' b ']), ['a', 'b']);
  assert.deepEqual(splitList(undefined), []);
});

test('parseChangelog reads versions, dates, sections and continued items', () => {
  const md = [
    '# Changelog',
    '## [Unreleased]',
    '### Added',
    '- not released',
    '## [1.1.0] - 2026-11-01',
    '### Fixed',
    '- first line',
    '  continued',
    '## [1.0.0] - 2026-10-17',
    '### Added',
    '- initial',
  ].join('\n');
  assert.deepEqual(parseChangelog(md), [
    { version: '1.1.0', date: '2026-11-01', sections: { Fixed: ['first line continued'] } },
    { version: '1.0.0', date: '2026-10-17', sections: { Added: ['initial'] } },
  ]);
});

test('parseCompatibility extracts the Claude Code version and notes', () => {
  const md = '| Requirement | Version |\n|---|---|\n| Claude Code | >= 2.1.110 (note) |\n\n- Needs WebFetch.\n  More text.';
  assert.deepEqual(parseCompatibility(md), { claudeCode: '2.1.110', notes: ['Needs WebFetch. More text.'] });
});

test('parseCodeowners maps patterns without trailing slashes', () => {
  const owners = parseCodeowners('# comment\n/plugins/a/  @x @y\n/site/ @z\n');
  assert.deepEqual(owners.get('/plugins/a'), ['@x', '@y']);
  assert.deepEqual(owners.get('/site'), ['@z']);
});

test('stripMarkdown keeps prose and drops code and markup', () => {
  const md = '# Title\n\nUse **`zod`** with [links](x.md).\n\n```ts\nconst hidden = 1;\n```\n| a | b |';
  assert.equal(stripMarkdown(md), 'Title Use zod with links. a b');
});

test('small helpers', () => {
  assert.equal(artifactId('p', 'skill', 'zod'), 'p.skill.zod');
  assert.equal(repoSlug('https://github.com/owner/repo'), 'owner/repo');
  assert.equal(repoSlug('https://github.com/owner/repo.git'), 'owner/repo');
  assert.ok(compareVersions('2.1.110', '2.1.9') > 0);
});

test('buildIndex on this repository matches the plugin manifests', () => {
  const root = resolve(fileURLToPath(import.meta.url), '..', '..');
  const { errors, index, stats } = buildIndex(root);
  assert.deepEqual(errors, []);
  assert.equal(index.plugins.length, stats.totals.plugin);
  for (const plugin of index.plugins) {
    assert.match(plugin.installCommand, new RegExp(`^/plugin install ${plugin.name}@${index.marketplace.name}$`));
    for (const id of plugin.components) assert.ok(index.artifacts.some((a) => a.id === id), id);
  }
  const ids = [...index.plugins, ...index.artifacts].map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
});
