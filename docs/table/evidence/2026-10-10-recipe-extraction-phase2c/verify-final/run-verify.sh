#!/usr/bin/env bash
# Phase 2C verification at one commit (coordinator). Usage: run-verify.sh <out-dir> <main-sha>
set -u
OUT=$1; MAIN=$2; ROOT=/home/user/Meal-Planner; P=packages/recipe-extraction; mkdir -p "$OUT"; cd "$ROOT"
step() { local name=$1; shift; local t0=$(date +%s); ( "$@" ) > "$OUT/$name.log" 2>&1; local rc=$?; echo "$name exit=$rc seconds=$(( $(date +%s) - t0 ))" | tee -a "$OUT/steps.txt"; }
{ echo "commit $(git rev-parse HEAD)"; echo "status-porcelain-lines $(git status --porcelain | wc -l)"; echo "main $MAIN"; node --version; date -u +%Y-%m-%dT%H:%M:%SZ; } > "$OUT/identity.txt"
IDX0=$(git ls-files -s | sha256sum | cut -c1-16)
step pkg-typecheck bash "$ROOT/docs/table/evidence/2026-10-10-recipe-extraction-phase2c/verify-final/sub.sh" typecheck
step pkg-test-verbose bash "$ROOT/docs/table/evidence/2026-10-10-recipe-extraction-phase2c/verify-final/sub.sh" test
step frozen-unchanged git diff --stat --exit-code 1d312a84af781b20cdcf1203aa9e4de0a97f0d5e HEAD -- $P/src/ingredient/semantic $P/src/ingredient/semantic-v2 $P/src/legacy $P/bench $P/fixtures $P/tests/semantic $P/tests/semantic-v2 $P/tests/parity $P/tests/regressions/exposed-regressions-2b.jsonl $P/tests/regressions/semantic-v2-regressions.test.ts docs/table/recipe-extraction/EVALUATION-PLAN-v3.md
step bench-every bash "$ROOT/docs/table/evidence/2026-10-10-recipe-extraction-phase2c/verify-final/sub.sh" every "$OUT"
step holdout3-equivalence bash "$ROOT/docs/table/evidence/2026-10-10-recipe-extraction-phase2c/verify-final/sub.sh" h3 "$OUT"
step cli bash "$ROOT/docs/table/evidence/2026-10-10-recipe-extraction-phase2c/verify-final/sub.sh" cli
step boundary bash docs/table/evidence/2026-10-10-recipe-extraction-phase2b/verify-final/boundary-checks.sh HEAD "$MAIN"
step app-does-not-import-package bash "$ROOT/docs/table/evidence/2026-10-10-recipe-extraction-phase2c/verify-final/sub.sh" noimport
step mutations bash "$ROOT/docs/table/evidence/2026-10-10-recipe-extraction-phase2c/verify-final/sub.sh" mutations "$OUT"
step root-typecheck npm run -s typecheck
step root-vitest bash "$ROOT/docs/table/evidence/2026-10-10-recipe-extraction-phase2c/verify-final/sub.sh" rootvitest
step next-build bash "$ROOT/docs/table/evidence/2026-10-10-recipe-extraction-phase2c/verify-final/sub.sh" build
IDX1=$(git ls-files -s | sha256sum | cut -c1-16)
echo "index-hash before=$IDX0 after=$IDX1 status-porcelain-lines-after=$(git status --porcelain | wc -l)" >> "$OUT/identity.txt"
