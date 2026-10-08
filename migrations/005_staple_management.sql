-- B16: household staple management.
--
-- A staple is a one-tap shortcut ("our usual X"), not pantry inventory. Its details (display
-- name, usual amount, active/removed) carry details_revision; its remembered product keeps
-- product_revision (B12). Every edit names the revision it was made against; a stale edit is
-- refused, never silently applied. Removing a staple only removes the shortcut: requests already
-- captured, recipe demand, orders and transfers are untouched.

ALTER TABLE household_staples
  ADD COLUMN display_name text CHECK (display_name IS NULL OR length(btrim(display_name)) BETWEEN 1 AND 80),
  -- Usual amount in a measured unit (e.g. 64 fl_oz). NULL = the usual amount is usual_packages
  -- packages. When set, usual_packages holds the package count it converts to for the
  -- remembered product, kept in step by every command that changes either.
  ADD COLUMN usual_amount numeric CHECK (usual_amount IS NULL OR usual_amount > 0),
  ADD COLUMN usual_unit text,
  ADD COLUMN active boolean NOT NULL DEFAULT true,
  ADD COLUMN details_revision integer NOT NULL DEFAULT 1 CHECK (details_revision >= 1),
  ADD CONSTRAINT staple_amount_pair CHECK ((usual_amount IS NULL) = (usual_unit IS NULL));

-- Append-only history of staple detail changes (who changed what, against which revision).
CREATE TABLE staple_changes (
  id bigserial PRIMARY KEY,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  ingredient_key text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('created', 'edited', 'deactivated', 'restored')),
  before jsonb,
  after jsonb NOT NULL,
  details_revision integer NOT NULL,          -- the revision this change created
  changed_by uuid NOT NULL REFERENCES members(id),
  changed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (household_id, ingredient_key, details_revision)
);
CREATE TRIGGER staple_changes_immutable BEFORE UPDATE OR DELETE ON staple_changes FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
