import { configProblems, schemaState } from "@/server/deploy";
import { pool } from "@/server/db/pool";

export const dynamic = "force-dynamic";

/** Unauthenticated liveness/readiness for the host's health check (B9). Reveals no data, no values:
 *  only whether the database answers, whether the schema is current, and problem codes. */
export async function GET() {
  const problems = configProblems();
  let db = false;
  let schema = { current: false, pending: 0, changed: 0 };
  try {
    await pool().query("SELECT 1");
    db = true;
    schema = await schemaState();
  } catch {
    problems.push("database_unreachable");
  }
  if (db && !schema.current) problems.push(schema.changed ? "schema_changed_after_apply" : "schema_migrations_pending");
  const ok = problems.length === 0;
  return Response.json({ ok, problems }, { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } });
}
