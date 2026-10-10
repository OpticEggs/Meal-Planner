-- EQ (2026-10-10): exact quantities for NEW recipe versions. Additive only.
--
-- A recipe ingredient row has always stored `quantity` per ONE portion as a decimal. Where that division
-- does not end (2 onions for 3 servings) the decimal is an approximation. A row saved from now on also keeps
-- the exact amount it came from and its serving basis, and purchasing computes with exact_amount ÷
-- exact_servings instead of the decimal:
--   quantity_basis = 'exact'   exact_amount is the reduced fraction "n" or "n/d" for ALL exact_servings
--                              portions (an imported line: the whole recipe and its servings; a member's typed
--                              per-portion decimal: that decimal over 1), and `quantity` is that value per
--                              portion, exact or rounded toward zero at 12 places.
--   quantity_basis = 'legacy'  `quantity` is all there is (every row written before this migration, and any
--                              row an earlier release writes after it): a legacy approximation, used as stored.
--
-- No existing row is changed: the column default is applied without rewriting rows (no UPDATE runs, so the
-- immutability trigger on recipe_ingredients is not involved), and nothing is backfilled. An earlier release
-- keeps working on this schema: it neither reads nor writes these columns, and its new rows are 'legacy'.

ALTER TABLE recipe_ingredients
  ADD COLUMN quantity_basis text NOT NULL DEFAULT 'legacy',
  ADD COLUMN exact_amount text,
  ADD COLUMN exact_servings integer;

ALTER TABLE recipe_ingredients
  ADD CONSTRAINT recipe_ingredients_quantity_basis_known CHECK (quantity_basis IN ('legacy', 'exact')),
  -- Legacy rows carry no exact fields; exact rows carry both.
  ADD CONSTRAINT recipe_ingredients_exact_fields CHECK (
    (quantity_basis = 'legacy' AND exact_amount IS NULL AND exact_servings IS NULL)
    OR (quantity_basis = 'exact' AND exact_amount IS NOT NULL AND exact_servings IS NOT NULL)
  ),
  -- "n" or "n/d", positive, reduced (gcd 1, d > 1), bounded in length; servings a positive whole number.
  ADD CONSTRAINT recipe_ingredients_exact_shape CHECK (
    exact_amount IS NULL OR (
      exact_amount ~ '^[1-9][0-9]{0,17}(/[1-9][0-9]{0,17})?$'
      AND (position('/' in exact_amount) = 0 OR (
        split_part(exact_amount, '/', 2)::numeric > 1
        AND gcd(split_part(exact_amount, '/', 1)::numeric, split_part(exact_amount, '/', 2)::numeric) = 1
      ))
      AND exact_servings BETWEEN 1 AND 1000
    )
  ),
  -- The stored decimal is the exact per-portion value, or that value rounded toward zero at 12 places.
  ADD CONSTRAINT recipe_ingredients_exact_matches_quantity CHECK (
    exact_amount IS NULL OR (
      quantity <= split_part(exact_amount, '/', 1)::numeric / (coalesce(nullif(split_part(exact_amount, '/', 2), ''), '1')::numeric * exact_servings)
      AND split_part(exact_amount, '/', 1)::numeric / (coalesce(nullif(split_part(exact_amount, '/', 2), ''), '1')::numeric * exact_servings) - quantity < 0.000000000001
    )
  );
