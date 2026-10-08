#!/usr/bin/env bash
# Creates a restorable bundle of the current HEAD and proves restoration (review finding V02).
# Usage: scripts/make-bundle.sh <output-dir>
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:?usage: scripts/make-bundle.sh <output-dir>}"
mkdir -p "$OUT"
HEAD_SHA=$(git rev-parse HEAD)
SHORT=$(git rev-parse --short HEAD)
B="$OUT/table-$SHORT.bundle"
# Include HEAD as well as main, so a plain `git clone` has a checkout-able advertised HEAD.
git bundle create "$B" HEAD main
git bundle verify "$B" >/dev/null
( cd "$OUT" && sha256sum "$(basename "$B")" > "$(basename "$B").sha256" )
T=$(mktemp -d)
# Restore exactly as an owner would, with a default branch that is NOT main.
git -c init.defaultBranch=master clone -q "$B" "$T/plain"
git -c init.defaultBranch=master clone -q --branch main "$B" "$T/explicit"
for d in plain explicit; do
  got=$(git -C "$T/$d" rev-parse HEAD)
  [ "$got" = "$HEAD_SHA" ] || { echo "restore ($d) produced $got, expected $HEAD_SHA"; exit 1; }
  [ -f "$T/$d/package.json" ] || { echo "restore ($d) has no checked-out files"; exit 1; }
done
git -C "$T/plain" fsck --full >/dev/null
echo "bundle: $B"
echo "sha256: $(cut -d' ' -f1 "$B.sha256")"
echo "head:   $HEAD_SHA"
echo "restore verified: 'git clone $(basename "$B") table' and 'git clone --branch main $(basename "$B") table' both check out $HEAD_SHA"
rm -rf "$T"
