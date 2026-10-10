#!/usr/bin/env bash
# Restorable bundle of the lab branch (coordinator, Phase 2B). Usage: make-lab-bundle.sh <output-dir>
# scripts/make-bundle.sh is the app's script and assumes the work is on `main` (it bundles HEAD + main and expects
# both to restore to HEAD). The lab branch is not main, so this bundles the lab branch (as HEAD and by name) together
# with origin/main as `main`, and proves that each restores to the right commit with a full fsck. Needs a full
# (non-shallow) clone.
set -euo pipefail
cd /home/user/Meal-Planner
OUT="${1:?usage: make-lab-bundle.sh <output-dir>}"; mkdir -p "$OUT"
LAB=claude/quirky-gauss-depmd8
[ "$(git rev-parse --is-shallow-repository)" = false ] || { echo "shallow clone: run git fetch --unshallow origin first"; exit 1; }
[ "$(git rev-parse --abbrev-ref HEAD)" = "$LAB" ] || { echo "check out $LAB first"; exit 1; }
HEAD_SHA=$(git rev-parse HEAD); MAIN_SHA=$(git rev-parse origin/main); SHORT=$(git rev-parse --short HEAD)
git branch -f main "$MAIN_SHA" >/dev/null   # local main = the real main, never the lab head
B="$OUT/meal-planner-lab-$SHORT.bundle"
git bundle create "$B" HEAD "$LAB" main
git bundle verify "$B" >/dev/null
( cd "$OUT" && sha256sum "$(basename "$B")" > "$(basename "$B").sha256" )
T=$(mktemp -d)
git -c init.defaultBranch=master clone -q "$B" "$T/plain"
git -c init.defaultBranch=master clone -q --branch "$LAB" "$B" "$T/lab"
git -c init.defaultBranch=master clone -q --branch main "$B" "$T/main"
[ "$(git -C "$T/plain" rev-parse HEAD)" = "$HEAD_SHA" ] || { echo "plain clone is not $HEAD_SHA"; exit 1; }
[ "$(git -C "$T/lab" rev-parse HEAD)" = "$HEAD_SHA" ] || { echo "lab clone is not $HEAD_SHA"; exit 1; }
[ "$(git -C "$T/main" rev-parse HEAD)" = "$MAIN_SHA" ] || { echo "main clone is not $MAIN_SHA"; exit 1; }
[ -f "$T/lab/packages/recipe-extraction/fixtures/FREEZE-v3.json" ] || { echo "lab clone lacks the holdout-v3 freeze"; exit 1; }
git -C "$T/lab" fsck --full >/dev/null
echo "bundle: $B"
echo "sha256: $(cut -d' ' -f1 "$B.sha256")"
echo "lab head: $HEAD_SHA ($LAB)"
echo "main:     $MAIN_SHA"
echo "restore verified: 'git clone $(basename "$B") lab' and 'git clone --branch $LAB $(basename "$B") lab' check out the lab head; 'git clone --branch main' checks out main; fsck --full clean"
rm -rf "$T"
