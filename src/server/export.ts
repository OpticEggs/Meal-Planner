import type pg from "pg";

/**
 * Household export: every household-scoped table, in foreign-key order, with an explicit
 * column policy. Authentication tables (user, session, account, verification) and any
 * credential are never exported. Members carry display names only; their user_id is
 * replaced on restore.
 */

type Spec = { table: string; where: string; omit?: string[] };

// $1 = household id. Order matters for restore.
export const EXPORT_TABLES: Spec[] = [
  { table: "households", where: "id=$1" },
  { table: "members", where: "household_id=$1", omit: ["user_id"] },
  { table: "household_settings", where: "household_id=$1" },
  { table: "member_targets", where: "member_id IN (SELECT id FROM members WHERE household_id=$1)" },
  { table: "exclusions", where: "household_id=$1" },
  { table: "ingredients", where: "household_id=$1" },
  { table: "nutrition_matches", where: "household_id=$1" }, // B7 append-only nutrition decisions (no key is ever stored)
  { table: "ingredient_nutrition", where: "household_id=$1" },
  { table: "recipe_images", where: "household_id=$1" }, // photos kept under a recorded permission (bytes as base64)
  { table: "recipes", where: "household_id=$1" },
  { table: "recipe_versions", where: "household_id=$1" },
  { table: "recipe_components", where: "recipe_version_id IN (SELECT id FROM recipe_versions WHERE household_id=$1)" },
  { table: "recipe_ingredients", where: "recipe_version_id IN (SELECT id FROM recipe_versions WHERE household_id=$1)" },
  { table: "recipe_bookmarks", where: "household_id=$1" }, // shared saved links (no page content is stored)
  { table: "recipe_bookmark_saves", where: "household_id=$1" },
  { table: "recipe_import_drafts", where: "household_id=$1" },
  { table: "weeks", where: "household_id=$1" },
  { table: "cooking_events", where: "household_id=$1" },
  { table: "assignments", where: "household_id=$1" },
  { table: "allocations", where: "household_id=$1" },
  { table: "leftover_observations", where: "household_id=$1" },
  { table: "cook_records", where: "household_id=$1" },
  { table: "cook_record_corrections", where: "household_id=$1" },
  { table: "proposals", where: "household_id=$1" },
  { table: "previews", where: "household_id=$1" },
  { table: "interests", where: "household_id=$1" },
  { table: "recipe_preferences", where: "household_id=$1" },
  { table: "favorites", where: "household_id=$1" },
  { table: "recipe_notes", where: "household_id=$1" },
  { table: "grocery_cycles", where: "household_id=$1" },
  { table: "products", where: "household_id=$1" },
  { table: "product_mappings", where: "household_id=$1" },
  { table: "price_observations", where: "household_id=$1" },
  { table: "household_staples", where: "household_id=$1" },
  { table: "staple_product_decisions", where: "household_id=$1" },
  { table: "staple_changes", where: "household_id=$1" },
  { table: "household_requests", where: "household_id=$1" },
  { table: "request_contributors", where: "request_id IN (SELECT id FROM household_requests WHERE household_id=$1)" },
  { table: "availability_observations", where: "household_id=$1" },
  { table: "requirement_lines", where: "household_id=$1" },
  { table: "purchase_approvals", where: "household_id=$1" },
  { table: "handoff_batches", where: "household_id=$1" },
  { table: "handoff_batch_lines", where: "batch_id IN (SELECT id FROM handoff_batches WHERE household_id=$1)" },
  { table: "handoff_status_events", where: "batch_id IN (SELECT id FROM handoff_batches WHERE household_id=$1)" },
  { table: "orders", where: "household_id=$1" },
  { table: "order_lines", where: "household_id=$1" },
  { table: "receipt_observations", where: "household_id=$1" },
  { table: "substitution_validations", where: "household_id=$1" },
  { table: "change_events", where: "household_id=$1" },
  // Non-secret history of the household's Kroger connection (B5).
  { table: "kroger_connection_events", where: "household_id=$1" },
];

/** Household-scoped tables deliberately NOT exported: operational idempotency records, the
 *  test-only simulated-retailer recorder, and the Kroger credential stores (sealed access/refresh
 *  tokens, PKCE verifiers and authorization states must NEVER be exported). Every other table with
 *  a household_id must be in EXPORT_TABLES (checked by the X12 test). */
// cook_records_effective is a view derived from cook_records + cook_record_corrections (both exported).
// instacart_list_links: provider-generated links whose retention terms are unverified; a link is regenerable from the list.
export const NOT_EXPORTED = ["command_receipts", "fake_retailer_calls", "fake_retailer_script", "kroger_connections", "kroger_auth_states", "cook_records_effective", "instacart_list_links"];

export interface HouseholdExport {
  format: "table-household-export";
  version: 1;
  exportedAt: string;
  note: string;
  tables: Record<string, Record<string, unknown>[]>;
}

export async function exportHousehold(c: pg.PoolClient | pg.Client, householdId: string): Promise<HouseholdExport> {
  const tables: HouseholdExport["tables"] = {};
  for (const s of EXPORT_TABLES) {
    // A stable order (the row's own text), so two exports of the same data are identical whatever
    // plan each database chooses (an index scan and a sequential scan return rows in different orders).
    const r = await c.query(`SELECT * FROM ${s.table} t WHERE ${s.where} ORDER BY t::text`, [householdId]);
    tables[s.table] = r.rows.map((row) => {
      const o: Record<string, unknown> = { ...row };
      for (const k of s.omit ?? []) delete o[k];
      for (const [k, v] of Object.entries(o)) if (Buffer.isBuffer(v)) o[k] = v.toString("base64"); // bytea
      return o;
    });
  }
  return {
    format: "table-household-export",
    version: 1,
    exportedAt: new Date().toISOString(),
    note: "Contains household recipes, versions, preferences, plans and grocery records. No credentials, sessions or account data.",
    tables,
  };
}

const typeCache = new Map<string, Map<string, string>>();
async function columnTypes(c: pg.PoolClient | pg.Client, table: string): Promise<Map<string, string>> {
  if (!typeCache.has(table)) {
    const r = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name=$1 AND table_schema='public'", [table]);
    typeCache.set(table, new Map(r.rows.map((x) => [x.column_name, x.data_type])));
  }
  return typeCache.get(table)!;
}

/** Restores an export into an EMPTY database (isolated environment). Members are attached to
 *  new credential-less users; sign-in must be re-provisioned with `npm run member:create`. */
export async function restoreHousehold(c: pg.PoolClient | pg.Client, data: HouseholdExport): Promise<Record<string, number>> {
  if (data.format !== "table-household-export" || data.version !== 1) throw new Error("not a Table household export");
  const counts: Record<string, number> = {};
  await c.query("BEGIN");
  try {
    await c.query("SET CONSTRAINTS ALL DEFERRED");
    for (const s of EXPORT_TABLES) {
      const rows = data.tables[s.table] ?? [];
      for (const row of rows) {
        const o = { ...row };
        if (s.table === "members") {
          const uid = `restored-${o.id}`;
          await c.query(
            `INSERT INTO "user"(id, name, email, "emailVerified") VALUES ($1,$2,$3,false) ON CONFLICT (id) DO NOTHING`,
            [uid, o.display_name, `${uid}@restored.invalid`],
          );
          o.user_id = uid;
        }
        const cols = Object.keys(o);
        const types = await columnTypes(c, s.table);
        const vals = cols.map((k) =>
          types.get(k) === "jsonb" && o[k] !== null ? JSON.stringify(o[k])
            : types.get(k) === "bytea" && typeof o[k] === "string" ? Buffer.from(o[k] as string, "base64")
              : o[k]);
        await c.query(
          `INSERT INTO ${s.table} (${cols.map((k) => `"${k}"`).join(",")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(",")})`,
          vals,
        );
      }
      counts[s.table] = rows.length;
    }
    // Serial ids were restored explicitly: move their sequences past them.
    const serials = await c.query(
      `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' AND column_default LIKE 'nextval(%' AND table_name = ANY($1::text[])`,
      [EXPORT_TABLES.map((s) => s.table)],
    );
    for (const r of serials.rows) {
      await c.query(`SELECT setval(pg_get_serial_sequence($1, $2), GREATEST((SELECT COALESCE(max("${r.column_name}"), 0) FROM ${r.table_name}), 1))`, [r.table_name, r.column_name]);
    }
    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  }
  return counts;
}
