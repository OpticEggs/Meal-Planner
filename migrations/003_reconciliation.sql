-- Corrections after the independent review of 89f3ea9 (F04, F05, F07, F08).
-- Additive only: no historical purchasing row is rewritten except the one-time backfill of
-- package basis for order lines that already name a product (done with the documented
-- fixture/maintenance bypass, inside this migration's transaction).

-- F04: a confirmed order states which immutable transfers its listed contents reconcile.
-- Transfers not listed (later, or when contents are unknown) stay accounted separately.
ALTER TABLE orders ADD COLUMN reconciles_batch_ids uuid[] NOT NULL DEFAULT '{}';

-- F05: order lines keep the confirmed product's package basis, independent of later mappings.
ALTER TABLE order_lines ADD COLUMN package_qty numeric, ADD COLUMN package_unit text;
SELECT set_config('table.allow_fixture_reset', 'on', true);
UPDATE order_lines ol SET package_qty = p.package_qty, package_unit = p.package_unit
  FROM products p WHERE p.id = ol.product_id AND ol.package_qty IS NULL;
SELECT set_config('table.allow_fixture_reset', 'off', true);

-- F05: corrections are new observations that supersede an earlier one; nothing is deleted.
ALTER TABLE receipt_observations ADD COLUMN corrects_id uuid REFERENCES receipt_observations(id);
CREATE UNIQUE INDEX receipt_corrected_once ON receipt_observations(corrects_id) WHERE corrects_id IS NOT NULL;

-- F05: a substitution covers the original need only after it is judged suitable, by amount.
CREATE TABLE substitution_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  receipt_id uuid NOT NULL REFERENCES receipt_observations(id) ON DELETE CASCADE,
  suitable boolean NOT NULL,
  quantity numeric CHECK (quantity > 0),
  unit text,
  member_id uuid NOT NULL REFERENCES members(id),
  observed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (NOT suitable OR (quantity IS NOT NULL AND unit IS NOT NULL))
);
CREATE TRIGGER substitution_validations_immutable BEFORE UPDATE OR DELETE ON substitution_validations FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- F07: remembered household staples (usual product and quantity) for one-tap capture.
CREATE TABLE household_staples (
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  ingredient_key text NOT NULL,
  usual_packages integer NOT NULL DEFAULT 1 CHECK (usual_packages BETWEEN 1 AND 50),
  product_id uuid REFERENCES products(id),
  updated_by uuid REFERENCES members(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (household_id, ingredient_key)
);

-- F08: household-wide purchasing inputs (products, mappings, prices, budget, ingredient
-- review) carry a revision; every stored projection records the revision it used.
ALTER TABLE households ADD COLUMN purchasing_revision bigint NOT NULL DEFAULT 0;
ALTER TABLE grocery_cycles ADD COLUMN projection_inputs_revision bigint NOT NULL DEFAULT 0;
