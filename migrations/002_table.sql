-- Table domain schema. Separate records for accepted choices, previews,
-- requirements, purchasing history and observations (plan section 4).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Household / membership --------------------------------------------------
CREATE TABLE households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  timezone text NOT NULL,
  update_seq bigint NOT NULL DEFAULT 0,          -- household change sequence
  fixture boolean NOT NULL DEFAULT false,        -- disposable test household
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id text NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX members_household_idx ON members(household_id);

-- Saved household inputs. Every value starts unset: nothing is inferred.
CREATE TABLE household_settings (
  household_id uuid PRIMARY KEY REFERENCES households(id) ON DELETE CASCADE,
  store_label text,
  location_id text,
  budget_scope text CHECK (budget_scope IN ('pickup','dinner_ingredients')),
  budget_limit_minor integer CHECK (budget_limit_minor >= 0),
  budget_currency text NOT NULL DEFAULT 'USD',
  budget_firm boolean NOT NULL DEFAULT false,
  equipment text[] NOT NULL DEFAULT '{}',
  cooking_sessions integer CHECK (cooking_sessions BETWEEN 1 AND 7),
  variety text CHECK (variety IN ('familiar','balanced','adventurous')),
  max_new_recipes integer CHECK (max_new_recipes BETWEEN 0 AND 7),
  max_effort text CHECK (max_effort IN ('easy','medium','involved')),
  revision integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE member_targets (
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope IN ('daily','dinner')),
  calories numeric, protein_g numeric, carbs_g numeric, fat_g numeric,
  revision integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (member_id, scope)
);

CREATE TABLE exclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,  -- null = everyone
  term text NOT NULL,                                      -- ingredient key or tag
  created_by uuid REFERENCES members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz
);

-- Ingredients and recipes ---------------------------------------------------
CREATE TABLE ingredients (
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  key text NOT NULL,
  name text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  allergen_info_known boolean NOT NULL DEFAULT true,
  fixture boolean NOT NULL DEFAULT false,
  PRIMARY KEY (household_id, key)
);

CREATE TABLE ingredient_nutrition (
  household_id uuid NOT NULL,
  ingredient_key text NOT NULL,
  basis_qty numeric NOT NULL,
  basis_unit text NOT NULL,
  form text NOT NULL DEFAULT 'raw',
  calories numeric, protein_g numeric, carbs_g numeric, fat_g numeric,
  source text NOT NULL,
  synthetic boolean NOT NULL DEFAULT false,
  PRIMARY KEY (household_id, ingredient_key),
  FOREIGN KEY (household_id, ingredient_key) REFERENCES ingredients(household_id, key) ON DELETE CASCADE
);

CREATE TABLE recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  current_version_id uuid,
  created_by uuid REFERENCES members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE TABLE recipe_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  version_no integer NOT NULL,
  title text NOT NULL,
  cuisine text,
  summary text,
  effort_minutes integer,
  effort_level text CHECK (effort_level IN ('easy','medium','involved')),
  leftover_friendly boolean NOT NULL DEFAULT false,
  instructions text NOT NULL DEFAULT '',
  reheat_instructions text NOT NULL DEFAULT '',
  provenance text NOT NULL CHECK (provenance IN ('fixture','sample','manual')),
  source_label text,
  estimate boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recipe_id, version_no)
);
ALTER TABLE recipes ADD CONSTRAINT recipes_current_version_fk FOREIGN KEY (current_version_id) REFERENCES recipe_versions(id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE recipe_components (
  recipe_version_id uuid NOT NULL REFERENCES recipe_versions(id) ON DELETE CASCADE,
  key text NOT NULL,
  name text NOT NULL,
  sort integer NOT NULL DEFAULT 0,
  PRIMARY KEY (recipe_version_id, key)
);

-- Quantity is per ONE portion of its component.
CREATE TABLE recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_version_id uuid NOT NULL REFERENCES recipe_versions(id) ON DELETE CASCADE,
  component_key text NOT NULL,
  ingredient_key text NOT NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit text NOT NULL,
  form text NOT NULL DEFAULT 'raw',
  note text,
  sort integer NOT NULL DEFAULT 0,
  FOREIGN KEY (recipe_version_id, component_key) REFERENCES recipe_components(recipe_version_id, key)
);

-- Recipe versions are immutable once written; household edits create new versions.
CREATE FUNCTION forbid_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('table.allow_fixture_reset', true) = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  RAISE EXCEPTION 'immutable record: % cannot be % ', TG_TABLE_NAME, lower(TG_OP);
END $$;
CREATE TRIGGER recipe_versions_immutable BEFORE UPDATE OR DELETE ON recipe_versions FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER recipe_components_immutable BEFORE UPDATE OR DELETE ON recipe_components FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER recipe_ingredients_immutable BEFORE UPDATE OR DELETE ON recipe_ingredients FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- Weeks, assignments, cooking events, allocations ---------------------------
CREATE TABLE weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  accepted_choice_revision integer NOT NULL DEFAULT 0,  -- 0 = nothing adopted yet
  adopted_proposal_id uuid,
  adopted_by uuid REFERENCES members(id),
  adopted_at timestamptz,
  UNIQUE (household_id, week_start)
);

CREATE TABLE cooking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id uuid NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  recipe_version_id uuid NOT NULL REFERENCES recipe_versions(id),
  status text NOT NULL CHECK (status IN ('scheduled','deferred','retired')),
  cook_night date,
  revision integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id uuid NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  night date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('cook','leftover','out','open')),
  cooking_event_id uuid REFERENCES cooking_events(id),
  locked boolean NOT NULL DEFAULT false,
  reason text,
  revision integer NOT NULL DEFAULT 1,
  updated_by uuid REFERENCES members(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (week_id, night),
  CHECK ((kind IN ('cook','leftover')) = (cooking_event_id IS NOT NULL))
);

CREATE TABLE allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cooking_event_id uuid NOT NULL REFERENCES cooking_events(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id),
  kind text NOT NULL CHECK (kind IN ('dinner','lunch')),
  night date NOT NULL,
  component_portions jsonb NOT NULL   -- {componentKey: "decimal string"}
);
CREATE INDEX allocations_event_idx ON allocations(cooking_event_id);

-- Facts: leftover shortfall and explicit cooking history.
CREATE TABLE leftover_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  cooking_event_id uuid NOT NULL REFERENCES cooking_events(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id),
  portions_remaining numeric NOT NULL CHECK (portions_remaining >= 0),
  note text,
  observed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cook_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  cooking_event_id uuid REFERENCES cooking_events(id) ON DELETE SET NULL,
  recipe_version_id uuid NOT NULL REFERENCES recipe_versions(id),
  recorded_by uuid NOT NULL REFERENCES members(id),
  cooked_on date NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

-- Proposals and previews (drafts; never active grocery inputs) ---------------
CREATE TABLE proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  week_id uuid NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  base_accepted_choice_revision integer NOT NULL,
  content jsonb NOT NULL,
  content_hash text NOT NULL,
  inputs jsonb NOT NULL,
  explanation jsonb NOT NULL,
  created_by uuid NOT NULL REFERENCES members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','adopted','superseded'))
);

CREATE TABLE previews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  week_id uuid NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES members(id),
  operation jsonb NOT NULL,
  base jsonb NOT NULL,          -- {assignments:{id:rev}, events:{id:rev}}
  consequence jsonb NOT NULL,
  content_hash text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','applied','canceled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- Preferences, interest, notes, favorites --------------------------------------
CREATE TABLE interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id),
  saved_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE TABLE recipe_preferences (
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  value text NOT NULL CHECK (value IN ('make_again','occasionally','not_for_me')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (member_id, recipe_id)
);

CREATE TABLE favorites (
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (member_id, recipe_id)
);

CREATE TABLE recipe_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Groceries ---------------------------------------------------------------------
CREATE TABLE grocery_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  week_id uuid NOT NULL UNIQUE REFERENCES weeks(id) ON DELETE CASCADE,
  projection_revision integer NOT NULL DEFAULT 0,
  projection_accepted_revision integer NOT NULL DEFAULT 0,
  projection_summary jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  retailer text NOT NULL CHECK (retailer IN ('simulated','kroger')),
  product_ref text NOT NULL,
  name text NOT NULL,
  ingredient_key text NOT NULL,
  package_qty numeric,
  package_unit text,
  variable_weight boolean NOT NULL DEFAULT false,
  fixture boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE product_mappings (
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  ingredient_key text NOT NULL,
  product_id uuid NOT NULL REFERENCES products(id),
  suitable boolean NOT NULL DEFAULT true,
  decided_by uuid REFERENCES members(id),
  decided_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (household_id, ingredient_key)
);

CREATE TABLE price_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  store_label text,
  currency text NOT NULL DEFAULT 'USD',
  amount_minor integer NOT NULL CHECK (amount_minor >= 0),
  price_kind text NOT NULL DEFAULT 'regular' CHECK (price_kind IN ('regular','promo','member')),
  source text NOT NULL CHECK (source IN ('fixture','manual','kroger')),
  observed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE household_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES grocery_cycles(id) ON DELETE CASCADE,
  ingredient_key text,                 -- null = free text awaiting review
  text text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('usual','extra')),
  packages integer CHECK (packages > 0),
  captured_from text NOT NULL CHECK (captured_from IN ('week','groceries','cook','household')),
  state text NOT NULL DEFAULT 'active' CHECK (state IN ('active','resolved','removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE request_contributors (
  request_id uuid NOT NULL REFERENCES household_requests(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id),
  taps integer NOT NULL DEFAULT 1,
  first_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (request_id, member_id)
);

CREATE TABLE availability_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES grocery_cycles(id) ON DELETE CASCADE,
  ingredient_key text NOT NULL,
  state text NOT NULL CHECK (state IN ('enough','some','need')),
  quantity numeric,
  unit text,
  reviewed_demand numeric,
  reviewed_unit text,
  member_id uuid NOT NULL REFERENCES members(id),
  observed_at timestamptz NOT NULL DEFAULT now()
);

-- Current requirement projection (regenerated by commands, never hand-edited).
CREATE TABLE requirement_lines (
  cycle_id uuid NOT NULL REFERENCES grocery_cycles(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  ingredient_key text NOT NULL,
  projection_revision integer NOT NULL,
  line jsonb NOT NULL,
  line_fingerprint text NOT NULL,
  PRIMARY KEY (cycle_id, ingredient_key)
);

CREATE TABLE purchase_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES grocery_cycles(id) ON DELETE CASCADE,
  ingredient_key text NOT NULL,
  product_id uuid NOT NULL REFERENCES products(id),
  packages integer NOT NULL CHECK (packages > 0),
  line_fingerprint text NOT NULL,
  approved_by uuid NOT NULL REFERENCES members(id),
  approved_at timestamptz NOT NULL DEFAULT now(),
  state text NOT NULL DEFAULT 'active' CHECK (state IN ('active','stale','consumed','revoked')),
  state_changed_at timestamptz,
  consumed_by_batch uuid
);
CREATE UNIQUE INDEX one_active_approval_per_line ON purchase_approvals(cycle_id, ingredient_key) WHERE state = 'active';

-- Purchasing history -----------------------------------------------------------------
CREATE TABLE handoff_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES grocery_cycles(id) ON DELETE CASCADE,
  adapter text NOT NULL CHECK (adapter IN ('simulated','kroger')),
  review_fingerprint text NOT NULL,
  payload jsonb NOT NULL,
  payload_hash text NOT NULL,
  authorized_by uuid NOT NULL REFERENCES members(id),
  authorized_at timestamptz NOT NULL DEFAULT now(),
  operation_id text NOT NULL
);
-- Batch status is an append-only event stream so nothing rewrites history.
CREATE TABLE handoff_status_events (
  id bigserial PRIMARY KEY,
  batch_id uuid NOT NULL REFERENCES handoff_batches(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('authorized','dispatch_started','acknowledged','failed','canceled_before_dispatch','uncertain')),
  evidence jsonb NOT NULL DEFAULT '{}',
  at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE handoff_batch_lines (
  batch_id uuid NOT NULL REFERENCES handoff_batches(id) ON DELETE CASCADE,
  ingredient_key text NOT NULL,
  product_id uuid NOT NULL REFERENCES products(id),
  product_ref text NOT NULL,
  packages integer NOT NULL CHECK (packages > 0),
  line_fingerprint text NOT NULL,
  approval_id uuid NOT NULL REFERENCES purchase_approvals(id),
  PRIMARY KEY (batch_id, ingredient_key)
);

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES grocery_cycles(id) ON DELETE CASCADE,
  confirmed_by uuid NOT NULL REFERENCES members(id),
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL CHECK (source IN ('member','integration')),
  contents_known boolean NOT NULL,
  pickup_at timestamptz,
  note text
);
CREATE TABLE order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  ingredient_key text,
  product_id uuid REFERENCES products(id),
  name text NOT NULL,
  packages integer NOT NULL CHECK (packages > 0)
);
CREATE TABLE receipt_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  order_line_id uuid NOT NULL REFERENCES order_lines(id) ON DELETE CASCADE,
  state text NOT NULL CHECK (state IN ('received','missing','substituted')),
  packages integer NOT NULL CHECK (packages > 0),
  substitute_text text,
  member_id uuid NOT NULL REFERENCES members(id),
  observed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER handoff_batches_immutable BEFORE UPDATE OR DELETE ON handoff_batches FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER handoff_batch_lines_immutable BEFORE UPDATE OR DELETE ON handoff_batch_lines FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER handoff_status_events_immutable BEFORE UPDATE OR DELETE ON handoff_status_events FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER orders_immutable BEFORE UPDATE OR DELETE ON orders FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER order_lines_immutable BEFORE UPDATE OR DELETE ON order_lines FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER receipt_observations_immutable BEFORE UPDATE OR DELETE ON receipt_observations FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- Command receipts and change events ------------------------------------------------
CREATE TABLE command_receipts (
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  operation_id text NOT NULL,
  actor_member_id uuid NOT NULL REFERENCES members(id),
  command text NOT NULL,
  request_hash text NOT NULL,
  status text NOT NULL CHECK (status IN ('accepted','rejected')),
  outcome jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (household_id, operation_id)
);

CREATE TABLE change_events (
  id bigserial PRIMARY KEY,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  seq bigint NOT NULL,
  actor_member_id uuid REFERENCES members(id),
  command text NOT NULL,
  summary jsonb NOT NULL,
  accepted_choice_revision integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, seq)
);

-- Recording fake retailer (simulated adapter only) ----------------------------------
CREATE TABLE fake_retailer_calls (
  id bigserial PRIMARY KEY,
  household_id uuid NOT NULL,
  batch_id uuid NOT NULL,
  dispatch_id text NOT NULL,
  request_body jsonb NOT NULL,
  behavior text NOT NULL,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE fake_retailer_script (
  id bigserial PRIMARY KEY,
  household_id uuid NOT NULL,
  behavior text NOT NULL CHECK (behavior IN ('ack','reject','accept_then_timeout','delay_until_barrier','batch_only')),
  barrier text,
  consumed_at timestamptz
);
-- Named barriers used by tests to order races deterministically (test env only).
CREATE TABLE test_barriers (
  name text PRIMARY KEY,
  released_at timestamptz
);
