#!/usr/bin/env node
// Deterministic quality gate for one cost-scenario run.
// Usage: node scripts/cost/check-run.mjs <run.jsonl> <work-dir>
// Prints a JSON verdict: { gate: "PASS"|"FAIL", critical: [...], warnings: [...], spec, plan }.
// A run is successful only when there are no critical findings.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const [jsonlPath, workDir] = process.argv.slice(2);
if (!jsonlPath || !workDir) {
  console.error('Usage: node scripts/cost/check-run.mjs <run.jsonl> <work-dir>');
  process.exit(2);
}

const critical = [];
const warnings = [];

// --- Run-level checks (stream-json events) ---------------------------------------------------
const events = readFileSync(jsonlPath, 'utf8').split('\n').filter(Boolean).flatMap((l) => {
  try { return [JSON.parse(l)]; } catch { return []; }
});
const result = events.find((e) => e.type === 'result');
if (!result) critical.push('run: no result event (crashed or killed)');
else if (result.is_error || result.subtype !== 'success') critical.push(`run: ended with ${result.subtype}${result.is_error ? ' (is_error)' : ''}`);

const agentCalls = events
  .filter((e) => e.type === 'assistant' && Array.isArray(e.message?.content))
  .flatMap((e) => e.message.content)
  .filter((c) => c.type === 'tool_use' && (c.name === 'Agent' || c.name === 'Task'))
  .map((c) => String(c.input?.subagent_type ?? ''));
for (const agent of ['sdd-engineering:spec-creator', 'sdd-engineering:implementation-planner']) {
  if (!agentCalls.includes(agent)) critical.push(`run: ${agent} was not called`);
}

// --- Artifacts: only files the run created ---------------------------------------------------
const untracked = execFileSync('git', ['-C', workDir, 'ls-files', '--others', '--exclude-standard'], { encoding: 'utf8' })
  .split('\n').filter(Boolean);
const changed = execFileSync('git', ['-C', workDir, 'diff', '--name-only'], { encoding: 'utf8' })
  .split('\n').filter(Boolean);
const specs = untracked.filter((f) => /^specs\/[^/]+\.md$/.test(f));
const plans = untracked.filter((f) => /^docs\/plans\/[^/]+\.md$/.test(f));
const codeChanges = [...untracked, ...changed].filter((f) => /^src\//.test(f));
if (specs.length !== 1) critical.push(`spec: expected exactly 1 new spec in specs/, found ${specs.length}`);
if (plans.length !== 1) critical.push(`plan: expected exactly 1 new plan in docs/plans/, found ${plans.length}`);
if (codeChanges.length) critical.push(`scope: source files changed although the scenario stops at the plan: ${codeChanges.join(', ')}`);

const ids = (text, prefix) => new Set([...text.matchAll(new RegExp(`\\b${prefix}-(\\d+)\\b`, 'g'))].map((m) => Number(m[1])));

// Expands "AC-1..AC-5", "AC-1–AC-5", "AC-1 to AC-5" and "AC-1..5" into every id in the range.
function referencedAcs(text) {
  const found = ids(text, 'AC');
  const range = /\bAC-(\d+)\s*(?:\.\.\.?|…|–|—|\bto\b|-)\s*(?:AC-)?(\d+)\b/g;
  for (const m of text.matchAll(range)) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (b > a && b - a < 200) for (let i = a; i <= b; i++) found.add(i);
  }
  return found;
}

let specAcs = new Set();
const specInfo = {};
if (specs.length === 1) {
  const spec = readFileSync(join(workDir, specs[0]), 'utf8');
  specInfo.path = specs[0];
  if (!/status:?\**\s*approved/i.test(spec)) critical.push('spec: status is not approved');
  if (/\[NEEDS CLARIFICATION/i.test(spec)) critical.push('spec: contains [NEEDS CLARIFICATION]');

  const stories = [...spec.matchAll(/\*\*US-(\d+)\*\*/g)].map((m) => Number(m[1]));
  const acLines = [...spec.matchAll(/^\s*[-*]?\s*\*\*AC-(\d+)\*\*(.*)$/gm)]
    .map((m) => ({ id: Number(m[1]), rest: m[2] }))
    .filter((ac) => !/\(removed\)/i.test(ac.rest));
  specAcs = new Set(acLines.map((ac) => ac.id));
  specInfo.userStories = new Set(stories).size;
  specInfo.acceptanceCriteria = specAcs.size;

  if (!stories.length) critical.push('spec: no user stories (US-n)');
  if (!acLines.length) critical.push('spec: no acceptance criteria (AC-n)');
  for (const us of new Set(stories)) {
    if (!acLines.some((ac) => new RegExp(`\\bUS-${us}\\b`).test(ac.rest))) critical.push(`spec: US-${us} has no acceptance criterion`);
  }
  for (const ac of acLines) {
    if (!/\bshall\b/i.test(ac.rest)) critical.push(`spec: AC-${ac.id} is not an EARS "shall" statement`);
  }
  // Heuristics only: a spec says WHAT, not HOW.
  if (/`?\bsrc\/[\w./-]+/.test(spec)) warnings.push('spec: mentions source paths (src/...)');
  if (/^```/m.test(spec)) warnings.push('spec: contains a code block');
  if (/\bnpm\b|\bpackage\.json\b/.test(spec)) warnings.push('spec: mentions npm/package.json');
}

const planInfo = {};
if (plans.length === 1) {
  const plan = readFileSync(join(workDir, plans[0]), 'utf8');
  planInfo.path = plans[0];
  const steps = plan.split(/^(?=###\s+S\d+\b)/m).filter((s) => /^###\s+S\d+\b/.test(s));
  planInfo.steps = steps.length;
  if (!steps.length) critical.push('plan: no steps (### S1 ...)');
  for (const step of steps) {
    const name = step.match(/^###\s+(S\d+)/)[1];
    if (!/\b(AC|NFR|EC)-\d+\b/.test(step)) critical.push(`plan: ${name} references no AC/NFR/EC`);
  }
  const planAcs = referencedAcs(plan);
  const uncovered = [...specAcs].filter((id) => !planAcs.has(id));
  const invented = [...planAcs].filter((id) => specAcs.size && !specAcs.has(id));
  if (uncovered.length) critical.push(`plan: AC not covered: ${uncovered.map((i) => `AC-${i}`).join(', ')}`);
  if (invented.length) critical.push(`plan: AC ids not in the spec: ${invented.map((i) => `AC-${i}`).join(', ')}`);
}

console.log(JSON.stringify({ gate: critical.length ? 'FAIL' : 'PASS', critical, warnings, spec: specInfo, plan: planInfo }, null, 2));
