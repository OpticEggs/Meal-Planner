-- Read-only quantity trace for ONE household's open selected-meals list (pilot lines: cilantro, eggs, brisket).
-- For the owner to run in the Neon SQL editor. Both steps are READ ONLY transactions ending in ROLLBACK: nothing is
-- written, nothing is kept. Share only Step B's result rows (no ids are needed in what you share).

-- ── Step A — find your household and its open list (names, counts and dates only) ─────────────────────────────
BEGIN TRANSACTION READ ONLY;
SELECT h.id AS household_id, h.name AS household, h.fixture,
       ml.id AS list_id, ml.opened_at::date AS list_opened,
       (SELECT count(*) FROM selected_meals sm WHERE sm.list_id = ml.id AND sm.status = 'active') AS selected_meals
FROM households h
JOIN meal_lists ml ON ml.household_id = h.id AND ml.status = 'open'
ORDER BY h.created_at;
ROLLBACK;

-- ── Step B — the rows behind the three lines, for that household and list only ───────────────────────────────
-- Replace both placeholders with the two ids from Step A (keep the quotes).
BEGIN TRANSACTION READ ONLY;
WITH target AS (
  SELECT ml.id AS list_id, ml.household_id
  FROM meal_lists ml
  WHERE ml.id = 'PASTE-list_id-HERE' AND ml.household_id = 'PASTE-household_id-HERE' AND ml.status = 'open'
),
rows AS (
  -- Saved recipe rows (the recipe as it was selected: the selected meal's own version).
  SELECT v.title AS recipe, v.provenance, v.version_no, v.created_at::date AS version_saved,
         sm.servings AS selected_servings,
         i.name AS ingredient, ri.unit,
         ri.quantity::text AS saved_per_serving,
         ri.quantity_basis, ri.exact_amount, ri.exact_servings,
         CASE WHEN ri.quantity_basis = 'exact'
              THEN (split_part(ri.exact_amount, '/', 1)::numeric / COALESCE(NULLIF(split_part(ri.exact_amount, '/', 2), '')::numeric, 1))
                   / ri.exact_servings * sm.servings
              ELSE ri.quantity * sm.servings END AS requirement_now,
         ri.note AS original_line
  FROM target t
  JOIN selected_meals sm ON sm.list_id = t.list_id AND sm.status = 'active'
  JOIN recipe_versions v ON v.id = sm.recipe_version_id
  JOIN recipe_ingredients ri ON ri.recipe_version_id = v.id
  JOIN ingredients i ON i.household_id = t.household_id AND i.key = ri.ingredient_key
  WHERE i.name ILIKE '%cilantro%' OR i.name ILIKE '%egg%' OR i.name ILIKE '%brisket%'
  UNION ALL
  -- Amounts a member gave for a "Needs a quantity" item (counted only when given for the servings selected now).
  SELECT v.title, 'stated amount', v.version_no, d.decided_at::date,
         sm.servings,
         u.name, d.unit,
         d.quantity, 'answer for ' || d.for_servings || ' servings', NULL, NULL,
         CASE WHEN d.for_servings = sm.servings
              THEN split_part(d.quantity, '/', 1)::numeric / COALESCE(NULLIF(split_part(d.quantity, '/', 2), '')::numeric, 1) END,
         u.raw
  FROM target t
  JOIN selected_meals sm ON sm.list_id = t.list_id AND sm.status = 'active'
  JOIN recipe_versions v ON v.id = sm.recipe_version_id
  JOIN selected_meal_quantity_decisions d ON d.selected_meal_id = sm.id AND d.decision = 'amount'
  JOIN recipe_unquantified_items u ON u.id = d.item_id
  WHERE u.name ILIKE '%cilantro%' OR u.name ILIKE '%egg%' OR u.name ILIKE '%brisket%'
)
SELECT recipe, provenance, version_no, version_saved, selected_servings, ingredient, unit,
       saved_per_serving, quantity_basis, exact_amount, exact_servings,
       round(requirement_now, 3) AS requirement_now,
       round(requirement_now * CASE lower(unit) WHEN 'g' THEN 1 WHEN 'kg' THEN 1000 WHEN 'oz' THEN 28.349523125
                                              WHEN 'lb' THEN 453.59237 END, 3) AS grams_if_mass,
       original_line
FROM rows
ORDER BY ingredient, recipe;
ROLLBACK;
