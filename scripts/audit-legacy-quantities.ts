// Usage: DATABASE_URL=postgres://...local... npm run audit:legacy-quantities -- [--household <id>] [--out <file.json>]
// READ-ONLY audit of recipe quantities saved before exact quantities (migration 015; D135). It lists legacy
// rows that may be rounded approximations and, separately, what source evidence could recover the exact
// amount; it also lists specialty seasonings stored as plain salt/pepper or left out before the RIO-02 fix.
// It never writes: the session is READ ONLY and its one transaction is rolled back. It corrects nothing — a
// correction would be a new recipe version, separately authorized.
// It refuses a database that is not on this machine unless --remote-read-only is given on purpose.
import pg from "pg";
import { writeFileSync } from "node:fs";
import { auditLegacyQuantities, auditTargetAllowed } from "../src/server/audit/legacy-quantities";

const args = process.argv.slice(2);
const opt = (k: string) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : undefined;
};
const url = process.env.DATABASE_URL ?? "";
const allowed = auditTargetAllowed(url, args.includes("--remote-read-only"));
if (!allowed.ok) {
  console.error(allowed.reason);
  process.exit(2);
}
const c = new pg.Client({ connectionString: url });
await c.connect();
await c.query("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY");
const report = await auditLegacyQuantities(c, { householdId: opt("--household") ?? null });
await c.end();
const json = JSON.stringify(report, null, 2);
const out = opt("--out");
if (out) writeFileSync(out, json);
else console.log(json);
const s = report.summary;
console.error(
  `legacy rows: ${s.legacyRows} (short decimals ${s.byRisk.short_decimal}, 4-place ${s.byRisk.rounded_4dp}, 12-place ${s.byRisk.rounded_12dp}, other ${s.byRisk.long_decimal}); ` +
    `recoverable from an import draft: ${s.recoverable}; original line only: ${s.sourceLineOnly}; no evidence: ${s.missing}; conflicting: ${s.conflicting}; ` +
    `seasoning findings: ${s.seasoningFindings}; versions on scheduled dinners: ${s.versionsOnScheduledDinners}. Nothing was changed.`,
);
process.exit(0);
