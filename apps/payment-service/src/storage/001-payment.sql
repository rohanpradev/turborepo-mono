CREATE SCHEMA IF NOT EXISTS payment;
CREATE TABLE IF NOT EXISTS payment.checkout (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  cart_hash text NOT NULL,
  snapshot jsonb NOT NULL,
  session_id text UNIQUE,
  payment jsonb,
  reservation_released boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS checkout_user_created ON payment.checkout(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS payment.job (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('enrich', 'publish', 'catalog')),
  payload jsonb NOT NULL,
  traceparent text,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','processing','complete','quarantined')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz,
  token text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS job_pending ON payment.job(kind, available_at, created_at) WHERE state IN ('pending','processing');
CREATE TABLE IF NOT EXISTS payment.catalog (
  product_id text PRIMARY KEY,
  stripe_id text NOT NULL,
  revision bigint NOT NULL DEFAULT 0,
  deleted boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS payment.rate_limit (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  count integer NOT NULL
);
