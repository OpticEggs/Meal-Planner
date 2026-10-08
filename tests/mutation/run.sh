#!/usr/bin/env bash
# Mutation checks: inject a forbidden behavior into the server, run the contract tests that
# must catch it, and require them to FAIL. Every source file is restored on exit.
set -uo pipefail
cd "$(dirname "$0")/../.."
BK=$(mktemp -d)
FILES=(src/server/commands/plan.ts src/server/commands/purchasing.ts src/domain/groceries/projection.ts)
for f in "${FILES[@]}"; do mkdir -p "$BK/$(dirname "$f")"; cp "$f" "$BK/$f"; done
restore() { for f in "${FILES[@]}"; do cp "$BK/$f" "$f"; done; }
trap restore EXIT
status=0
mutate() {
  local name="$1" file="$2" suite="$3" pattern="$4"; shift 4
  restore
  python3 - "$file" "$@" <<'PY'
import sys
p, *pairs = sys.argv[1:]
s = open(p).read()
for a, b in zip(pairs[::2], pairs[1::2]):
    assert a in s, f"mutation anchor not found: {a!r}"
    s = s.replace(a, b, 1)
open(p, "w").write(s)
PY
  if npx vitest run "$suite" -t "$pattern" >"$BK/$name.log" 2>&1; then
    echo "MUTATION SURVIVED: $name ($suite -t '$pattern' still passes)"; status=1
  else
    echo "mutation killed: $name — $(grep -E '^ +Tests ' "$BK/$name.log" | tr -s ' ')"
  fi
}
PLAN=tests/integration/plan.contract.test.ts
GROC=tests/integration/groceries.contract.test.ts

# 1. Blanket whole-week conflict rule (defeats independent-night edits).
mutate blanket_week_conflict src/server/commands/plan.ts $PLAN "T10" \
  "    const stale = closureStale({ assignments: preview.base.assignments, events: preview.base.events }, state);" \
  "    const stale = week.acceptedChoiceRevision !== preview.base.acceptedChoiceRevision ? { stale: true, changed: [] } : closureStale({ assignments: preview.base.assignments, events: preview.base.events }, state);"
# 2. Last-write-wins: skip the per-target stale check and the reviewed-content hash check.
mutate last_write_wins src/server/commands/plan.ts $PLAN "T08|T11|T22" \
  "    if (stale.stale) {" "    if (false && stale.stale) {" \
  "    if (res.contentHash !== preview.content_hash) {" "    if (false) {"
# 3. Adoption ignores the reviewed accepted-week revision.
mutate stale_adoption src/server/commands/plan.ts $PLAN "T12" \
  "if (week.acceptedChoiceRevision !== p.expectedAcceptedChoiceRevision || week.acceptedChoiceRevision !== proposal.base_accepted_choice_revision) {" \
  "if (false) {"
# 4. Send ignores the reviewed fingerprint (stale review reaches the retailer).
mutate stale_send src/server/commands/purchasing.ts $GROC "T13|T14" \
  "    if (summary.reviewFingerprint !== p.reviewFingerprint || summary.payloadHash !== p.payloadHash) {" "    if (false) {" \
  "    if (hashOf(payload) !== p.payloadHash) throw" "    if (false) throw"
# 5. Approvals are not consumed (the same demand can be sent twice under new ids).
mutate approvals_not_consumed src/server/commands/purchasing.ts $GROC "X03" \
  "      await c.query(\"UPDATE purchase_approvals SET state='consumed'" "      if (false) await c.query(\"UPDATE purchase_approvals SET state='consumed'"
# 6. Uncertain transfers are treated as never sent (invites an automatic replay).
mutate uncertain_as_unsent src/domain/groceries/projection.ts $GROC "T16" \
  "        if (b.status === \"uncertain\") uncertain += n;" "        if (false) uncertain += n;"
# 7. Superseded queued work is dispatched anyway.
mutate dispatch_superseded src/server/commands/purchasing.ts $GROC "T17" \
  "    if (superseded.length) {" "    if (false) {"
exit $status
