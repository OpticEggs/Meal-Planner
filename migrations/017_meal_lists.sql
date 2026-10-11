-- Catalog-first meal selection (2026-10-11, CATALOG-FIRST-PLAN.md §0). Additive only: no existing row changes meaning,
-- nothing is backfilled, and every existing week stays a dated calendar week.
--
-- 1. A meal list is a household's day-free shopping list. It owns an UNDATED bookkeeping week row (kind 'meal_list',
--    week_start NULL) and therefore its own grocery cycle, so all purchasing (availability, approvals, transfers,
--    orders, receipts) stays cycle-scoped and unchanged, and calendar dinners can never enter a list's cycle.
--    Calendar lookups find weeks by week_start, which a NULL never matches.
ALTER TABLE weeks ADD COLUMN kind text NOT NULL DEFAULT 'calendar';
ALTER TABLE weeks ALTER COLUMN week_start DROP NOT NULL;
ALTER TABLE weeks
  ADD CONSTRAINT weeks_kind_known CHECK (kind IN ('calendar', 'meal_list')),
  ADD CONSTRAINT weeks_kind_dated CHECK ((kind = 'calendar') = (week_start IS NOT NULL));

-- Calendar facts (cooking events, night assignments, proposals, previews) exist only on calendar weeks.
CREATE FUNCTION calendar_week_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT kind FROM weeks WHERE id = NEW.week_id) IS DISTINCT FROM 'calendar' THEN
    RAISE EXCEPTION '% belongs to calendar weeks only', TG_TABLE_NAME;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER cooking_events_calendar_only BEFORE INSERT OR UPDATE OF week_id ON cooking_events FOR EACH ROW EXECUTE FUNCTION calendar_week_only();
CREATE TRIGGER assignments_calendar_only BEFORE INSERT OR UPDATE OF week_id ON assignments FOR EACH ROW EXECUTE FUNCTION calendar_week_only();
CREATE TRIGGER proposals_calendar_only BEFORE INSERT OR UPDATE OF week_id ON proposals FOR EACH ROW EXECUTE FUNCTION calendar_week_only();
CREATE TRIGGER previews_calendar_only BEFORE INSERT OR UPDATE OF week_id ON previews FOR EACH ROW EXECUTE FUNCTION calendar_week_only();

CREATE TABLE meal_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  week_id uuid NOT NULL UNIQUE REFERENCES weeks(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  revision integer NOT NULL DEFAULT 1,
  opened_by uuid NOT NULL REFERENCES members(id),
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_by uuid REFERENCES members(id),
  closed_at timestamptz,
  CHECK ((status = 'closed') = (closed_at IS NOT NULL))
);
-- One open list per household: "the" current selection both members see.
CREATE UNIQUE INDEX one_open_meal_list ON meal_lists(household_id) WHERE status = 'open';

CREATE FUNCTION meal_list_week_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT kind FROM weeks WHERE id = NEW.week_id) IS DISTINCT FROM 'meal_list' THEN
    RAISE EXCEPTION 'a meal list needs its own undated week';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER meal_lists_week_kind BEFORE INSERT OR UPDATE OF week_id ON meal_lists FOR EACH ROW EXECUTE FUNCTION meal_list_week_only();

-- 2. Selected meals: a recipe, pinned to one immutable version, with planned servings. A recipe is active at most once
--    per list (adding it again changes its servings). Removing keeps the row (status 'removed').
CREATE TABLE selected_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  list_id uuid NOT NULL REFERENCES meal_lists(id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES recipes(id),
  recipe_version_id uuid NOT NULL REFERENCES recipe_versions(id),
  servings integer NOT NULL CHECK (servings BETWEEN 1 AND 48),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'removed')),
  revision integer NOT NULL DEFAULT 1,
  added_by uuid NOT NULL REFERENCES members(id),
  added_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NOT NULL REFERENCES members(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX one_active_selection_per_recipe ON selected_meals(list_id, recipe_id) WHERE status = 'active';
CREATE INDEX selected_meals_list_idx ON selected_meals(list_id);

-- 3. Ingredients a recipe names without an amount ("Needs a quantity"). Part of the immutable version, like its rows.
CREATE TABLE recipe_unquantified_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  recipe_version_id uuid NOT NULL REFERENCES recipe_versions(id),
  position integer NOT NULL,
  component_key text NOT NULL,
  ingredient_key text NOT NULL,
  name text NOT NULL,
  note text,
  raw text,
  FOREIGN KEY (household_id, ingredient_key) REFERENCES ingredients(household_id, key),
  UNIQUE (recipe_version_id, position)
);
CREATE TRIGGER recipe_unquantified_items_immutable BEFORE UPDATE OR DELETE ON recipe_unquantified_items FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- 4. A member's answer for one such item on one selected meal: an amount for the meal's planned servings at the time
--    (a servings change makes it ask again), or Don't buy. No answer = unresolved; the list is then not ready.
CREATE TABLE selected_meal_quantity_decisions (
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  selected_meal_id uuid NOT NULL REFERENCES selected_meals(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES recipe_unquantified_items(id),
  decision text NOT NULL CHECK (decision IN ('amount', 'dont_buy')),
  quantity text CHECK (quantity IS NULL OR quantity ~ '^[1-9][0-9]{0,39}(/[1-9][0-9]{0,39})?$'),
  unit text,
  for_servings integer,
  decided_by uuid NOT NULL REFERENCES members(id),
  decided_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (selected_meal_id, item_id),
  CHECK ((decision = 'amount') = (quantity IS NOT NULL AND unit IS NOT NULL AND for_servings IS NOT NULL))
);
