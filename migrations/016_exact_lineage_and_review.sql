-- EQR (2026-10-10): corrections to exact quantities. Additive only; migration 015 is not edited (it may already
-- be applied somewhere). No existing row is changed and nothing is backfilled.
--
-- 1. Row lineage. A recipe ingredient row saved by an edit records the row of an earlier version of the SAME recipe
--    it came from (verified by the server: same recipe and household, a version no newer than the one the member
--    reviewed, each source row used once). An unchanged number keeps that row's own quantity basis; a changed
--    number or a new row (no source) is exact as typed. Nothing is inferred from another row with an equal number.
--    Rows saved before this migration, by imports, by new recipes, or by an earlier release have no source.
ALTER TABLE recipe_ingredients
  ADD COLUMN source_row_id uuid REFERENCES recipe_ingredients(id) DEFERRABLE INITIALLY DEFERRED;

-- 2. What "Have enough" certified, exactly. 'current_requirement': the member reviewed the line as it is (their
--    fingerprint matched) and certified its exact requirement, a reduced fraction in reviewed_unit.
--    'shown_decimal': the review was of an older line (or carried no fingerprint), so the observation certifies
--    exactly the decimal that was shown — never the server's newer, larger requirement. Observations recorded
--    before this migration keep reviewed_exact NULL and are compared as before (documented, unchanged).
ALTER TABLE availability_observations
  ADD COLUMN reviewed_exact text,
  ADD COLUMN reviewed_binding text;
ALTER TABLE availability_observations
  ADD CONSTRAINT availability_reviewed_binding_known CHECK (reviewed_binding IS NULL OR reviewed_binding IN ('current_requirement', 'shown_decimal')),
  ADD CONSTRAINT availability_reviewed_exact_with_binding CHECK ((reviewed_exact IS NULL) = (reviewed_binding IS NULL)),
  ADD CONSTRAINT availability_reviewed_exact_shape CHECK (
    reviewed_exact IS NULL OR (
      reviewed_exact ~ '^(0|[1-9][0-9]{0,39})(/[1-9][0-9]{0,39})?$'
      AND reviewed_unit IS NOT NULL
      AND (position('/' in reviewed_exact) = 0 OR (
        split_part(reviewed_exact, '/', 2)::numeric > 1
        AND gcd(split_part(reviewed_exact, '/', 1)::numeric, split_part(reviewed_exact, '/', 2)::numeric) = 1
      ))
    )
  );
