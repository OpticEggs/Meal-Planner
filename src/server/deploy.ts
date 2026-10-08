import { createHash } from "node:crypto";
import { instacartConfigProblems } from "./integrations/instacart/config";
import { recipeContentConfig } from "./env";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pool } from "./db/pool";

/**
 * B9 deployment checks. `configProblems` lists what makes a production process unsafe to serve (codes
 * only — never a value); the health route reports them and the schema state, so a host's health
 * check refuses a misconfigured or unmigrated release instead of serving it.
 */
export function configProblems(env: Record<string, string | undefined> = process.env): string[] {
  const p: string[] = [];
  const tableEnv = env.TABLE_ENV ?? (env.NODE_ENV === "production" ? "production" : "development");
  if (tableEnv !== "production") return p; // development and test have their own conveniences
  if (!env.DATABASE_URL) p.push("DATABASE_URL_missing");
  const secret = env.BETTER_AUTH_SECRET ?? "";
  if (secret.length < 32 || secret.startsWith("replace-me")) p.push("BETTER_AUTH_SECRET_weak_or_missing");
  const base = env.BETTER_AUTH_URL ?? "";
  try {
    const u = new URL(base);
    if (u.protocol !== "https:") p.push("BETTER_AUTH_URL_not_https");
    if (u.pathname !== "/" || u.search || u.hash) p.push("BETTER_AUTH_URL_not_an_origin");
  } catch {
    p.push("BETTER_AUTH_URL_missing");
  }
  for (const k of ["TABLE_FIXED_NOW", "TABLE_DISPATCH_TIMEOUT_MS", "TABLE_FDC_FIXTURES", "TABLE_KROGER_FAKE_TRANSPORT", "TABLE_RECIPE_FETCH_FIXTURES", "TABLE_INSTACART_FAKE_TRANSPORT"]) {
    if (env[k]) p.push(`${k}_set_in_production`);
  }
  const retailer = env.TABLE_RETAILER ?? "simulated";
  if (retailer !== "simulated" && retailer !== "kroger") p.push("TABLE_RETAILER_invalid");
  if ((env.KROGER_ACTIVATE ?? "").trim() && retailer !== "kroger") p.push("KROGER_ACTIVATE_without_kroger_retailer");
  p.push(...instacartConfigProblems({ ...env, TABLE_ENV: "production" }));
  const fetch = env.TABLE_RECIPE_IMPORT_FETCH;
  if (fetch && fetch !== "on" && fetch !== "off") p.push("TABLE_RECIPE_IMPORT_FETCH_invalid");
  try {
    recipeContentConfig(env);
  } catch {
    p.push("TABLE_RECIPE_CONTENT_invalid");
  }
  return p;
}

/** Migration files on disk vs applied (names and hashes); pending or changed means not ready. */
export async function schemaState(dir = path.resolve(process.cwd(), "migrations")): Promise<{ current: boolean; pending: number; changed: number }> {
  const files = readdirSync(dir).filter((f) => /^\d{3}_.*\.sql$/.test(f)).sort();
  const r = await pool().query("SELECT name, sha256 FROM schema_migrations").catch(() => ({ rows: [] as { name: string; sha256: string }[] }));
  const done = new Map(r.rows.map((x) => [x.name, x.sha256]));
  let pending = 0;
  let changed = 0;
  for (const f of files) {
    const sha = createHash("sha256").update(readFileSync(path.join(dir, f), "utf8")).digest("hex");
    if (!done.has(f)) pending++;
    else if (done.get(f) !== sha) changed++;
  }
  return { current: pending === 0 && changed === 0, pending, changed };
}
