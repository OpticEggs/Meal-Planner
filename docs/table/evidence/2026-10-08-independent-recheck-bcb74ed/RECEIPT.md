# Receipt — independent recheck of bcb74ed (B19 cook records, B20 visual update)

Recorded 2026-10-08. Input: `Table-B19-B20-Independent-Recheck-bcb74ed.md` (owner-supplied, copied
verbatim; sha256 `f3f6845191dbdc58a73f45eee6807aef4bd2973ea152c12a273b6935eed0f71b`). This commit changes
documentation only.

## What the recheck established
- Bundle `table-bcb74ed.bundle` hash, refs (`HEAD`, `main` → `bcb74ed`), and that `f22f9d5..bcb74ed`
  touches only docs/evidence and `CLAUDE.md`.
- Saved evidence counts: `02a3b1a` vitest 293/293, Playwright 117 expected / 0 unexpected, 62 mutations
  killed; `f22f9d5` vitest 298/298, Playwright 121 / 0 unexpected, 64 killed. Both tracked-file hashes
  recomputed and matching. **Records and hashes only — not a rerun** of PostgreSQL, build, browser or
  mutation runs.
- Verdict: close B19 and B20 **for the application command path and Chromium-tested presentation**.

## Findings and what was done
| Finding | Confirmed in source | Done in this commit |
|---|---|---|
| The 008 index `(cooking_event_id, generation) WHERE … duplicate_of IS NULL` is not a database-wide guarantee of one effective record: a raw insert under a new generation beside an uncorrected record is not refused, and the view would show both | Yes — `migrations/008_cook_record_corrections.sql`; the integration "database refuses" test inserts the same generation only | D78 and ACCEPTANCE COOK-01 rescoped (the guarantee is the command's; the index refuses a repeated generation). Open item **B21** (owner decision). No code or schema change |
| `RecordCooked` does not check that the event is still `scheduled` / on an active night; a stale caller could mark a retired event cooked | Yes — `src/server/commands/plan.ts` `recordCookedCommand` selects by id and household only. Behavior predates B19. Not reproduced | Open item **B22**: semantics to decide first (refuse vs. retrospective history) |
| Screenshots are Chromium fixture screens; no iPhone Safari/VoiceOver | — | Already recorded (B8, NOT RUN) |
| Contrast tests measure token pairs, not a full assistive-technology audit | — | Noted; UI-01 claims token pairs only |
| A paid Render plan is not technically mandatory; a free-tier candidate would need its own uptime, sleep, database, backup, resource and security testing | — | Noted for the hosting decision (OWNER-INPUTS H1); no hosting research or provisioning done |

## Not done
No code, schema, test or database change; no deployment, hosting, retailer or FDC request. B21 and B22
are listed in BACKLOG as awaiting a decision; neither is queued for implementation.
