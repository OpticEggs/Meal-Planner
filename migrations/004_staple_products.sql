-- B12: remembered staple products.
--
-- A staple's remembered product ("the last approved package") changes only through the explicit
-- ApproveStapleProduct command, which names the revision it was decided against; a decision
-- made against an older revision is refused rather than silently overwriting a newer one.
-- Approving a product for a staple is a product-suitability decision; it is never an approval of
-- a purchase quantity, and it never touches orders, transfers, or purchase approvals.

-- product_revision counts product decisions only (a usual-quantity change does not conflict with one).
ALTER TABLE household_staples ADD COLUMN product_revision integer NOT NULL DEFAULT 1 CHECK (product_revision >= 1);

-- Append-only history of staple product decisions (who chose what, against which revision).
CREATE TABLE staple_product_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  ingredient_key text NOT NULL,
  product_id uuid NOT NULL REFERENCES products(id),
  previous_product_id uuid REFERENCES products(id),
  staple_revision integer NOT NULL,          -- the staple revision this decision created
  decided_by uuid NOT NULL REFERENCES members(id),
  decided_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (household_id, ingredient_key, staple_revision)
);
CREATE TRIGGER staple_product_decisions_immutable BEFORE UPDATE OR DELETE ON staple_product_decisions FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- Product intent of a household request (plan §5 "Household request: ingredient/product
-- intent"). A one-tap staple request records the staple's remembered product at capture time;
-- null = no specific product (the household's current product choice for the ingredient applies).
ALTER TABLE household_requests ADD COLUMN product_id uuid REFERENCES products(id);
