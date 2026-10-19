#!/usr/bin/env bash
# Runs a plugin's eval suite with `claude plugin eval`, working around two limits of isolated eval runs
# (Claude Code 2.1.302):
#   1. Only the plugin under test is loaded. A plugin that declares `dependencies` then fails with
#      `dependency-unsatisfied` and none of its agents or skills load. This script evaluates a temporary
#      copy whose plugin.json has no `dependencies`; skills preloaded from dependencies are skipped with
#      a debug-log warning, so the cases test the plugin's own agents and skills.
#   2. Write is a gated tool: a case's `allowed_tools` does not grant it, the operator must
#      (--allow-tools Write).
#
# Usage: scripts/eval-plugin.sh <plugin-dir> [extra `claude plugin eval` options, e.g. --case <glob> --runs 1]
# Env:
#   EVAL_SUITE=<dir>  evaluate the cases in <dir> instead of <plugin-dir>/evals (for example the current
#                     suite against an older release of the plugin)
#   EVAL_JUDGE_MODEL  model for llm graders (default sonnet; the default haiku judge split votes on
#                     equivalent plans in plan-from-approved-spec)
#   EVAL_OUT=<dir>    where aggregate-result.json, result.json and report.html go
#                     (default: ./eval-results/<plugin>-<UTC timestamp>)
# Runs scaffold scripts (--scaffold) and trusts the plugin (--trust-plugin): use it only on plugins you trust.
set -euo pipefail

if [ $# -lt 1 ] || [ ! -f "$1/.claude-plugin/plugin.json" ]; then
  sed -n '2,21p' "$0" >&2
  exit 2
fi

src=$(cd "$1" && pwd)
shift
name=$(node -p 'require(process.argv[1]).name' "$src/.claude-plugin/plugin.json")
out=${EVAL_OUT:-"$PWD/eval-results/$name-$(date -u +%Y%m%dT%H%M%SZ)"}
mkdir -p "$out"
out=$(cd "$out" && pwd)

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
copy="$tmp/$name"
mkdir -p "$copy"
(cd "$src" && tar --exclude='./evals/results' -cf - .) | (cd "$copy" && tar -xf -)

node -e '
  const fs = require("fs");
  const file = process.argv[1];
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  const deps = (manifest.dependencies ?? []).map((d) => (typeof d === "string" ? d : d.name));
  delete manifest.dependencies;
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + "\n");
  if (deps.length) console.error(`eval-plugin: dropped dependencies for the eval copy: ${deps.join(", ")}`);
' "$copy/.claude-plugin/plugin.json"

if [ -n "${EVAL_SUITE:-}" ]; then
  suite=$(cd "$EVAL_SUITE" && pwd)
  rm -rf "$copy/evals"
  mkdir -p "$copy/evals"
  (cd "$suite" && tar --exclude='./results' -cf - .) | (cd "$copy/evals" && tar -xf -)
  echo "eval-plugin: using the eval suite from $suite" >&2
fi

version=$(node -p 'require(process.argv[1]).version' "$copy/.claude-plugin/plugin.json")
echo "eval-plugin: $name $version -> $out" >&2

status=0
claude plugin eval "$copy" \
  --ablation none \
  --trust-plugin \
  --scaffold \
  --allow-tools Write \
  --judge-model "${EVAL_JUDGE_MODEL:-sonnet}" \
  --output-dir "$out" \
  --json "$out/result.json" \
  "$@" || status=$?

[ -f "$out/aggregate-result.json" ] && node -e '
  const a = require(process.argv[1]);
  for (const c of a.cases) {
    const runs = c.arms.with ?? [];
    const passed = runs.filter((r) => r.passed).length;
    console.log(`${passed === runs.length ? "PASS" : "FAIL"}  ${c.name}  ${passed}/${runs.length}`);
  }
  const g = a.aggregates ?? {};
  console.log(`cases ${g.casesPassed}/${g.casesTotal}, cost $${(a.costUsd ?? 0).toFixed(2)}`);
' "$out/aggregate-result.json" || true

exit "$status"
