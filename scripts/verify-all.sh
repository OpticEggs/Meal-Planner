#!/usr/bin/env bash
# Runs every check and records exact results as evidence. Exit code is non-zero if anything fails.
set -uo pipefail
cd "$(dirname "$0")/.."
OUT="docs/table/evidence/$(date -u +%F)-full-run.md"
mkdir -p docs/table/evidence
scripts/db.sh start >/dev/null
for db in table_test table_e2e; do DATABASE_URL=postgres://table@127.0.0.1:54329/$db npx tsx scripts/migrate.ts >/dev/null; done
rc=0
run() { local name="$1"; shift; echo "## $name" >>"$OUT"; echo '```' >>"$OUT"; echo "\$ $*" >>"$OUT"; "$@" >/tmp/verify-$$.log 2>&1; local s=$?; grep -E "$FILTER" /tmp/verify-$$.log >>"$OUT"; echo "exit $s" >>"$OUT"; echo '```' >>"$OUT"; [ $s -eq 0 ] || rc=1; }
{
  echo "# Full verification run"
  echo "- Date (UTC): $(date -u +%FT%TZ)"
  echo "- Code: $(git rev-parse HEAD) $( [ -n "$(git status --porcelain)" ] && echo '(+ uncommitted changes)')"
  echo "- Runtime: node $(node -v); $(/usr/lib/postgresql/16/bin/postgres --version); Next $(node -p 'require("next/package.json").version'); Playwright $(node -p 'require("@playwright/test/package.json").version') (Chromium headless); vitest $(node -p 'require("vitest/package.json").version')"
  echo "- Not covered by this run: Safari/WebKit, physical mobile devices, live Kroger, production hosting."
  echo
} >"$OUT"
FILTER="error|Error" run "Typecheck" npx tsc --noEmit -p .
FILTER="Test Files|Tests |✓|×|FAIL" run "Unit + integration (vitest, real PostgreSQL)" npx vitest run --reporter=verbose
FILTER="Compiled|rror" run "Production build" npx next build
FILTER="✓|✘|-  |passed|failed|skipped|flaky" run "Browser suite (Playwright, two authenticated contexts, production server)" npx playwright test
FILTER="mutation|MUTATION" run "Mutation checks" tests/mutation/run.sh
echo "Overall: $([ $rc -eq 0 ] && echo PASS || echo FAIL)" >>"$OUT"
echo "$OUT"
exit $rc
