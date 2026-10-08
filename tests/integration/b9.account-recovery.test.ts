/**
 * B9 account recovery without email or public sign-up: an operator resets one member's password from
 * the host's shell (scripts/member-reset-password.ts). The old password stops working, every existing
 * session of that member ends, other members are untouched, and only household members can be reset.
 */
import { describe, expect, it } from "vitest";
import { fresh, q } from "./helpers";
import { db } from "./helpers";
import { USERS } from "../fixtures/household";
import { getAuth } from "@/server/auth";
import * as provision from "@/server/provision";

async function signIn(email: string, password: string): Promise<boolean> {
  try {
    const r = await getAuth().api.signInEmail({ body: { email, password } });
    return !!r?.user;
  } catch {
    return false;
  }
}
const sessions = async (email: string) =>
  (await q<{ n: number }>(`SELECT count(*)::int AS n FROM "session" s JOIN "user" u ON u.id=s."userId" WHERE u.email=$1`, [email]))[0].n;

describe("B9 operator password reset", () => {
  it("replaces the member's password, ends that member's sessions, and leaves the other member alone", async () => {
    await fresh();
    const reset = (provision as any).resetMemberPassword as ((c: unknown, email: string, password: string) => Promise<void>) | undefined;
    expect(typeof reset, "an operator password reset must exist").toBe("function");
    expect(await signIn(USERS.jon.email, USERS.jon.password)).toBe(true);
    expect(await signIn(USERS.alex.email, USERS.alex.password)).toBe(true);
    expect(await sessions(USERS.jon.email)).toBeGreaterThan(0);
    const c = await db();
    try {
      await reset!(c, USERS.jon.email.toUpperCase(), "a-new-long-password-for-jon");
    } finally {
      await c.end();
    }
    expect(await sessions(USERS.jon.email)).toBe(0);
    expect(await signIn(USERS.jon.email, USERS.jon.password)).toBe(false);
    expect(await signIn(USERS.jon.email, "a-new-long-password-for-jon")).toBe(true);
    expect(await sessions(USERS.alex.email)).toBeGreaterThan(0);
    expect(await signIn(USERS.alex.email, USERS.alex.password)).toBe(true);
  });

  it("refuses an unknown address, a non-member account and a short password, changing nothing", async () => {
    await fresh();
    const reset = (provision as any).resetMemberPassword as (c: unknown, email: string, password: string) => Promise<void>;
    const c = await db();
    // Capture each outcome, then assert on it (a wrongly accepted reset is a failed expectation).
    const outcome = (p: Promise<void>) => p.then(() => "accepted", (e: Error) => e.message);
    try {
      expect(await outcome(reset(c, "nobody@nowhere.test", "a-new-long-password"))).toMatch(/no household member/);
      expect(await outcome(reset(c, USERS.jon.email, "short"))).toMatch(/at least 10/);
      // An auth user with no household membership is not resettable through this path.
      const ctx = await getAuth().$context;
      await ctx.internalAdapter.createUser({ email: "stray@user.test", name: "Stray", emailVerified: false }, { method: "admin" } as any);
      expect(await outcome(reset(c, "stray@user.test", "a-new-long-password"))).toMatch(/no household member/);
    } finally {
      await c.end();
    }
    expect(await signIn(USERS.jon.email, USERS.jon.password)).toBe(true);
  });
});
