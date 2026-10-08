import { getAuth } from "./auth";
import { pool } from "./db/pool";
import type { Actor } from "./commands/framework";

/** Actor and household are ALWAYS derived from the authenticated session, never from the client. */
export async function actorFrom(headers: Headers): Promise<Actor | null> {
  const session = await getAuth().api.getSession({ headers });
  if (!session?.user) return null;
  const r = await pool().query("SELECT id, household_id, display_name FROM members WHERE user_id=$1", [session.user.id]);
  if (!r.rowCount) return null;
  return { memberId: r.rows[0].id, householdId: r.rows[0].household_id, displayName: r.rows[0].display_name };
}

/** Same-origin check for state-changing JSON requests (CSRF defense in depth alongside
 *  SameSite cookies and the JSON content-type requirement). */
export function sameOrigin(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return false;
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  } catch {
    return false;
  }
}
