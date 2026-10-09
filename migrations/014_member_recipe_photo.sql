-- A member's own photo of a dish (a photo they took). It needs no publisher permission, so it is kept
-- whatever the content policy says. It belongs to the RECIPE, not to a version: versions are immutable
-- and the week pins them, while a photo can be added, replaced or removed at any time.
--
-- The bytes live in the immutable recipe_images table (type sniffed, size capped there). A member
-- upload records source_url = 'member-upload:<sha256>', page_url = 'member-upload' and a permission
-- naming the member who added it. photo_revision binds a change to the photo the member last saw.
ALTER TABLE recipes
  ADD COLUMN member_photo_id uuid REFERENCES recipe_images(id),
  ADD COLUMN photo_revision integer NOT NULL DEFAULT 0 CHECK (photo_revision >= 0);
