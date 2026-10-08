-- URL-to-recipe (2026-10-08 product reprioritization): what an import read from a page beyond the
-- ingredient list, and the permission under which any of the source's own content is kept.
--
-- The source's method text and photographs are kept ONLY under a recorded permission (the content
-- policy in force when the page was read; off by default). Without one, a draft records only that
-- they exist and how many there are, and the recipe links to the original page. Attribution (site,
-- author, page) is always kept.

ALTER TABLE recipe_import_drafts DROP CONSTRAINT recipe_import_drafts_method_check;
ALTER TABLE recipe_import_drafts ADD CONSTRAINT recipe_import_drafts_method_check CHECK (method IN ('json_ld','microdata','user_pasted','manual'));

-- A photograph kept under a recorded permission. Bytes are checked (type sniffed from the bytes,
-- size capped) before they are stored; they are served only to the household's members.
CREATE TABLE recipe_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('image/jpeg','image/png','image/webp','image/gif')),
  bytes bytea NOT NULL CHECK (octet_length(bytes) BETWEEN 1 AND 5242880),
  sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  source_url text NOT NULL,          -- where the bytes came from
  page_url text NOT NULL,            -- the recipe page that named it
  permission text NOT NULL,          -- the content policy that allowed keeping it, in words
  created_by uuid NOT NULL REFERENCES members(id),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX recipe_images_household ON recipe_images(household_id);
CREATE TRIGGER recipe_images_immutable BEFORE UPDATE ON recipe_images FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

ALTER TABLE recipe_import_drafts
  ADD COLUMN description text,
  ADD COLUMN source_author text,
  ADD COLUMN site_name text,
  ADD COLUMN source_step_count integer NOT NULL DEFAULT 0 CHECK (source_step_count >= 0),
  ADD COLUMN source_image_count integer NOT NULL DEFAULT 0 CHECK (source_image_count >= 0),
  ADD COLUMN source_steps jsonb,     -- the source's method, only when the content policy allowed keeping it
  ADD COLUMN image_id uuid REFERENCES recipe_images(id) DEFERRABLE INITIALLY DEFERRED,
  ADD COLUMN content_policy jsonb NOT NULL DEFAULT '{"instructions": false, "photos": false, "basis": null}';

ALTER TABLE recipe_versions
  ADD COLUMN source_author text,
  ADD COLUMN source_site_name text,
  ADD COLUMN image_id uuid REFERENCES recipe_images(id) DEFERRABLE INITIALLY DEFERRED;
