import { Reject, runCommand, type Actor } from "./framework";

// Saved household inputs. Everything starts unset; nothing is copied from the prototype.

export interface SettingsPayload {
  storeLabel?: string | null;
  budgetScope?: "pickup" | "dinner_ingredients" | null;
  budgetLimitMinor?: number | null;
  budgetFirm?: boolean;
  equipment?: string[];
  cookingSessions?: number | null;
  variety?: "familiar" | "balanced" | "adventurous" | null;
  maxNewRecipes?: number | null;
  maxEffort?: "easy" | "medium" | "involved" | null;
  expectedRevision: number;
}

export function updateSettingsCommand(actor: Actor, operationId: string, p: SettingsPayload) {
  return runCommand(actor, "UpdateSettings", operationId, p, async (c) => {
    await c.query("INSERT INTO household_settings(household_id) VALUES ($1) ON CONFLICT DO NOTHING", [actor.householdId]);
    const cur = await c.query("SELECT * FROM household_settings WHERE household_id=$1", [actor.householdId]);
    const s = cur.rows[0];
    if (p.expectedRevision !== s.revision) {
      throw new Reject("stale_target", "Household settings changed since you opened them. Review again.");
    }
    const v = (k: keyof SettingsPayload, col: string) => (k in p ? p[k] : s[col]);
    if (p.budgetLimitMinor != null && (!Number.isInteger(p.budgetLimitMinor) || p.budgetLimitMinor < 0)) throw new Reject("invalid", "Budget must be whole cents");
    if (p.cookingSessions != null && (p.cookingSessions < 1 || p.cookingSessions > 7)) throw new Reject("invalid", "Cooking sessions must be 1-7");
    try {
      await c.query(
        `UPDATE household_settings SET store_label=$2, budget_scope=$3, budget_limit_minor=$4, budget_firm=$5, equipment=$6, cooking_sessions=$7,
           variety=$8, max_new_recipes=$9, max_effort=$10, revision=revision+1, updated_at=now() WHERE household_id=$1`,
        [
          actor.householdId, v("storeLabel", "store_label"), v("budgetScope", "budget_scope"), v("budgetLimitMinor", "budget_limit_minor"),
          v("budgetFirm", "budget_firm"), (v("equipment", "equipment") as string[]).map((e) => String(e).slice(0, 40)).slice(0, 30),
          v("cookingSessions", "cooking_sessions"), v("variety", "variety"), v("maxNewRecipes", "max_new_recipes"), v("maxEffort", "max_effort"),
        ],
      );
    } catch (e) {
      throw new Reject("invalid", `Invalid setting: ${(e as Error).message}`);
    }
    const weeks = await c.query("SELECT id FROM weeks WHERE household_id=$1 AND accepted_choice_revision > 0", [actor.householdId]);
    return {
      status: "accepted", result: {},
      change: { summary: { type: "settings", text: `${actor.displayName} updated household settings` } },
      recomputeWeeks: weeks.rows.map((w) => w.id), // budget status may change; selected dinners never do
    };
  });
}

export function setTargetsCommand(
  actor: Actor,
  operationId: string,
  p: { scope: "daily" | "dinner"; calories: string | null; proteinG: string | null; carbsG: string | null; fatG: string | null },
) {
  return runCommand(actor, "SetTargets", operationId, p, async (c) => {
    if (p.scope !== "daily" && p.scope !== "dinner") throw new Reject("invalid", "Scope must be daily or dinner");
    for (const v of [p.calories, p.proteinG, p.carbsG, p.fatG]) if (v !== null && v !== "" && !/^\d+(\.\d+)?$/.test(String(v))) throw new Reject("invalid", "Targets must be numbers or empty");
    const n = (v: string | null) => (v === "" || v === null ? null : v);
    // Targets belong to the member who is signed in; one member cannot set the other's.
    await c.query(
      `INSERT INTO member_targets(member_id, scope, calories, protein_g, carbs_g, fat_g) VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (member_id, scope) DO UPDATE SET calories=EXCLUDED.calories, protein_g=EXCLUDED.protein_g, carbs_g=EXCLUDED.carbs_g,
         fat_g=EXCLUDED.fat_g, revision=member_targets.revision+1, updated_at=now()`,
      [actor.memberId, p.scope, n(p.calories), n(p.proteinG), n(p.carbsG), n(p.fatG)],
    );
    return { status: "accepted", result: {}, change: { summary: { type: "targets", text: `${actor.displayName} updated ${p.scope} targets` } } };
  });
}

export function addExclusionCommand(actor: Actor, operationId: string, p: { term: string; memberId: string | null }) {
  return runCommand(actor, "AddExclusion", operationId, p, async (c) => {
    const term = String(p.term ?? "").trim().toLowerCase().replace(/\s+/g, "_").slice(0, 60);
    if (!term) throw new Reject("invalid", "Exclusion term required");
    if (p.memberId) {
      const m = await c.query("SELECT 1 FROM members WHERE id=$1 AND household_id=$2", [p.memberId, actor.householdId]);
      if (!m.rowCount) throw new Reject("not_found", "Member not found");
    }
    await c.query("INSERT INTO exclusions(household_id, member_id, term, created_by) VALUES ($1,$2,$3,$4)", [actor.householdId, p.memberId, term, actor.memberId]);
    return {
      status: "accepted", result: {},
      // Flags existing dinners via constraint validation; never replaces them.
      change: { summary: { type: "exclusion", text: `${actor.displayName} added an exclusion: ${term}` } },
    };
  });
}

export function removeExclusionCommand(actor: Actor, operationId: string, p: { exclusionId: string }) {
  return runCommand(actor, "RemoveExclusion", operationId, p, async (c) => {
    const r = await c.query("UPDATE exclusions SET removed_at=now() WHERE id=$1 AND household_id=$2 AND removed_at IS NULL RETURNING term", [p.exclusionId, actor.householdId]);
    if (!r.rowCount) throw new Reject("not_found", "Exclusion not found");
    return { status: "accepted", result: {}, change: { summary: { type: "exclusion", text: `${actor.displayName} removed exclusion ${r.rows[0].term}` } } };
  });
}
