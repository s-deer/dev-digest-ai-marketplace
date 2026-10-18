#!/usr/bin/env bash
# Runs the fixed cost scenario (spec + plan for one small feature) once, headless, with the four
# marketplace plugins loaded from a marketplace checkout via --plugin-dir. Each run works in a fresh
# clone of the sandbox repository at a pinned commit, so runs never see each other's artifacts.
#
# Usage: scripts/cost/run-scenario.sh <label> <marketplace-root> <sandbox-repo> <sandbox-sha> <prompt-file> <out-dir>
#   <label>            run id, "<arm>-<n>" (for example base-1, opt-2); the arm is the part before "-"
#   <marketplace-root> directory that contains plugins/<name>/ for all four plugins
# Env: COST_MODEL (default sonnet), COST_MAX_BUDGET_USD (default 5)
# Output in <out-dir>: <label>.jsonl (stream-json), <label>.stderr, <label>.meta.json, <label>-work/ (the clone)
set -euo pipefail

if [ $# -ne 6 ]; then
  sed -n '2,12p' "$0" >&2
  exit 2
fi

label=$1
mkt=$(cd "$2" && pwd)
sandbox=$(cd "$3" && pwd)
sha=$4
prompt_file=$(cd "$(dirname "$5")" && pwd)/$(basename "$5")
mkdir -p "$6"
out=$(cd "$6" && pwd)
model=${COST_MODEL:-sonnet}
budget=${COST_MAX_BUDGET_USD:-5}
work="$out/$label-work"

rm -rf "$work"
git clone -q "$sandbox" "$work"
git -C "$work" checkout -q --detach "$sha"

plugins_hash=$(cd "$mkt/plugins" && find . -type f -not -path '*/evals/results/*' | LC_ALL=C sort | xargs shasum | shasum | cut -c1-12)
mkt_rev=$(git -C "$mkt" rev-parse --short HEAD 2>/dev/null || echo "snapshot")
cat > "$out/$label.meta.json" <<EOF
{"label":"$label","marketplaceRev":"$mkt_rev","pluginsHash":"$plugins_hash","sandboxSha":"$sha","model":"$model","maxBudgetUsd":$budget,"claudeVersion":"$(claude --version | head -1)","startedAt":"$(date -u +%Y-%m-%dT%H:%M:%SZ)"}
EOF

status=0
start_ms=$(node -p 'Date.now()')
(
  cd "$work"
  claude -p "$(cat "$prompt_file")" \
    --model "$model" \
    --setting-sources project \
    --plugin-dir "$mkt/plugins/engineering-paved-path" \
    --plugin-dir "$mkt/plugins/research-tools" \
    --plugin-dir "$mkt/plugins/architecture-review" \
    --plugin-dir "$mkt/plugins/sdd-engineering" \
    --permission-mode acceptEdits \
    --allowedTools "Read Glob Grep Write Edit Agent Skill Bash(git log:*) Bash(git show:*) Bash(git diff:*) Bash(git status:*) Bash(ls:*) Bash(wc:*) Bash(head:*)" \
    --max-budget-usd "$budget" \
    --output-format stream-json --verbose \
    > "$out/$label.jsonl" 2> "$out/$label.stderr"
) || status=$?
# result.duration_ms covers only the main thread; background subagents need wall-clock time.
wall_ms=$(( $(node -p 'Date.now()') - start_ms ))
node -e 'const f=process.argv[1];const m=JSON.parse(require("fs").readFileSync(f,"utf8"));m.wallMs=Number(process.argv[2]);m.exitCode=Number(process.argv[3]);require("fs").writeFileSync(f,JSON.stringify(m)+"\n")' "$out/$label.meta.json" "$wall_ms" "$status"

echo "$label: claude exit $status, output $out/$label.jsonl"
