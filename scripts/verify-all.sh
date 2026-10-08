#!/usr/bin/env bash
# Full verification tied to an exact commit (review findings V01 / handoff §D).
#  - refuses a dirty tree (unless --allow-dirty), and fails on database start/migration errors
#  - writes COMPLETE logs and structured results OUTSIDE the source tree while measuring
#  - hashes every tracked file before and after to prove the source did not change mid-run
# Usage: scripts/verify-all.sh [--out DIR] [--allow-dirty]
set -uo pipefail
cd "$(dirname "$0")/.."
ALLOW_DIRTY=0
OUT=""
while [ $# -gt 0 ]; do
  case "$1" in
    --allow-dirty) ALLOW_DIRTY=1 ;;
    --out) OUT="$2"; shift ;;
  esac
  shift
done
HEAD_SHA=$(git rev-parse HEAD)
OUT="${OUT:-/tmp/table-verify-$(git rev-parse --short HEAD)-$(date -u +%Y%m%dT%H%M%SZ)}"
mkdir -p "$OUT"
SUM="$OUT/summary.md"
fatal() { echo "FATAL: $*" | tee -a "$SUM"; exit 2; }

tree_hash() { git ls-files -z | xargs -0 sha256sum | sha256sum | cut -d' ' -f1; }
DIRTY=$(git status --porcelain)
if [ -n "$DIRTY" ] && [ $ALLOW_DIRTY -eq 0 ]; then
  echo "$DIRTY" > "$OUT/dirty.txt"
  fatal "working tree is not clean (see $OUT/dirty.txt); commit first or pass --allow-dirty"
fi
BEFORE=$(tree_hash)
{
  echo "# Full verification run"
  echo "- Date (UTC): $(date -u +%FT%TZ)"
  echo "- Commit: $HEAD_SHA"
  echo "- Tree: $([ -n "$DIRTY" ] && echo 'DIRTY (--allow-dirty)' || echo clean); tracked-file hash before: $BEFORE"
  echo "- Runtime: node $(node -v); $(/usr/lib/postgresql/16/bin/postgres --version); Next $(node -p 'require("next/package.json").version'); Playwright $(node -p 'require("@playwright/test/package.json").version') (Chromium headless only); vitest $(node -p 'require("vitest/package.json").version')"
  echo "- Logs: complete command output in this directory (*.log), structured results (*.json)"
  echo "- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting."
  echo
} > "$SUM"

# Setup failures are failures, not skipped steps.
scripts/db.sh start > "$OUT/db-start.log" 2>&1 || fatal "database start failed (db-start.log)"
for db in table_test table_e2e; do
  DATABASE_URL=postgres://table@127.0.0.1:54329/$db npx tsx scripts/migrate.ts > "$OUT/migrate-$db.log" 2>&1 || fatal "migration of $db failed (migrate-$db.log)"
done

rc=0
step() {
  local name="$1" log="$2"; shift 2
  local start=$(date +%s)
  "$@" > "$OUT/$log" 2>&1
  local s=$?
  echo "| $name | \`$*\` | $([ $s -eq 0 ] && echo PASS || echo "FAIL (exit $s)") | $(( $(date +%s) - start ))s | $log |" >> "$SUM"
  [ $s -eq 0 ] || rc=1
}
echo "| Step | Command | Result | Time | Log |" >> "$SUM"
echo "|---|---|---|---|---|" >> "$SUM"
step "Typecheck" typecheck.log npx tsc --noEmit -p .
step "Unit + integration (real PostgreSQL)" vitest.log npx vitest run --reporter=verbose --reporter=json --outputFile.json="$OUT/vitest.json"
step "Production build" build.log npx next build
step "Browser suite (2 authenticated Chromium contexts, production server)" playwright.log env PLAYWRIGHT_JSON_OUTPUT_NAME="$OUT/playwright.json" npx playwright test --reporter=list,json
mkdir -p "$OUT/screens" && cp test-results/*Header*/*.png "$OUT/screens/" 2>/dev/null || true
step "Mutation harness self-test" mutation-selftest.log tests/mutation/selftest.sh
step "Mutation checks" mutation.log node tests/mutation/run.mjs --out "$OUT/mutation"

AFTER=$(tree_hash)
{
  echo
  node -e '
    const fs=require("fs"); const o=process.argv[1];
    try { const v=JSON.parse(fs.readFileSync(o+"/vitest.json")); console.log(`- vitest: ${v.numTotalTests} total, ${v.numPassedTests} passed, ${v.numFailedTests} failed, ${v.numPendingTests+v.numTodoTests} skipped/todo`); } catch { console.log("- vitest: no JSON results"); }
    try { const p=JSON.parse(fs.readFileSync(o+"/playwright.json")); const s=p.stats; console.log(`- playwright: ${s.expected} passed, ${s.unexpected} failed, ${s.flaky} flaky, ${s.skipped} skipped`); } catch { console.log("- playwright: no JSON results"); }
    try { const m=JSON.parse(fs.readFileSync(o+"/mutation/results.json")); const c=k=>m.results.filter(r=>r.classification===k).length; console.log(`- mutation: ${c("KILLED")} killed, ${c("SURVIVED")} survived, ${c("ERROR")} error; sources restored: ${m.restored}`); } catch { console.log("- mutation: no results"); }
  ' "$OUT"
  echo "- Tracked-file hash after: $AFTER ($([ "$BEFORE" = "$AFTER" ] && echo 'unchanged — source immutable during run' || echo 'CHANGED DURING RUN'))"
  echo "- Commit after: $(git rev-parse HEAD)"
} >> "$SUM"
[ "$BEFORE" = "$AFTER" ] || rc=1
[ "$(git rev-parse HEAD)" = "$HEAD_SHA" ] || rc=1
echo "Overall: $([ $rc -eq 0 ] && echo PASS || echo FAIL)" >> "$SUM"
cat "$SUM"
exit $rc
