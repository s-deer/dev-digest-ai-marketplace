#!/usr/bin/env bash
# Create (and optionally push) the release tag for one plugin.
# Usage: scripts/release.sh <plugin-name> [--push]
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "usage: $0 <plugin-name> [--push]" >&2
  exit 2
fi

plugin="$1"
mode="${2:-}"
root="$(cd "$(dirname "$0")/.." && pwd)"
dir="$root/plugins/$plugin"

if [ ! -d "$dir" ]; then
  echo "unknown plugin: $plugin" >&2
  exit 1
fi

node "$root/scripts/validate-marketplace.mjs"
cd "$dir"

if [ "$mode" = "--push" ]; then
  claude plugin tag --push
else
  claude plugin tag --dry-run
  echo "Dry run only. Re-run with --push to create and push the tag."
fi
