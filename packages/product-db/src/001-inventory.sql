CREATE SCHEMA IF NOT EXISTS inventory;
    CREATE TABLE IF NOT EXISTS inventory.stock (
      product_id integer NOT NULL REFERENCES public."Product"(id) ON DELETE RESTRICT,
      size text NOT NULL, color text NOT NULL,
      on_hand integer NOT NULL CHECK(on_hand>=0),
      reserved integer NOT NULL DEFAULT 0 CHECK(reserved>=0 AND reserved<=on_hand),
      PRIMARY KEY(product_id,size,color)
    );
    CREATE TABLE IF NOT EXISTS inventory.stock_audit (
      id bigserial PRIMARY KEY, product_id integer NOT NULL, size text NOT NULL,
      color text NOT NULL, on_hand integer NOT NULL, actor_id text NOT NULL,
      changed_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS inventory.reservation (
      id text PRIMARY KEY, user_id text NOT NULL, items jsonb NOT NULL,
      expires_at timestamptz NOT NULL,
      state text NOT NULL CHECK(state IN ('reserved','committed','released')),
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS reservation_pending ON inventory.reservation(expires_at) WHERE state='reserved';
