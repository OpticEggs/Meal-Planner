-- Recipe sources (multi-source handoff, phases 1–3): shared URL bookmarks, who saved them, and
-- member-reviewed import drafts. A bookmark is NOT a recipe: it never enters planning, groceries or
-- the accepted week. An import draft is NOT a recipe version either; only a member's confirmation
-- turns a complete draft into an immutable recipe version (provenance 'imported', source URL kept).
-- No page HTML, photographs or authored instructions are stored.

CREATE TABLE recipe_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  url_key text NOT NULL,            -- normalized for de-duplication (tracking parameters, www., scheme, trailing slash)
  url text NOT NULL,                -- the cleaned link members open
  domain text NOT NULL,
  source_label text NOT NULL,
  title text,                       -- member-entered only
  status text NOT NULL DEFAULT 'saved'
    CHECK (status IN ('saved','import_draft','imported','unavailable','unsupported','permission_blocked')),
  status_detail text,
  recipe_id uuid REFERENCES recipes(id) DEFERRABLE INITIALLY DEFERRED,
  revision integer NOT NULL DEFAULT 1,
  created_by uuid NOT NULL REFERENCES members(id),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  last_checked_at timestamptz,
  archived_at timestamptz,
  archived_by uuid REFERENCES members(id),
  UNIQUE (household_id, url_key)
);

-- Every save of a link, by whom and with what note: two members saving the same page both keep their note.
CREATE TABLE recipe_bookmark_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  bookmark_id uuid NOT NULL REFERENCES recipe_bookmarks(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id),
  submitted_url text NOT NULL,
  note text,
  saved_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX recipe_bookmark_saves_bookmark ON recipe_bookmark_saves(bookmark_id);
CREATE TRIGGER recipe_bookmark_saves_immutable BEFORE UPDATE OR DELETE ON recipe_bookmark_saves FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

CREATE TABLE recipe_import_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  bookmark_id uuid NOT NULL REFERENCES recipe_bookmarks(id) DEFERRABLE INITIALLY DEFERRED,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','confirmed','discarded')),
  method text NOT NULL CHECK (method IN ('json_ld','user_pasted','manual')),
  extractor_version text NOT NULL,
  source_url text NOT NULL,
  fetched_url text,                 -- final URL after validated redirects (json_ld only)
  title text,
  yield_text text,
  servings integer CHECK (servings IS NULL OR servings BETWEEN 1 AND 100),
  effort_minutes integer CHECK (effort_minutes IS NULL OR effort_minutes BETWEEN 1 AND 1440),
  source_has_instructions boolean NOT NULL DEFAULT false,   -- the method stays on the source site
  source_has_nutrition boolean NOT NULL DEFAULT false,      -- never imported or used for targets
  lines jsonb NOT NULL DEFAULT '[]',                        -- original line, parse, review decision
  problems jsonb NOT NULL DEFAULT '[]',
  household_instructions text NOT NULL DEFAULT '',          -- typed by a member, not copied
  revision integer NOT NULL DEFAULT 1,
  created_by uuid NOT NULL REFERENCES members(id),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_by uuid REFERENCES members(id),
  updated_at timestamptz,
  confirmed_version_id uuid REFERENCES recipe_versions(id) DEFERRABLE INITIALLY DEFERRED  -- restore may insert in any order
);
CREATE UNIQUE INDEX recipe_import_drafts_one_open ON recipe_import_drafts(bookmark_id) WHERE status = 'open';

-- Imported recipe versions: provenance and the source they came from (immutable with the version).
ALTER TABLE recipe_versions DROP CONSTRAINT recipe_versions_provenance_check;
ALTER TABLE recipe_versions ADD CONSTRAINT recipe_versions_provenance_check CHECK (provenance IN ('fixture','sample','manual','imported'));
ALTER TABLE recipe_versions ADD COLUMN source_url text, ADD COLUMN import_draft_id uuid REFERENCES recipe_import_drafts(id) DEFERRABLE INITIALLY DEFERRED;
