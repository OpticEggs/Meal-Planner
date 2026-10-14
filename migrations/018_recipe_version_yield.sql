-- B51 (owner-authorized 2026-10-14, D159): the servings a recipe version's ingredient amounts make — its original
-- yield — recorded on the version itself, independently of the ingredient rows. Additive only: one nullable column,
-- no default, NOTHING backfilled. Existing versions keep NULL ("not recorded") and are read as before (from their exact
-- rows when those agree); no ingredient row, quantity or basis changes. Versions stay immutable: a yield is set only
-- when a version is written.
ALTER TABLE recipe_versions ADD COLUMN servings integer;
ALTER TABLE recipe_versions ADD CONSTRAINT recipe_versions_servings_range CHECK (servings IS NULL OR servings BETWEEN 1 AND 1000);
