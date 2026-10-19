#!/usr/bin/env node
// Summarizes cost-scenario runs produced by run-scenario.sh.
// Usage: node scripts/cost/summarize.mjs <out-dir>
// For every <label>.jsonl in <out-dir>: runs check-run.mjs on <label>-work, extracts cost, tokens,
// calls and latency, writes <out-dir>/runs.csv and <out-dir>/summary.json, and prints per-arm stats.
// The arm is the part of the label before the first "-" (base-1 -> base).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = process.argv[2];
if (!outDir) {
  console.error('Usage: node scripts/cost/summarize.mjs <out-dir>');
  process.exit(2);
}
const here = dirname(fileURLToPath(import.meta.url));

function readEvents(file) {
  return readFileSync(file, 'utf8').split('\n').filter(Boolean).flatMap((l) => {
    try { return [JSON.parse(l)]; } catch { return []; }
  });
}

// Session transcripts live in ~/.claude/projects/<mangled cwd>/<session id>/.
function findSessionDir(sessionId) {
  if (!sessionId) return null;
  const root = join(homedir(), '.claude', 'projects');
  for (const project of readdirSync(root)) {
    const dir = join(root, project, sessionId);
    if (existsSync(dir)) return dir;
  }
  return null;
}

// Fallback for runs recorded before the runner stored wallMs: jsonl mtime minus start time.
function wallFromFiles(label, meta) {
  if (!meta.startedAt) return null;
  return statSync(join(outDir, `${label}.jsonl`)).mtimeMs - Date.parse(meta.startedAt);
}

const emptyUsage = () => ({ input: 0, output: 0, cacheWrite: 0, cacheRead: 0 });
function addUsage(acc, u = {}) {
  acc.input += u.input_tokens ?? 0;
  acc.output += u.output_tokens ?? 0;
  acc.cacheWrite += u.cache_creation_input_tokens ?? 0;
  acc.cacheRead += u.cache_read_input_tokens ?? 0;
  return acc;
}

function summarizeRun(label) {
  const events = readEvents(join(outDir, `${label}.jsonl`));
  const result = events.find((e) => e.type === 'result') ?? {};
  const init = events.find((e) => e.type === 'system' && e.subtype === 'init') ?? {};

  // One API call = one assistant message id; stream-json repeats a message once per content block.
  const messages = new Map();
  const toolCalls = {};
  const agentIds = new Map(); // tool_use id -> subagent type
  let toolErrors = 0;
  for (const e of events) {
    if (e.type === 'assistant' && e.message) {
      messages.set(e.message.id, { usage: e.message.usage, parent: e.parent_tool_use_id ?? null, model: e.message.model });
      for (const c of e.message.content ?? []) {
        if (c.type !== 'tool_use') continue;
        toolCalls[c.name] = (toolCalls[c.name] ?? 0) + 1;
        if (c.name === 'Agent' || c.name === 'Task') agentIds.set(c.id, String(c.input?.subagent_type ?? '?'));
      }
    }
    if (e.type === 'user' && Array.isArray(e.message?.content)) {
      for (const c of e.message.content) if (c.type === 'tool_result' && c.is_error) toolErrors += 1;
    }
  }

  // Per-agent token totals. Streamed subagent messages carry only start-of-message usage, so the
  // subagent totals come from their transcripts (<projects>/<cwd>/<session>/subagents/*.jsonl).
  const perAgent = { main: { calls: 0, ...emptyUsage() } };
  for (const m of messages.values()) {
    if (m.parent) continue;
    perAgent.main.calls += 1;
    addUsage(perAgent.main, m.usage);
  }
  const sessionDir = findSessionDir(result.session_id);
  const subDir = sessionDir && join(sessionDir, 'subagents');
  if (subDir && existsSync(subDir)) {
    for (const f of readdirSync(subDir).filter((n) => n.endsWith('.meta.json'))) {
      const agentMeta = JSON.parse(readFileSync(join(subDir, f), 'utf8'));
      const transcript = join(subDir, f.replace(/\.meta\.json$/, '.jsonl'));
      if (!existsSync(transcript)) continue;
      const usageById = new Map();
      for (const e of readEvents(transcript)) if (e.type === 'assistant' && e.message?.usage) usageById.set(e.message.id, e.message.usage);
      const key = agentMeta.agentType ?? 'subagent:?';
      perAgent[key] ??= { calls: 0, ...emptyUsage(), firstCallContext: 0 };
      perAgent[key].calls += usageById.size;
      const first = [...usageById.values()][0];
      if (first) perAgent[key].firstCallContext = (first.input_tokens ?? 0) + (first.cache_creation_input_tokens ?? 0) + (first.cache_read_input_tokens ?? 0);
      for (const u of usageById.values()) addUsage(perAgent[key], u);
    }
  }
  const apiCallsTotal = Object.values(perAgent).reduce((a, b) => a + b.calls, 0);

  const gate = JSON.parse(execFileSync('node', [join(here, 'check-run.mjs'), join(outDir, `${label}.jsonl`), join(outDir, `${label}-work`)], { encoding: 'utf8' }));
  const meta = existsSync(join(outDir, `${label}.meta.json`)) ? JSON.parse(readFileSync(join(outDir, `${label}.meta.json`), 'utf8')) : {};
  const planner = perAgent['sdd-engineering:implementation-planner'] ?? emptyUsage();
  const skillsLoadedByPlanner = events
    .filter((e) => e.type === 'assistant' && agentIds.get(e.parent_tool_use_id) === 'sdd-engineering:implementation-planner')
    .flatMap((e) => e.message.content ?? [])
    .filter((c) => c.type === 'tool_use' && c.name === 'Skill')
    .map((c) => c.input?.skill);

  return {
    label,
    arm: label.split('-')[0],
    pluginsHash: meta.pluginsHash ?? '',
    costUsd: result.total_cost_usd ?? null,
    durationMs: meta.wallMs ?? wallFromFiles(label, meta),
    mainThreadMs: result.duration_ms ?? null,
    durationApiMs: result.duration_api_ms ?? null,
    turns: result.num_turns ?? null,
    ...Object.fromEntries(Object.entries(addUsage(emptyUsage(), result.usage)).map(([k, v]) => [`main_${k}`, v])),
    models: Object.fromEntries(Object.entries(result.modelUsage ?? {}).map(([m, u]) => [m, { costUsd: u.costUSD, input: u.inputTokens, output: u.outputTokens, cacheRead: u.cacheReadInputTokens, cacheWrite: u.cacheCreationInputTokens }])),
    apiCalls: apiCallsTotal,
    toolCalls,
    toolCallsTotal: Object.values(toolCalls).reduce((a, b) => a + b, 0),
    toolErrors,
    permissionDenials: (result.permission_denials ?? []).length,
    perAgent,
    plannerInput: planner.input + planner.cacheWrite + planner.cacheRead,
    plannerOutput: planner.output,
    plannerCalls: planner.calls ?? 0,
    plannerFirstCallContext: planner.firstCallContext ?? 0,
    opusCostUsd: Object.entries(result.modelUsage ?? {}).filter(([m]) => /opus/.test(m)).reduce((a, [, u]) => a + (u.costUSD ?? 0), 0),
    sonnetCostUsd: Object.entries(result.modelUsage ?? {}).filter(([m]) => /sonnet/.test(m)).reduce((a, [, u]) => a + (u.costUSD ?? 0), 0),
    skillsLoadedByPlanner,
    plugins: (init.plugins ?? []).map((p) => p.name ?? p),
    gate: gate.gate,
    critical: gate.critical,
    warnings: gate.warnings,
    specAcs: gate.spec.acceptanceCriteria ?? 0,
    planSteps: gate.plan.steps ?? 0,
  };
}

const labels = readdirSync(outDir).filter((f) => f.endsWith('.jsonl')).map((f) => f.slice(0, -'.jsonl'.length)).sort();
const runs = labels.map(summarizeRun);

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
const p95 = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.ceil(0.95 * s.length) - 1] : null; }; // nearest rank
const arms = {};
for (const arm of [...new Set(runs.map((r) => r.arm))]) {
  const rs = runs.filter((r) => r.arm === arm);
  const costs = rs.map((r) => r.costUsd ?? 0);
  const ok = rs.filter((r) => r.gate === 'PASS').length;
  const total = costs.reduce((a, b) => a + b, 0);
  arms[arm] = {
    runs: rs.length,
    passed: ok,
    passRate: ok / rs.length,
    totalCostUsd: total,
    costPerSuccessfulWorkflowUsd: ok ? total / ok : null,
    medianCostUsd: median(costs),
    p95CostUsd: p95(costs),
    minCostUsd: Math.min(...costs),
    maxCostUsd: Math.max(...costs),
    medianDurationS: median(rs.map((r) => r.durationMs / 1000)),
    p95DurationS: p95(rs.map((r) => r.durationMs / 1000)),
    medianApiCalls: median(rs.map((r) => r.apiCalls)),
    medianToolCalls: median(rs.map((r) => r.toolCallsTotal)),
    medianPlannerInputTokens: median(rs.map((r) => r.plannerInput)),
    medianPlannerOutputTokens: median(rs.map((r) => r.plannerOutput)),
    medianPlannerFirstCallContext: median(rs.map((r) => r.plannerFirstCallContext)),
    medianSonnetCostUsd: median(rs.map((r) => r.sonnetCostUsd)),
    medianOpusCostUsd: median(rs.map((r) => r.opusCostUsd)),
  };
}

const columns = ['label', 'arm', 'pluginsHash', 'costUsd', 'durationMs', 'durationApiMs', 'turns', 'apiCalls', 'toolCallsTotal', 'toolErrors', 'permissionDenials', 'main_input', 'main_output', 'main_cacheWrite', 'main_cacheRead', 'plannerInput', 'plannerOutput', 'plannerCalls', 'plannerFirstCallContext', 'sonnetCostUsd', 'opusCostUsd', 'mainThreadMs', 'specAcs', 'planSteps', 'gate'];
const csv = [columns.join(','), ...runs.map((r) => columns.map((c) => r[c] ?? '').join(','))].join('\n');
writeFileSync(join(outDir, 'runs.csv'), csv + '\n');
writeFileSync(join(outDir, 'summary.json'), JSON.stringify({ runs, arms }, null, 2));

console.table(runs.map((r) => ({ label: r.label, cost: r.costUsd?.toFixed(3), dur_s: Math.round(r.durationMs / 1000), api: r.apiCalls, tools: r.toolCallsTotal, planner_in: r.plannerInput, planner_out: r.plannerOutput, planner_ctx1: r.plannerFirstCallContext, sonnet: r.sonnetCostUsd.toFixed(3), opus: r.opusCostUsd.toFixed(3), gate: r.gate })));
console.log(JSON.stringify(arms, null, 2));
for (const r of runs) {
  if (r.critical.length) console.log(`${r.label} critical: ${r.critical.join(' | ')}`);
  if (r.warnings.length) console.log(`${r.label} warnings: ${r.warnings.join(' | ')}`);
}
