-- Where to shop (multi-source handoff, phases 4–5). A destination is a way of buying, not a store
-- location: "retailer_cart" is the existing cart transfer through the retailer adapter (simulated by
-- default; Kroger only when configured and approved), "instacart_list" prepares an Instacart shopping
-- list LINK (the member picks a store and checks out on Instacart — never a cart write or an order),
-- "manual" is a copied/downloaded list for any other store. Existing cycles keep the cart transfer.

ALTER TABLE households ADD COLUMN preferred_destination text NOT NULL DEFAULT 'retailer_cart'
  CHECK (preferred_destination IN ('retailer_cart','instacart_list','manual'));

ALTER TABLE grocery_cycles
  ADD COLUMN destination text NOT NULL DEFAULT 'retailer_cart' CHECK (destination IN ('retailer_cart','instacart_list','manual')),
  ADD COLUMN destination_revision integer NOT NULL DEFAULT 1,
  ADD COLUMN destination_store_label text,           -- a member-named store for "manual"; never verified
  ADD COLUMN destination_set_by uuid REFERENCES members(id),
  ADD COLUMN destination_set_at timestamptz;

-- Instacart shopping-list link requests. The frozen list (names and measurements only) is stored so
-- what was asked for is auditable; the API key never is. A link is not a cart write, not an order and
-- says nothing about which store, products or prices the member will choose on Instacart.
CREATE TABLE instacart_list_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES grocery_cycles(id) ON DELETE CASCADE,
  destination_revision integer NOT NULL,
  list_fingerprint text NOT NULL,
  request_hash text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested','canceled_before_request','link_prepared','failed','uncertain')),
  link_url text,
  expires_at timestamptz,
  outcome jsonb,                                       -- redacted evidence: status codes, provider error codes
  requested_by uuid NOT NULL REFERENCES members(id),
  operation_id text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  finished_at timestamptz
);
CREATE INDEX instacart_list_links_cycle ON instacart_list_links(cycle_id, requested_at DESC);

-- A request's outcome is written once: requested -> one final status. Nothing is rewritten after that.
CREATE FUNCTION instacart_link_forward_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('table.allow_fixture_reset', true) = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'instacart_list_links is append-only'; END IF;
  IF OLD.status <> 'requested' THEN RAISE EXCEPTION 'instacart list link % is final (%)', OLD.id, OLD.status; END IF;
  IF NEW.id <> OLD.id OR NEW.payload <> OLD.payload OR NEW.request_hash <> OLD.request_hash OR NEW.cycle_id <> OLD.cycle_id THEN
    RAISE EXCEPTION 'instacart list link % request is immutable', OLD.id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER instacart_list_links_forward_only BEFORE UPDATE OR DELETE ON instacart_list_links
  FOR EACH ROW EXECUTE FUNCTION instacart_link_forward_only();
