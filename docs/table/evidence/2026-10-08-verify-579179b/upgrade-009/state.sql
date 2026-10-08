-- per scenario: generation, corrected?, duplicate_of set?, effective?  (+ replaces when the column exists)
SELECT e.cook_night, cr.generation,
       EXISTS (SELECT 1 FROM cook_record_corrections k WHERE k.cook_record_id=cr.id) AS corrected,
       cr.duplicate_of IS NOT NULL AS duplicate,
       EXISTS (SELECT 1 FROM cook_records_effective x WHERE x.id=cr.id) AS effective,
       md5(row(cr.id, cr.household_id, cr.cooking_event_id, cr.recipe_version_id, cr.recorded_by, cr.cooked_on, cr.recorded_at, cr.generation)::text) AS original_columns
FROM cook_records cr JOIN cooking_events e ON e.id=cr.cooking_event_id ORDER BY e.cook_night, e.status, cr.recorded_at;
SELECT 'effective per event' AS check, cooking_event_id, count(*) FROM cook_records_effective GROUP BY 2 HAVING count(*) > 1;
