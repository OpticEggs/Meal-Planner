#!/usr/bin/env bash
# Phase 2B clean-tree verification at the tested commit (coordinator). Logs to $1.
# The package typecheck, package tests and the mutation run are logged separately (pkg-*.log, mutations*).
set -u
ROOT=/home/user/Meal-Planner; OUT=$1; mkdir -p "$OUT"; cd "$ROOT"
step() { local name=$1; shift; local t0=$(date +%s); ( "$@" ) > "$OUT/$name.log" 2>&1; local rc=$?; echo "$name exit=$rc seconds=$(( $(date +%s) - t0 ))" | tee -a "$OUT/steps.txt"; }
{ echo "commit $(git rev-parse HEAD)"; echo "status-porcelain-lines $(git status --porcelain | wc -l)"; echo "origin/main $(git rev-parse origin/main)"; node --version; date -u +%Y-%m-%dT%H:%M:%SZ; } > "$OUT/identity.txt"
IDX0=$(git ls-files -s | sha256sum | cut -c1-16)
P=packages/recipe-extraction
step pkg-bench-default-split bash -c "cd $P && npm run -s bench -- --out-json /tmp/rx-bench-default.json > /tmp/rx-bench-default.stdout 2>&1; cat /tmp/rx-bench-default.stdout; ! grep -q 'holdout2\|holdout3' /tmp/rx-bench-default.stdout"
step pkg-bench-every-1 bash -c "cd $P && npm run -s bench -- --split every --pages --out-json /tmp/rx-bench-every.json"
step pkg-bench-every-2 bash -c "cd $P && npm run -s bench -- --split every --pages --out-json /tmp/rx-bench-every.rerun.json"
step bench-deterministic bash -c "cmp /tmp/rx-bench-every.json /tmp/rx-bench-every.rerun.json && sha256sum /tmp/rx-bench-every.json && ! grep -q 'ing-h3-' /tmp/rx-bench-every.json && echo 'every: byte-identical, no holdout-v3 line'"
step cli-line bash -c "cd $P && npx tsx bin/recipe-lab.ts line '1/3 cup pesto (homemade (or store-bought))' --engine semantic-v2 && npx tsx bin/recipe-lab.ts line '1-1/2 cups milk' --engine semantic-v2 && npx tsx bin/recipe-lab.ts line '1-1/2 cups milk' && npx tsx bin/recipe-lab.ts engines"
step cli-refuses-url bash -c "cd $P && ! npx tsx bin/recipe-lab.ts page https://example.com/x --final-url https://example.com/x"
step default-engine-unchanged bash -c "grep -n 'DEFAULT_ENGINE_ID' $P/src/ingredient/engines.ts && grep -q 'DEFAULT_ENGINE_ID = \"legacy-table-import-2\"' $P/src/ingredient/engines.ts && git diff --exit-code 8c9fd8ca82f0a4c8787d9089c0954be6e650e1a2 HEAD -- $P/src/ingredient/engines.ts | grep -c 'DEFAULT_ENGINE_ID' | grep -qx 0 && echo 'DEFAULT_ENGINE_ID is legacy-table-import-2 and unchanged since main 8c9fd8c'"
step app-does-not-import-package bash -c "! grep -rn -E 'recipe-extraction|@table/recipe-extraction' src scripts next.config.ts tsconfig.json package.json vitest.config.ts playwright.config.ts && echo 'no reference to the package in app code or root config'"
step app-code-equals-main bash -c "git diff --stat 8c9fd8ca82f0a4c8787d9089c0954be6e650e1a2 HEAD -- src migrations scripts deploy tests public package.json package-lock.json tsconfig.json next.config.ts vitest.config.ts playwright.config.ts .env.example CLAUDE.md | tee /dev/stderr | wc -l | grep -qx 0 && echo 'app code, migrations, scripts, deploy templates, public assets, tests, root config and CLAUDE.md identical to main 8c9fd8c'"
step changed-paths-vs-main bash -c "git diff --name-only 8c9fd8ca82f0a4c8787d9089c0954be6e650e1a2 HEAD | awk -F/ '{print (\$1==\"packages\"?\$1\"/\"\$2:(\$1==\"docs\"?\$1\"/\"\$2\"/\"\$3:\$1))}' | sort | uniq -c; git diff --name-only 8c9fd8ca82f0a4c8787d9089c0954be6e650e1a2 HEAD | grep -v -E '^(packages/recipe-extraction/|docs/table/)' | tee /dev/stderr | wc -l | grep -qx 0 && echo 'every changed path is under packages/recipe-extraction/ or docs/table/'"
step root-typecheck npm run -s typecheck
step root-vitest-excludes-package bash -c "n=\$(npx vitest list --filesOnly 2>/dev/null | grep -c packages/); echo package-files-in-root-vitest=\$n; test \$n -eq 0"
step root-vitest-full bash -c "scripts/db.sh start && DATABASE_URL=postgres://table@127.0.0.1:54329/table_test npx tsx scripts/migrate.ts && npx vitest run"
step next-build-clean bash -c "rm -rf .next && npx next build"
IDX1=$(git ls-files -s | sha256sum | cut -c1-16)
echo "index-hash before=$IDX0 after=$IDX1 status-porcelain-lines-after=$(git status --porcelain | wc -l)" >> "$OUT/identity.txt"
