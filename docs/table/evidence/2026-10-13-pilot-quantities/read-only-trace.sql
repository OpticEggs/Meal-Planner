-- Read-only: the saved rows behind three grocery lines on the open meal list (cilantro, eggs, brisket) — nothing else.
-- For the owner to run against the household database; it changes nothing (READ ONLY transaction, ROLLBACK).
-- One row per contributing recipe row: what was saved, on what serving basis, the servings selected now, and the
-- original line for an imported recipe (`From: …`). Answers given for "Needs a quantity" items are listed too.
BEGIN TRANSACTION READ ONLY;
SELECT * FROM (
  SELECT v.title AS recipe, v.provenance, v.version_no, v.created_at::date AS version_saved,
         sm.servings AS selected_servings,
         i.name AS ingredient, ri.quantity::text AS saved_per_serving, ri.unit,
         ri.quantity_basis, ri.exact_amount, ri.exact_servings, ri.note AS original_line
  FROM meal_lists ml
  JOIN selected_meals sm ON sm.list_id = ml.id AND sm.status = 'active'
  JOIN recipe_versions v ON v.id = sm.recipe_version_id
  JOIN recipe_ingredients ri ON ri.recipe_version_id = v.id
  JOIN ingredients i ON i.household_id = ml.household_id AND i.key = ri.ingredient_key
  WHERE ml.status = 'open' AND (i.name ILIKE '%cilantro%' OR i.name ILIKE '%egg%' OR i.name ILIKE '%brisket%')
  UNION ALL
  SELECT v.title, 'stated amount', v.version_no, d.decided_at::date,
         sm.servings,
         u.name, d.quantity, d.unit,
         'answer for ' || d.for_servings || ' servings', NULL, NULL, u.raw
  FROM meal_lists ml
  JOIN selected_meals sm ON sm.list_id = ml.id AND sm.status = 'active'
  JOIN recipe_versions v ON v.id = sm.recipe_version_id
  JOIN selected_meal_quantity_decisions d ON d.selected_meal_id = sm.id AND d.decision = 'amount'
  JOIN recipe_unquantified_items u ON u.id = d.item_id
  WHERE ml.status = 'open' AND (u.name ILIKE '%cilantro%' OR u.name ILIKE '%egg%' OR u.name ILIKE '%brisket%')
) t
ORDER BY ingredient, recipe;
ROLLBACK;
