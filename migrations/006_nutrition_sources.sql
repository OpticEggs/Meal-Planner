-- B7: ingredient nutrition sources (USDA FoodData Central lookup with explicit member confirmation).
--
-- nutrition_matches is the append-only history of every nutrition decision for an ingredient:
-- a confirmed match (values exactly as reviewed, per their stated basis, with provenance) or a
-- clear (back to unknown). Each decision names the revision it created; a later decision points
-- at the one it supersedes. Nothing in it is ever updated or deleted.
--
-- ingredient_nutrition stays the single "current values" row per ingredient that calculations
-- read. A matched row points at its history row (match_id). Existing rows (the synthetic test
-- fixture, or explicit label entries) keep working and keep their labels: provenance_kind is
-- filled from `synthetic` when an insert does not name it.

CREATE TABLE nutrition_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  ingredient_key text NOT NULL,
  revision integer NOT NULL CHECK (revision >= 1),   -- the revision this decision created
  action text NOT NULL CHECK (action IN ('matched', 'cleared')),
  supersedes_id uuid UNIQUE REFERENCES nutrition_matches(id) DEFERRABLE INITIALLY DEFERRED,
  -- What the decision replaced when that was not itself a history row (e.g. a fixture row).
  replaced_source text,
  -- The FoodData Central food, as reviewed (null for a clear).
  fdc_id integer,
  data_type text CHECK (data_type IS NULL OR data_type IN ('Foundation', 'SR Legacy', 'Survey (FNDDS)', 'Branded')),
  description text,
  publication_date text,                                -- as FDC states it (format varies by data type)
  -- Basis the nutrient amounts below describe: always 100 g of the food as described.
  basis_qty numeric CHECK (basis_qty IS NULL OR basis_qty > 0),
  basis_unit text,
  form text CHECK (form IS NULL OR form IN ('raw', 'cooked', 'as_sold')),  -- chosen by the member
  -- Per nutrient: amount (NULL = unknown, never zero), unit as FDC states it, and FDC nutrient number.
  energy_kcal numeric, energy_unit text, energy_nutrient text,
  protein_g numeric, protein_unit text, protein_nutrient text,
  fat_g numeric, fat_unit text, fat_nutrient text,
  carbs_g numeric, carbs_unit text, carbs_nutrient text,
  nutrient_status jsonb,                                -- per nutrient: ok | missing | bad_unit
  -- A portion the member explicitly chose ({id, label, amount, unit, gramWeight}), else NULL.
  chosen_portion jsonb,
  provenance_kind text CHECK (provenance_kind IS NULL OR provenance_kind IN
    ('fdc_api', 'fixture_fetched_demo', 'fixture_official_example', 'fixture_synthetic', 'manual_label')),
  retrieved_at timestamptz,
  source_url_template text CHECK (source_url_template IS NULL OR source_url_template NOT ILIKE '%api_key%'),
  review_digest text,
  decided_by uuid NOT NULL REFERENCES members(id),
  decided_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (household_id, ingredient_key, revision),
  FOREIGN KEY (household_id, ingredient_key) REFERENCES ingredients(household_id, key) ON DELETE CASCADE,
  CONSTRAINT match_complete CHECK (
    action = 'cleared' OR (fdc_id IS NOT NULL AND data_type IS NOT NULL AND description IS NOT NULL AND basis_qty IS NOT NULL
      AND basis_unit IS NOT NULL AND form IS NOT NULL AND provenance_kind IS NOT NULL AND retrieved_at IS NOT NULL AND review_digest IS NOT NULL))
);
CREATE INDEX nutrition_matches_ingredient_idx ON nutrition_matches(household_id, ingredient_key, revision DESC);
CREATE TRIGGER nutrition_matches_immutable BEFORE UPDATE OR DELETE ON nutrition_matches FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

ALTER TABLE ingredient_nutrition
  ADD COLUMN match_id uuid REFERENCES nutrition_matches(id) DEFERRABLE INITIALLY DEFERRED,
  ADD COLUMN provenance_kind text,
  ADD COLUMN fdc_id integer,
  ADD COLUMN data_type text,
  ADD COLUMN retrieved_at timestamptz;

UPDATE ingredient_nutrition SET provenance_kind = CASE WHEN synthetic THEN 'fixture_synthetic' ELSE 'manual_label' END;

-- Inserts that predate B7 (the test fixture seeds rows without naming a provenance) keep working
-- and stay labeled: synthetic rows are fixture_synthetic, anything else is an explicit label entry.
CREATE FUNCTION ingredient_nutrition_provenance() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.provenance_kind IS NULL THEN
    NEW.provenance_kind := CASE WHEN NEW.synthetic THEN 'fixture_synthetic' ELSE 'manual_label' END;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ingredient_nutrition_provenance BEFORE INSERT OR UPDATE ON ingredient_nutrition
  FOR EACH ROW EXECUTE FUNCTION ingredient_nutrition_provenance();

ALTER TABLE ingredient_nutrition
  ALTER COLUMN provenance_kind SET NOT NULL,
  ADD CONSTRAINT ingredient_nutrition_provenance_kind CHECK (provenance_kind IN
    ('fdc_api', 'fixture_fetched_demo', 'fixture_official_example', 'fixture_synthetic', 'manual_label')),
  -- Fixture data is always labeled synthetic for calculations ("synthetic test data" on plates).
  ADD CONSTRAINT ingredient_nutrition_fixture_labeled CHECK (provenance_kind NOT LIKE 'fixture_%' OR synthetic),
  ADD CONSTRAINT ingredient_nutrition_fdc_match CHECK (provenance_kind NOT IN ('fdc_api', 'fixture_fetched_demo', 'fixture_official_example') OR match_id IS NOT NULL);
