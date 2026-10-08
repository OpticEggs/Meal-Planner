import { getAuth } from "./auth";
import type pg from "pg";

/** Creates a household with every setting unset. Nothing is inferred or copied. */
export async function createHousehold(c: pg.PoolClient | pg.Client, name: string, timezone: string, fixture = false): Promise<string> {
  // Validate the IANA timezone before storing it.
  new Intl.DateTimeFormat("en-US", { timeZone: timezone });
  const r = await c.query("INSERT INTO households(name, timezone, fixture) VALUES ($1,$2,$3) RETURNING id", [name, timezone, fixture]);
  await c.query("INSERT INTO household_settings(household_id) VALUES ($1)", [r.rows[0].id]);
  return r.rows[0].id;
}

/** Provisions one member with an email/password credential through Better Auth's own
 *  password hashing and adapter (public sign-up stays disabled). */
export async function createMember(
  c: pg.PoolClient | pg.Client,
  householdId: string,
  email: string,
  displayName: string,
  password: string,
): Promise<{ memberId: string; userId: string }> {
  if (password.length < 10) throw new Error("password must be at least 10 characters");
  const ctx = await getAuth().$context;
  const hash = await ctx.password.hash(password);
  const user = await ctx.internalAdapter.createUser({ email: email.toLowerCase(), name: displayName, emailVerified: false }, { method: "admin" });
  await ctx.internalAdapter.linkAccount({ userId: user.id, providerId: "credential", accountId: user.id, password: hash });
  const m = await c.query("INSERT INTO members(household_id, user_id, display_name) VALUES ($1,$2,$3) RETURNING id", [householdId, user.id, displayName]);
  return { memberId: m.rows[0].id, userId: user.id };
}

/** Account recovery without email (B9): an operator, in the host's shell, sets a new password for one
 *  household member through Better Auth's own hashing and ends every session that member had. Only an
 *  account that belongs to a household member can be reset; nothing else changes. */
export async function resetMemberPassword(c: pg.PoolClient | pg.Client, email: string, password: string): Promise<void> {
  if (password.length < 10) throw new Error("password must be at least 10 characters");
  const ctx = await getAuth().$context;
  const found = await ctx.internalAdapter.findUserByEmail(email.toLowerCase());
  const userId = found?.user.id;
  const member = userId ? await c.query("SELECT 1 FROM members WHERE user_id=$1", [userId]) : null;
  if (!userId || !member?.rowCount) throw new Error("no household member has that email address");
  await ctx.internalAdapter.updatePassword(userId, await ctx.password.hash(password));
  await ctx.internalAdapter.deleteUserSessions(userId);
}
