#!/usr/bin/env bash
# Steps of run-verify.sh (kept in a file so every command is visible). Usage: sub.sh <step> [out-dir]
set -u
ROOT=/home/user/Meal-Planner; P=$ROOT/packages/recipe-extraction; OUT=${2:-}
case "$1" in
  typecheck) cd "$P" && npm run -s typecheck ;;
  test) cd "$P" && npx vitest run --config vitest.config.ts --reporter=verbose ;;
  every) cd "$P" && npm run -s bench -- --split every --pages --out-json "$OUT/every-1.json" && npm run -s bench -- --split every --pages --out-json "$OUT/every-2.json" && cmp "$OUT/every-1.json" "$OUT/every-2.json" && sha256sum "$OUT/every-1.json" && ! grep -q 'ing-h3-' "$OUT/every-1.json" && echo "every: byte-identical across two runs; no holdout-v3 line" ;;
  h3) cd "$P" && npm run -s bench -- --split holdout3 --out-json "$OUT/holdout3-rerun.json" > /dev/null && python3 -I "$ROOT/docs/table/evidence/2026-10-10-recipe-extraction-phase2c/verify-final/h3-equivalence.py" "$ROOT/docs/table/evidence/2026-10-10-recipe-extraction-phase2b/evaluation-holdout-v3/benchmark-report-holdout3.json" "$OUT/holdout3-rerun.json" ;;
  cli) cd "$P" && npx tsx bin/recipe-lab.ts line '1 small tub crème fraîche' --engine semantic-v3 && npx tsx bin/recipe-lab.ts line '1 tbsp tamarind paste, dissolved in 3 tbsp hot water' --engine semantic-v3 && npx tsx bin/recipe-lab.ts line '1-1/2 cups milk' && npx tsx bin/recipe-lab.ts engines && ! npx tsx bin/recipe-lab.ts page https://example.com/x --final-url https://example.com/x ;;
  noimport) cd "$ROOT" && ! grep -rn -E 'recipe-extraction|@table/recipe-extraction' src scripts next.config.ts tsconfig.json package.json vitest.config.ts playwright.config.ts && echo "no reference to the package in app code or root config" ;;
  mutations) cd "$P" && npx tsx tools/mutation/run.ts tools/mutation/specs/selftest.json tools/mutation/specs/scorer.json tools/mutation/specs/parser.json tools/mutation/specs/parser-v3.json --scratch /tmp/claude-0/-home-user-Meal-Planner/7c930bb6-c34b-51a2-998f-d2325352dd1d/scratchpad/mut-final --out-json "$OUT/mutations.json" --out-md "$OUT/mutations.md" ;;
  rootvitest) cd "$ROOT" && scripts/db.sh start && DATABASE_URL=postgres://table@127.0.0.1:54329/table_test npx tsx scripts/migrate.ts && npx vitest run ;;
  build) cd "$ROOT" && npx next build ;;
esac
