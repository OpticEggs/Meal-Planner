#!/usr/bin/env bash
# Clean-tree verification of the Recipe Extraction Lab at one commit. Writes logs to $OUT.
set -u
ROOT=/home/user/Meal-Planner; OUT=$1; mkdir -p "$OUT"; cd "$ROOT"
step() { local name=$1; shift; local t0=$(date +%s); ( "$@" ) > "$OUT/$name.log" 2>&1; local rc=$?; echo "$name exit=$rc seconds=$(( $(date +%s) - t0 ))" | tee -a "$OUT/steps.txt"; }
{ echo "commit $(git rev-parse HEAD)"; echo "status-porcelain-lines $(git status --porcelain | wc -l)"; node --version; npm --version; date -u +%Y-%m-%dT%H:%M:%SZ; } > "$OUT/identity.txt"
SRC_BEFORE=$(git ls-files -s | sha256sum | cut -c1-16)
step pkg-typecheck bash -c "cd packages/recipe-extraction && npm run -s typecheck"
step pkg-test bash -c "cd packages/recipe-extraction && npx vitest run --config vitest.config.ts --reporter=verbose"
step pkg-bench-1 bash -c "cd packages/recipe-extraction && npm run -s bench -- --pages --out-json $OUT/benchmark-report.json --out-md $OUT/benchmark-report.md"
step pkg-bench-2 bash -c "cd packages/recipe-extraction && npm run -s bench -- --pages --out-json $OUT/benchmark-report.rerun.json"
step bench-deterministic cmp "$OUT/benchmark-report.json" "$OUT/benchmark-report.rerun.json"
step root-typecheck npm run -s typecheck
step root-parser-tests npx vitest run tests/unit/recipe-import-ingredient-line.test.ts tests/unit/recipe-import-ingredient-suggest.test.ts tests/unit/recipe-import-jsonld.test.ts tests/unit/recipe-import-extract-details.test.ts tests/unit/recipe-import-url.test.ts
step root-u2c-integration bash -c "DATABASE_URL=postgres://table@127.0.0.1:54329/table_test npx tsx scripts/migrate.ts && npx vitest run tests/integration/u2c-url-import.test.ts"
step root-vitest-excludes-package bash -c "n=\$(npx vitest list --filesOnly 2>/dev/null | grep -c packages/); echo package-files-in-root-vitest=\$n; test \$n -eq 0"
step next-build npx next build
SRC_AFTER=$(git ls-files -s | sha256sum | cut -c1-16)
echo "index-hash before=$SRC_BEFORE after=$SRC_AFTER status-porcelain-lines-after=$(git status --porcelain | wc -l)" >> "$OUT/identity.txt"
rm -f "$OUT/benchmark-report.rerun.json"
