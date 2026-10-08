import type { Db } from "../db/pool";

/** Per ingredient: where its current nutrition comes from (or unknown), the revision a member's
 *  next decision must name, and who made the latest decision. Read inside the snapshot. */
export async function nutritionSources(c: Db, householdId: string) {
  const r = await c.query(
    `SELECT i.key,
            n.provenance_kind, n.source, n.form, n.basis_qty, n.basis_unit, n.calories, n.protein_g, n.carbs_g, n.fat_g, n.fdc_id, n.data_type,
            n.retrieved_at, n.synthetic,
            m.description, m.chosen_portion,
            l.revision, l.action AS last_action, l.decided_at AS last_at, lm.display_name AS last_by
       FROM ingredients i
       LEFT JOIN ingredient_nutrition n ON n.household_id=i.household_id AND n.ingredient_key=i.key
       LEFT JOIN nutrition_matches m ON m.id=n.match_id
       LEFT JOIN LATERAL (SELECT x.revision, x.action, x.decided_at, x.decided_by FROM nutrition_matches x
                           WHERE x.household_id=i.household_id AND x.ingredient_key=i.key ORDER BY x.revision DESC LIMIT 1) l ON true
       LEFT JOIN members lm ON lm.id=l.decided_by
      WHERE i.household_id=$1
      ORDER BY i.name`,
    [householdId],
  );
  return r.rows.map((x) => ({
    ingredientKey: x.key as string,
    revision: (x.revision as number | null) ?? 0,
    current: x.provenance_kind
      ? {
          provenanceKind: x.provenance_kind as string, source: x.source as string, synthetic: x.synthetic as boolean, form: x.form as string,
          basisQty: x.basis_qty as string, basisUnit: x.basis_unit as string,
          calories: x.calories, proteinG: x.protein_g, carbsG: x.carbs_g, fatG: x.fat_g,
          fdcId: x.fdc_id as number | null, dataType: x.data_type as string | null, description: x.description as string | null,
          retrievedAt: x.retrieved_at ? new Date(x.retrieved_at).toISOString() : null, portion: x.chosen_portion ?? null,
        }
      : null,
    last: x.last_action ? { action: x.last_action as string, by: x.last_by as string, at: new Date(x.last_at).toISOString() } : null,
  }));
}
