#!/usr/bin/env bash
# Harness-negative checks for the mutation runner (review finding V01):
#  1. a test-runner startup failure (npx exits 127, no tests run) must be ERROR, exit != 0;
#  2. a harmless control mutation must be classified SURVIVED (the classifier can say so);
#  3. sources are byte-identical afterwards in both cases.
set -uo pipefail
cd "$(dirname "$0")/../.."
TMP=$(mktemp -d)
before=$(sha256sum src/server/commands/plan.ts src/server/commands/purchasing.ts src/domain/groceries/projection.ts)
mkdir -p "$TMP/bin"
printf '#!/usr/bin/env bash\necho "simulated test-runner startup failure; no tests executed" >&2\nexit 127\n' > "$TMP/bin/npx"
chmod +x "$TMP/bin/npx"
fail=0
PATH="$TMP/bin:$PATH" node tests/mutation/run.mjs --out "$TMP/broken" --only blanket_week_conflict,stale_send >"$TMP/broken.out" 2>&1; rc=$?
cat "$TMP/broken.out"
if [ $rc -eq 0 ]; then echo "SELFTEST FAIL: runner failure produced exit 0"; fail=1; fi
if grep -q "^KILLED" "$TMP/broken.out"; then echo "SELFTEST FAIL: runner failure was classified as a kill"; fail=1; fi
grep -q "^ERROR" "$TMP/broken.out" || { echo "SELFTEST FAIL: no ERROR classification"; fail=1; }
node tests/mutation/run.mjs --out "$TMP/control" --include-controls --only control_noop_comment >"$TMP/control.out" 2>&1; rc2=$?
cat "$TMP/control.out"
grep -q "^SURVIVED control_noop_comment" "$TMP/control.out" || { echo "SELFTEST FAIL: control not classified SURVIVED"; fail=1; }
[ $rc2 -eq 0 ] || { echo "SELFTEST FAIL: control run should pass (control expected to survive)"; fail=1; }
after=$(sha256sum src/server/commands/plan.ts src/server/commands/purchasing.ts src/domain/groceries/projection.ts)
[ "$before" = "$after" ] || { echo "SELFTEST FAIL: sources changed"; fail=1; }
[ $fail -eq 0 ] && echo "SELFTEST PASS: runner failure -> ERROR (exit $rc), control -> SURVIVED, sources restored"
exit $fail
