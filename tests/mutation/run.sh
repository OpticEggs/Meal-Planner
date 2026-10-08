#!/usr/bin/env bash
# Mutation checks: inject a forbidden behavior, run the contract tests that must catch it,
# and require them to FAIL. The source file is always restored.
set -uo pipefail
cd "$(dirname "$0")/../.."
F=src/server/commands/plan.ts
cp "$F" /tmp/table-mutation-backup.ts
trap 'cp /tmp/table-mutation-backup.ts "$F"' EXIT
status=0
mutate() {
  local name="$1" pattern="$2"; shift 2
  cp /tmp/table-mutation-backup.ts "$F"
  python3 - "$F" "$@" <<'PY'
import sys
p, *pairs = sys.argv[1:]
s = open(p).read()
for a, b in zip(pairs[::2], pairs[1::2]):
    assert a in s, f"mutation anchor not found: {a!r}"
    s = s.replace(a, b, 1)
open(p, "w").write(s)
PY
  if npx vitest run tests/integration/plan.contract.test.ts -t "$pattern" >/tmp/mut-$name.log 2>&1; then
    echo "MUTATION SURVIVED: $name (tests '$pattern' still pass)"; status=1
  else
    echo "mutation killed: $name — $(grep -E 'Tests +[0-9]' /tmp/mut-$name.log | tr -s ' ')"
  fi
}
# 1. Blanket whole-week conflict rule (would defeat independent-night edits).
mutate blanket_week_conflict "T10" \
  "    const stale = closureStale({ assignments: preview.base.assignments, events: preview.base.events }, state);" \
  "    const stale = week.acceptedChoiceRevision !== preview.base.acceptedChoiceRevision ? { stale: true, changed: [] } : closureStale({ assignments: preview.base.assignments, events: preview.base.events }, state);"
# 2. Last-write-wins: skip the per-target stale check AND the reviewed-content hash check.
mutate last_write_wins "T08|T11|T22" \
  "    if (stale.stale) {" "    if (false && stale.stale) {" \
  "    if (res.contentHash !== preview.content_hash) {" "    if (false) {"
# 3. Adoption ignores the reviewed accepted-week revision.
mutate stale_adoption "T12" \
  "if (week.acceptedChoiceRevision !== p.expectedAcceptedChoiceRevision || week.acceptedChoiceRevision !== proposal.base_accepted_choice_revision) {" \
  "if (false) {"
exit $status
