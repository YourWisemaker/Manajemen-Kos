import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

/**
 * Get a tenant-scoped database client. Sets the PostgreSQL session
 * variable `app.current_tenant_id` before returning, so RLS policies
 * are active for all subsequent queries in this transaction.
 */
export async function getTenantDb(tenantId: string): Promise<typeof db> {
  await pool.query("SELECT set_config('app.current_tenant_id', $1, false)", [tenantId]);
  return db;
}
