#!/usr/bin/env bash
# trail: an append-only log of decisions and friction, one TSV per repo, outside the repo.
#   trail.sh tags                                         tags in use, most used first
#   trail.sh friction TAG WHAT WHY EVIDENCE [MINUTES] [FIX]
#   trail.sh decision TAG WHAT WHY EVIDENCE
# File: ${XDG_STATE_HOME:-~/.local/state}/trail/<repo>-<sha1 of repo path, 8>.tsv
# Columns: ts kind tag what why evidence cost_min fix
set -euo pipefail
common=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null) && repo=$(cd "$common/.." && pwd -P) || repo=$(pwd -P)
hash=$(printf %s "$repo" | { shasum 2>/dev/null || sha1sum; } | cut -c1-8)
dir="${XDG_STATE_HOME:-$HOME/.local/state}/trail"
file="$dir/$(basename "$repo")-$hash.tsv"
clean() { printf %s "$1" | tr '\t\n\r' '   '; }

case "${1:-}" in
  tags)
    [ -f "$file" ] && tail -n +2 "$file" | cut -f2,3 | sort | uniq -c | sort -rn || echo "no trail yet: $file"
    ;;
  friction|decision)
    [ $# -ge 5 ] || { sed -n '3,5p' "$0" >&2; exit 2; }
    min="${6:-0}"; [[ "$min" =~ ^[0-9]+$ ]] || { echo "MINUTES must be a whole number" >&2; exit 2; }
    mkdir -p "$dir"
    [ -s "$file" ] || printf 'ts\tkind\ttag\twhat\twhy\tevidence\tcost_min\tfix\n' > "$file"
    printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1" "$(clean "$2")" "$(clean "$3")" "$(clean "$4")" "$(clean "$5")" "$min" "$(clean "${7:-}")" >> "$file"
    echo "$file"
    ;;
  *) sed -n '2,7p' "$0" >&2; exit 2 ;;
esac
