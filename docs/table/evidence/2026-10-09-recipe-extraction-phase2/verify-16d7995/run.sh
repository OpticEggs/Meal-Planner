#!/usr/bin/env bash
# Phase 2 clean-tree verification at one commit (coordinator). Logs to $1.
set -u
ROOT=/home/user/Meal-Planner; OUT=$1; mkdir -p "$OUT"; cd "$ROOT"
step() { local name=$1; shift; local t0=$(date +%s); ( "$@" ) > "$OUT/$name.log" 2>&1; local rc=$?; echo "$name exit=$rc seconds=$(( $(date +%s) - t0 ))" | tee -a "$OUT/steps.txt"; }
{ echo "commit $(git rev-parse HEAD)"; echo "status-porcelain-lines $(git status --porcelain | wc -l)"; echo "origin/main $(git rev-parse origin/main)"; node --version; date -u +%Y-%m-%dT%H:%M:%SZ; } > "$OUT/identity.txt"
IDX0=$(git ls-files -s | sha256sum | cut -c1-16)
P=packages/recipe-extraction
step pkg-typecheck bash -c "cd $P && npm run -s typecheck"
step pkg-test bash -c "cd $P && npx vitest run --config vitest.config.ts"
step pkg-bench-default-split bash -c "cd $P && npm run -s bench -- --out-json $OUT/bench-default.json > $OUT/bench-default.stdout 2>&1; grep -c 'holdout2' $OUT/bench-default.stdout; ! grep -q 'holdout2' $OUT/bench-default.stdout"
step pkg-bench-every-1 bash -c "cd $P && npm run -s bench -- --split every --pages --out-json $OUT/bench-every.json"
step pkg-bench-every-2 bash -c "cd $P && npm run -s bench -- --split every --pages --out-json $OUT/bench-every.rerun.json"
step bench-deterministic cmp "$OUT/bench-every.json" "$OUT/bench-every.rerun.json"
step cli-line bash -c "cd $P && npx tsx bin/recipe-lab.ts line '1/3 cup pesto (homemade (or store-bought))' --engine semantic-v1 && npx tsx bin/recipe-lab.ts line '1-1/2 cups milk' --engine semantic-v1 && npx tsx bin/recipe-lab.ts engines"
step cli-refuses-url bash -c "cd $P && ! npx tsx bin/recipe-lab.ts page https://example.com/x --final-url https://example.com/x"
step app-does-not-import-package bash -c "! grep -rn -E 'recipe-extraction|@table/recipe-extraction' src scripts next.config.ts tsconfig.json package.json vitest.config.ts playwright.config.ts && echo 'no reference to the package in app code or root config'"
step app-code-equals-main bash -c "git diff --stat origin/main HEAD -- src migrations scripts deploy tests package.json package-lock.json tsconfig.json next.config.ts vitest.config.ts playwright.config.ts .env.example | tee /dev/stderr | wc -l | grep -qx 0 && echo 'app code, migrations, scripts, deploy templates, root config identical to origin/main'"
step root-typecheck npm run -s typecheck
step root-vitest-excludes-package bash -c "n=\$(npx vitest list --filesOnly 2>/dev/null | grep -c packages/); echo package-files-in-root-vitest=\$n; test \$n -eq 0"
step root-vitest-full bash -c "scripts/db.sh start && DATABASE_URL=postgres://table@127.0.0.1:54329/table_test npx tsx scripts/migrate.ts && npx vitest run"
step next-build-clean bash -c "rm -rf .next && npx next build"
IDX1=$(git ls-files -s | sha256sum | cut -c1-16)
echo "index-hash before=$IDX0 after=$IDX1 status-porcelain-lines-after=$(git status --porcelain | wc -l)" >> "$OUT/identity.txt"
rm -f "$OUT/bench-every.rerun.json"
