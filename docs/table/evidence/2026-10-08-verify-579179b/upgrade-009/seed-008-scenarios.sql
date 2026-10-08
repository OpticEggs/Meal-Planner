-- Scenarios planted on a populated schema-008 database with raw SQL (as a writer outside the command could).
-- E1 valid chain; E2 cross-generation violation (allowed by 008); E3 historical duplicate; E4 single;
-- E5 valid 3-link chain; E6 violation after a valid link.
CREATE TEMP TABLE ev AS SELECT id, household_id, recipe_version_id, cook_night,
  CASE cook_night WHEN '2026-10-12' THEN 'E1' WHEN '2026-10-14' THEN 'E2' WHEN '2026-10-17' THEN 'E4' WHEN '2026-10-18' THEN 'E5' END AS tag
FROM cooking_events WHERE status='scheduled' AND cook_night IN ('2026-10-12','2026-10-14','2026-10-17','2026-10-18');
INSERT INTO ev SELECT id, household_id, recipe_version_id, cook_night, 'E3' FROM cooking_events WHERE status='scheduled' AND cook_night='2026-10-16';
INSERT INTO ev SELECT id, household_id, recipe_version_id, cook_night, 'E6' FROM cooking_events WHERE status='retired';
CREATE TEMP TABLE m AS SELECT id, household_id FROM members ORDER BY display_name LIMIT 1;
CREATE FUNCTION pg_temp.rec(t text, g int, dup uuid DEFAULT NULL) RETURNS uuid LANGUAGE sql AS $$
  INSERT INTO cook_records(household_id, cooking_event_id, recipe_version_id, recorded_by, cooked_on, generation, duplicate_of)
  SELECT ev.household_id, ev.id, ev.recipe_version_id, (SELECT id FROM m), ev.cook_night, g, dup FROM ev WHERE tag=t RETURNING id $$;
CREATE FUNCTION pg_temp.corr(r uuid) RETURNS void LANGUAGE sql AS $$
  INSERT INTO cook_record_corrections(household_id, cook_record_id, reason, corrected_by)
  SELECT household_id, id, 'not_cooked', recorded_by FROM cook_records WHERE id=r $$;
DO $$ DECLARE a uuid; b uuid; c uuid; BEGIN
  a := pg_temp.rec('E1',1); PERFORM pg_temp.corr(a); b := pg_temp.rec('E1',2);
  a := pg_temp.rec('E2',1); b := pg_temp.rec('E2',2);
  a := pg_temp.rec('E3',1); b := pg_temp.rec('E3',1,a);
  a := pg_temp.rec('E4',1);
  a := pg_temp.rec('E5',1); PERFORM pg_temp.corr(a); b := pg_temp.rec('E5',2); PERFORM pg_temp.corr(b); c := pg_temp.rec('E5',3);
  a := pg_temp.rec('E6',1); PERFORM pg_temp.corr(a); b := pg_temp.rec('E6',2); c := pg_temp.rec('E6',3);
END $$;
