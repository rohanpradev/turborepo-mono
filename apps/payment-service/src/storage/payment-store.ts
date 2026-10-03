import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type {
  PaymentSuccessfulMessage,
  StripeCheckoutCompletedMessage,
} from "@repo/kafka";
import { Pool } from "pg";

export type CheckoutSnapshot = {
  id: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  currency: "usd";
  total: number;
  items: Array<{
    productId: string;
    name: string;
    description: string;
    price: number;
    quantity: number;
    selectedSize: string;
    selectedColor: string;
  }>;
};
export type PaymentJob = {
  id: string;
  kind: "enrich" | "publish" | "catalog";
  payload: unknown;
  traceparent: string | null;
  token: string;
  attempts: number;
};

class PaymentStore {
  constructor(readonly pool: Pool) {}

  async migrate() {
    const connection = await this.pool.connect();
    try {
      await connection.query("BEGIN");
      await connection.query("SELECT pg_advisory_xact_lock(7021002)");
      const sql = await readFile(
        new URL("./001-payment.sql", import.meta.url),
        "utf8",
      );
      const checksum = createHash("sha256").update(sql).digest("hex");
      await connection.query("CREATE SCHEMA IF NOT EXISTS payment");
      await connection.query(
        "CREATE TABLE IF NOT EXISTS payment.migration (version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())",
      );
      const previous = await connection.query<{ checksum: string }>(
        "SELECT checksum FROM payment.migration WHERE version='001'",
      );
      if (previous.rows[0] && previous.rows[0].checksum !== checksum)
        throw new Error(
          "Applied payment migration checksum changed. Add a new migration instead.",
        );
      if (!previous.rows.length) {
        await connection.query(sql);
        await connection.query(
          "INSERT INTO payment.migration(version,checksum) VALUES('001',$1)",
          [checksum],
        );
      }
      await connection.query("COMMIT");
    } catch (error) {
      await connection.query("ROLLBACK");
      throw error;
    } finally {
      connection.release();
    }
  }

  async ready() {
    await this.pool.query("SELECT id FROM payment.checkout LIMIT 0");
    await this.pool.query("SELECT id FROM payment.job LIMIT 0");
  }

  async checkout(id: string) {
    const result = await this.pool.query<{
      snapshot: CheckoutSnapshot;
      cart_hash: string;
      session_id: string | null;
      payment: PaymentSuccessfulMessage | null;
    }>(
      "SELECT snapshot, cart_hash, session_id, payment FROM payment.checkout WHERE id=$1",
      [id],
    );
    return result.rows[0] ?? null;
  }

  async saveCheckout(snapshot: CheckoutSnapshot, cartHash: string) {
    await this.pool.query(
      "INSERT INTO payment.checkout(id,user_id,cart_hash,snapshot) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING",
      [snapshot.id, snapshot.userId, cartHash, JSON.stringify(snapshot)],
    );
    const record = await this.checkout(snapshot.id);
    if (
      !record ||
      record.cart_hash !== cartHash ||
      record.snapshot.userId !== snapshot.userId
    )
      throw new Error(
        "Checkout identity conflicts with the original purchase.",
      );
    return record;
  }

  async attachSession(id: string, sessionId: string) {
    const result = await this.pool.query(
      "UPDATE payment.checkout SET session_id=$2 WHERE id=$1 AND (session_id IS NULL OR session_id=$2)",
      [id, sessionId],
    );
    if (result.rowCount !== 1)
      throw new Error("Checkout session identity conflict.");
  }

  async enqueue(message: StripeCheckoutCompletedMessage, traceparent?: string) {
    const result = await this.pool.query(
      "INSERT INTO payment.job(id,kind,payload,traceparent) VALUES($1,'enrich',$2,$3) ON CONFLICT(id) DO NOTHING",
      [
        `enrich:${message.sessionId}`,
        JSON.stringify(message),
        traceparent ?? null,
      ],
    );
    return result.rowCount === 1;
  }

  async enqueueCatalog(id: string, productId: string, traceparent?: string) {
    await this.pool.query(
      "INSERT INTO payment.job(id,kind,payload,traceparent) VALUES($1,'catalog',$2,$3) ON CONFLICT(id) DO NOTHING",
      [id, JSON.stringify({ productId }), traceparent ?? null],
    );
  }

  async renew(job: PaymentJob) {
    const result = await this.pool.query(
      "UPDATE payment.job SET lease_until=now()+interval '90 seconds' WHERE id=$1 AND token=$2 AND state='processing'",
      [job.id, job.token],
    );
    return result.rowCount === 1;
  }

  async unsettled(after = "", limit = 100) {
    const result = await this.pool.query<{
      id: string;
      snapshot: CheckoutSnapshot;
      session_id: string | null;
    }>(
      "SELECT id,snapshot,session_id FROM payment.checkout WHERE payment IS NULL AND NOT reservation_released AND id>$1 ORDER BY id LIMIT $2",
      [after, limit],
    );
    return result.rows;
  }

  async markReleased(id: string) {
    await this.pool.query(
      "UPDATE payment.checkout SET reservation_released=true WHERE id=$1 AND payment IS NULL",
      [id],
    );
  }

  async cleanup() {
    // Keep purchase records and deduplication keys; payload retention is explicit.
    await this.pool.query(
      "DELETE FROM payment.rate_limit WHERE window_start<now()-interval '1 day'",
    );
  }

  async claim(kind: PaymentJob["kind"]): Promise<PaymentJob | null> {
    const result = await this.pool.query<PaymentJob>(
      `
      WITH candidate AS (
        SELECT id FROM payment.job WHERE kind=$1 AND available_at<=now()
        AND (state='pending' OR (state='processing' AND lease_until<now()))
        ORDER BY created_at,id FOR UPDATE SKIP LOCKED LIMIT 1
      ) UPDATE payment.job j SET state='processing', attempts=attempts+1,
        token=$2, lease_until=now()+interval '90 seconds'
      FROM candidate c WHERE j.id=c.id RETURNING j.*`,
      [kind, crypto.randomUUID()],
    );
    return result.rows[0] ?? null;
  }

  async complete(job: PaymentJob, payment?: PaymentSuccessfulMessage) {
    const connection = await this.pool.connect();
    try {
      await connection.query("BEGIN");
      const owned = await connection.query(
        "UPDATE payment.job SET state='complete',completed_at=now(),lease_until=NULL WHERE id=$1 AND token=$2 AND state='processing' RETURNING id",
        [job.id, job.token],
      );
      if (owned.rowCount !== 1) throw new Error("Payment job lease was lost.");
      if (payment) {
        await connection.query(
          "INSERT INTO payment.job(id,kind,payload,traceparent) VALUES($1,'publish',$2,$3) ON CONFLICT(id) DO NOTHING",
          [
            `publish:${payment.orderId}`,
            JSON.stringify(payment),
            job.traceparent,
          ],
        );
        await connection.query(
          "UPDATE payment.checkout SET payment=$2 WHERE session_id=$1",
          [payment.orderId, JSON.stringify(payment)],
        );
      }
      await connection.query("COMMIT");
    } catch (error) {
      await connection.query("ROLLBACK");
      throw error;
    } finally {
      connection.release();
    }
  }

  async fail(job: PaymentJob, error: unknown) {
    const delay =
      Math.min(300, 2 ** Math.min(job.attempts, 8)) +
      Math.floor(Math.random() * 5);
    // Never persist provider payloads or URLs, which may contain personal data.
    const category = error instanceof Error ? error.name : "ProcessingError";
    await this.pool.query(
      "UPDATE payment.job SET state=$3,lease_until=NULL,available_at=now()+($4 * interval '1 second'),last_error=$5 WHERE id=$1 AND token=$2 AND state='processing'",
      [
        job.id,
        job.token,
        job.attempts >= 8 ? "quarantined" : "pending",
        delay,
        category,
      ],
    );
  }

  async redrive(id: string) {
    const result = await this.pool.query(
      "UPDATE payment.job SET state='pending',attempts=0,available_at=now(),last_error=NULL WHERE id=$1 AND state='quarantined'",
      [id],
    );
    return result.rowCount === 1;
  }

  async allow(key: string, limit: number, seconds = 60) {
    const result = await this.pool.query<{ count: number }>(
      `INSERT INTO payment.rate_limit(key,window_start,count) VALUES($1,now(),1)
      ON CONFLICT(key) DO UPDATE SET count=CASE WHEN payment.rate_limit.window_start<now()-($2*interval '1 second') THEN 1 ELSE payment.rate_limit.count+1 END,
      window_start=CASE WHEN payment.rate_limit.window_start<now()-($2*interval '1 second') THEN now() ELSE payment.rate_limit.window_start END RETURNING count`,
      [key, seconds],
    );
    return (result.rows[0]?.count ?? limit + 1) <= limit;
  }

  async activities(limit = 100) {
    const result = await this.pool.query<{
      snapshot: CheckoutSnapshot;
      session_id: string;
      payment: PaymentSuccessfulMessage | null;
    }>(
      "SELECT snapshot,session_id,payment FROM payment.checkout WHERE session_id IS NOT NULL ORDER BY created_at DESC LIMIT $1",
      [Math.min(limit, 100)],
    );
    return result.rows;
  }

  async metrics() {
    const result = await this.pool.query<{
      kind: string;
      state: string;
      count: string;
      age: number;
    }>(
      "SELECT kind,state,count(*)::text,COALESCE(EXTRACT(EPOCH FROM now()-min(created_at)),0)::float8 AS age FROM payment.job WHERE state<>'complete' GROUP BY kind,state",
    );
    return result.rows;
  }
}

let store: PaymentStore | undefined;
export const getPaymentStore = () => {
  if (!store) {
    const connectionString = process.env.PAYMENT_DATABASE_URL;
    if (!connectionString) throw new Error("PAYMENT_DATABASE_URL is required.");
    const pool = new Pool({
      connectionString,
      max: 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      statement_timeout: 10000,
    });
    pool.on("error", () =>
      console.error("Payment database connection failed."),
    );
    store = new PaymentStore(pool);
  }
  return store;
};
export const closePaymentStore = async () => {
  await store?.pool.end();
  store = undefined;
};
