-- B21: the database keeps at most one EFFECTIVE cooking record per cooking event, across generations
-- and for any writer (inside or outside Table's command framework, at any isolation level).
--
-- Each non-duplicate record of an event is a link in one chain: the first names no predecessor
-- (`replaces IS NULL`), and every later record names the record it replaces, which must belong to the
-- same event, be the previous generation, and carry a correction. Two unique indexes make the chain
-- linear — one first record per event, one successor per record — and unique indexes are enforced
-- for concurrent inserts by PostgreSQL itself (a second inserter waits for the first and then fails),
-- whatever the isolation level. Because corrections and records are append-only, a record that has a
-- successor stays corrected for ever, so only the last link can be effective.
--
-- Historical duplicates (`duplicate_of`, migration 008) are outside the chain and never effective.

ALTER TABLE cook_records
  ADD COLUMN replaces uuid CONSTRAINT cook_records_replaces_fkey REFERENCES cook_records(id) DEFERRABLE INITIALLY DEFERRED;  -- restore may insert rows in any order
-- Checked immediately inside this migration, so no deferred check is pending when the indexes are built.
SET CONSTRAINTS cook_records_replaces_fkey, cook_records_duplicate_of_fkey IMMEDIATE;

-- Link records written before this migration. Generation k is a valid successor only if generation
-- k-1 is a valid link and was corrected. A record that is not a valid successor (possible only by a
-- direct write under migration 008) is kept and marked a duplicate of the event's last valid record,
-- as migration 008 did for same-generation duplicates — nothing is removed.
ALTER TABLE cook_records DISABLE TRIGGER cook_records_immutable;

WITH RECURSIVE chain AS (
  SELECT cr.id, cr.cooking_event_id, cr.generation, NULL::uuid AS prev
  FROM cook_records cr
  WHERE cr.cooking_event_id IS NOT NULL AND cr.duplicate_of IS NULL AND cr.generation = 1
  UNION ALL
  SELECT nx.id, nx.cooking_event_id, nx.generation, ch.id
  FROM chain ch
  JOIN cook_records nx ON nx.cooking_event_id = ch.cooking_event_id AND nx.duplicate_of IS NULL AND nx.generation = ch.generation + 1
  WHERE EXISTS (SELECT 1 FROM cook_record_corrections k WHERE k.cook_record_id = ch.id)
)
UPDATE cook_records cr SET replaces = ch.prev FROM chain ch WHERE ch.id = cr.id AND ch.prev IS NOT NULL;

WITH chain AS (
  -- after the update above: the valid links are the generation-1 heads and everything with `replaces`
  SELECT id, cooking_event_id, generation FROM cook_records
  WHERE cooking_event_id IS NOT NULL AND duplicate_of IS NULL AND (generation = 1 OR replaces IS NOT NULL)
), last_link AS (
  SELECT DISTINCT ON (cooking_event_id) cooking_event_id, id FROM chain ORDER BY cooking_event_id, generation DESC
)
UPDATE cook_records cr SET duplicate_of = l.id
FROM last_link l
WHERE cr.cooking_event_id = l.cooking_event_id AND cr.duplicate_of IS NULL AND cr.id <> l.id
  AND NOT (cr.generation = 1 OR cr.replaces IS NOT NULL);

ALTER TABLE cook_records ENABLE TRIGGER cook_records_immutable;

-- One first record per event; one successor per record.
CREATE UNIQUE INDEX cook_records_one_first_per_event
  ON cook_records(cooking_event_id) WHERE cooking_event_id IS NOT NULL AND duplicate_of IS NULL AND replaces IS NULL;
CREATE UNIQUE INDEX cook_records_one_successor
  ON cook_records(replaces) WHERE replaces IS NOT NULL AND duplicate_of IS NULL;

-- The link rules, checked when the inserting transaction commits (so a restore may insert a record
-- before the record it replaces and its correction). A correction that is not yet committed is not
-- visible here, so a re-record racing it is refused, never let through.
CREATE FUNCTION cook_records_check_link() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  prev record;
BEGIN
  IF NEW.duplicate_of IS NOT NULL OR NEW.cooking_event_id IS NULL THEN
    IF NEW.replaces IS NOT NULL THEN
      RAISE EXCEPTION 'a duplicate or unplanned cooking record cannot replace another (record %)', NEW.id USING ERRCODE = 'check_violation';
    END IF;
    RETURN NULL;
  END IF;
  IF NEW.replaces IS NULL THEN
    IF NEW.generation <> 1 THEN
      RAISE EXCEPTION 'a first cooking record for an event is generation 1 (record %, generation %)', NEW.id, NEW.generation USING ERRCODE = 'check_violation';
    END IF;
    RETURN NULL;
  END IF;
  SELECT id, cooking_event_id, generation, duplicate_of INTO prev FROM cook_records WHERE id = NEW.replaces;
  IF NOT FOUND OR prev.cooking_event_id IS DISTINCT FROM NEW.cooking_event_id OR prev.duplicate_of IS NOT NULL THEN
    RAISE EXCEPTION 'cooking record % must replace a record of the same cooking event', NEW.id USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.generation <> prev.generation + 1 THEN
    RAISE EXCEPTION 'cooking record % must be generation % (it replaces generation %)', NEW.id, prev.generation + 1, prev.generation USING ERRCODE = 'check_violation';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM cook_record_corrections k WHERE k.cook_record_id = NEW.replaces) THEN
    RAISE EXCEPTION 'cooking record % replaces record %, which has not been corrected: an event has one effective cooking record', NEW.id, NEW.replaces
      USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER cook_records_link_check
  AFTER INSERT ON cook_records DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION cook_records_check_link();
