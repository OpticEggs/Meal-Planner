-- B5: Kroger customer connection behind the closed live gate.
--
-- Secrets (access/refresh tokens, PKCE verifiers) are stored only as AES-256-GCM sealed text
-- under TABLE_TOKEN_KEY; the raw values never touch a column. The authorization `state` itself is
-- never stored, only its SHA-256. None of these secret-bearing tables is exported.

-- One-time authorization attempts: single use, bound to household + member + redirect URI, expiring.
CREATE TABLE kroger_auth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_hash text NOT NULL UNIQUE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  redirect_uri text NOT NULL,
  verifier_sealed text NOT NULL,                 -- PKCE code_verifier, sealed
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  CHECK (expires_at > created_at)
);
CREATE INDEX kroger_auth_states_household_idx ON kroger_auth_states(household_id);

-- At most one Kroger connection per household. Tokens are household-scoped and sealed with the
-- household id as associated data, so they cannot be used for another household.
CREATE TABLE kroger_connections (
  household_id uuid PRIMARY KEY REFERENCES households(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('not_connected', 'connected', 'needs_reauthorization', 'disconnected')),
  access_token_sealed text,
  refresh_token_sealed text,
  access_expires_at timestamptz,                 -- NULL = unknown: treated as expired (refresh first)
  scope text,
  connected_by uuid REFERENCES members(id),
  connected_at timestamptz,
  -- Refresh coordination: one refresh at a time per connection. A lease is taken with a
  -- conditional UPDATE on token_revision; the new token pair is stored in one UPDATE that bumps it.
  token_revision integer NOT NULL DEFAULT 0,
  refresh_lease_id uuid,
  refresh_lease_until timestamptz,
  location_id text CHECK (location_id IS NULL OR location_id ~ '^[A-Za-z0-9]{8}$'),
  location_set_by uuid REFERENCES members(id),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (status <> 'connected' OR access_token_sealed IS NOT NULL),
  CHECK (status = 'connected' OR (access_token_sealed IS NULL AND refresh_token_sealed IS NULL))
);

-- Append-only, non-secret history of connection changes (exported with the household).
CREATE TABLE kroger_connection_events (
  id bigserial PRIMARY KEY,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('authorization_started', 'connected', 'denied', 'exchange_failed', 'refreshed',
                                     'refresh_failed', 'reauthorization_required', 'disconnected', 'location_set')),
  member_id uuid REFERENCES members(id),
  evidence jsonb NOT NULL DEFAULT '{}',
  at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX kroger_connection_events_household_idx ON kroger_connection_events(household_id, id);
CREATE TRIGGER kroger_connection_events_immutable BEFORE UPDATE OR DELETE ON kroger_connection_events FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
