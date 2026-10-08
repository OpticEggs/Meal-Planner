-- Cook-record idempotency (delivery review of fb4d771, gate 2).
--
-- One cooking event has at most one EFFECTIVE "cooked" record. Repeated presses are refused by the
-- command (RecordCooked → already_recorded); this index is the database backstop. A mistaken record
-- is never deleted or edited: an appended correction voids it, and cooking may then be recorded
-- again under the next generation. Records that already duplicated an earlier one for the same
-- event (possible before this migration) are kept and marked as duplicates of the earliest.

ALTER TABLE cook_records
  ADD COLUMN generation integer NOT NULL DEFAULT 1 CHECK (generation >= 1),
  ADD COLUMN duplicate_of uuid CONSTRAINT cook_records_duplicate_of_fkey REFERENCES cook_records(id) DEFERRABLE INITIALLY DEFERRED;  -- restore may insert rows in any order

-- Checked immediately inside this migration, so no deferred check is pending when the index is built.
SET CONSTRAINTS cook_records_duplicate_of_fkey IMMEDIATE;

-- Existing duplicates: keep every row; the earliest per event stays effective, later ones point at it.
WITH ranked AS (
  SELECT id, cooking_event_id,
         first_value(id) OVER (PARTITION BY cooking_event_id ORDER BY recorded_at, id) AS keep_id
  FROM cook_records WHERE cooking_event_id IS NOT NULL
)
UPDATE cook_records cr SET duplicate_of = r.keep_id
FROM ranked r WHERE r.id = cr.id AND r.id <> r.keep_id;

CREATE UNIQUE INDEX cook_records_one_per_event_generation
  ON cook_records(cooking_event_id, generation) WHERE cooking_event_id IS NOT NULL AND duplicate_of IS NULL;

-- Corrections are append-only; at most one per record.
CREATE TABLE cook_record_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  cook_record_id uuid NOT NULL UNIQUE REFERENCES cook_records(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('not_cooked')),
  corrected_by uuid NOT NULL REFERENCES members(id),
  corrected_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TRIGGER cook_record_corrections_immutable BEFORE UPDATE OR DELETE ON cook_record_corrections FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- From now on cook records themselves are append-only too (the migration above was the last update).
CREATE TRIGGER cook_records_immutable BEFORE UPDATE OR DELETE ON cook_records FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- What every reader uses: effective records only (not a duplicate, not corrected).
CREATE VIEW cook_records_effective AS
  SELECT cr.* FROM cook_records cr
  WHERE cr.duplicate_of IS NULL
    AND NOT EXISTS (SELECT 1 FROM cook_record_corrections k WHERE k.cook_record_id = cr.id);
