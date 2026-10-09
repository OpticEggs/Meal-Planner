-- B10: an explicit partial grocery handoff. A batch records whether it was the whole reviewed list or a
-- member-chosen subset, and — for a subset — exactly which requirements were left out and why, as they
-- were reviewed. Both are written once with the batch (handoff_batches stays immutable).
ALTER TABLE handoff_batches
  ADD COLUMN scope text NOT NULL DEFAULT 'full' CHECK (scope IN ('full','partial')),
  ADD COLUMN omissions jsonb CHECK ((scope = 'full' AND omissions IS NULL) OR (scope = 'partial' AND jsonb_typeof(omissions) = 'object'));
