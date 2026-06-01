import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool, PoolClient } from "pg";
import * as schema from "./schema";

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

// ---------------------------------------------------------------------------
// Lazy pool — avoids crashing at import time when DATABASE_URL is missing
// (e.g. during `next build` or in test environments).
// ---------------------------------------------------------------------------
let _pool: Pool | null = null;

function getPool(): Pool {
  if (!_pool) {
    const { Pool: PgPool } = require("pg") as typeof import("pg");
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set. Cannot create database pool.");
    }
    _pool = new PgPool({ connectionString });
  }
  return _pool;
}

// ---------------------------------------------------------------------------
// Shared (non-tenant-scoped) drizzle instance — lazy.
// Use this only for operations that don't need RLS (e.g. tenant lookup).
// ---------------------------------------------------------------------------
let _db: DrizzleDb | null = null;

export function getDb(): DrizzleDb {
  if (!_db) {
    _db = drizzle(getPool(), { schema });
  }
  return _db;
}

/**
 * @deprecated Prefer `getDb()` for non-tenant queries or `withTenantDb()` for
 * tenant-scoped queries. This export is kept for backward compatibility.
 */
export const db: DrizzleDb = new Proxy({} as DrizzleDb, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

// ---------------------------------------------------------------------------
// Tenant-scoped database access
// ---------------------------------------------------------------------------

/**
 * Acquire a dedicated client from the pool, set the RLS session variable,
 * execute the callback with a scoped drizzle instance, then release the client.
 *
 * This ensures the `app.current_tenant_id` session variable is isolated to a
 * single connection and cannot leak between concurrent requests.
 *
 * @example
 * ```ts
 * const invoices = await withTenantDb(tenantId, async (tdb) => {
 *   return tdb.select().from(invoice).where(eq(invoice.status, "draft"));
 * });
 * ```
 */
export async function withTenantDb<T>(
  tenantId: string,
  callback: (tdb: DrizzleDb) => Promise<T>,
): Promise<T> {
  const pool = getPool();
  const client: PoolClient = await pool.connect();
  try {
    await client.query("SELECT set_config('app.current_tenant_id', $1, false)", [
      tenantId,
    ]);
    const tdb = drizzle(client as unknown as Pool, { schema });
    return await callback(tdb);
  } finally {
    client.release();
  }
}

/**
 * Get a tenant-scoped database client. Sets the PostgreSQL session variable
 * `app.current_tenant_id` before returning.
 *
 * ⚠️  The returned drizzle instance is bound to a dedicated PoolClient.
 * The caller MUST call the returned `release()` function when done to avoid
 * connection leaks. Prefer `withTenantDb()` which handles this automatically.
 */
export async function getTenantDb(
  tenantId: string,
): Promise<{ tdb: DrizzleDb; release: () => void }> {
  const pool = getPool();
  const client: PoolClient = await pool.connect();
  await client.query("SELECT set_config('app.current_tenant_id', $1, false)", [tenantId]);
  const tdb = drizzle(client as unknown as Pool, { schema });
  return { tdb, release: () => client.release() };
}
