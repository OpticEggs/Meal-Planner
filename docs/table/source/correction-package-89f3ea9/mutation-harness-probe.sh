#!/usr/bin/env bash
# Diagnostic only: demonstrates that the reviewed mutation harness mistakes runner
# failure for a kill. It never modifies the supplied repository. Not a release gate.
set -euo pipefail
SRC="$(cd "${1:?usage: mutation-harness-probe.sh /path/to/table}" && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
for f in tests/mutation/run.sh src/server/commands/plan.ts src/server/commands/purchasing.ts src/domain/groceries/projection.ts; do
  mkdir -p "$TMP/$(dirname "$f")"
  cp "$SRC/$f" "$TMP/$f"
done
mkdir -p "$TMP/bin"
printf '#!/usr/bin/env bash\nprintf "simulated test-runner startup failure; no tests executed\\n" >&2\nexit 127\n' > "$TMP/bin/npx"
chmod +x "$TMP/bin/npx"
rc=0
PATH="$TMP/bin:$PATH" bash "$TMP/tests/mutation/run.sh" || rc=$?
printf 'harness_exit=%s\nno_application_tests_executed=true\n' "$rc"
for f in src/server/commands/plan.ts src/server/commands/purchasing.ts src/domain/groceries/projection.ts; do
  cmp "$SRC/$f" "$TMP/$f"
done
