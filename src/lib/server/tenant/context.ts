import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Request-scoped tenant context stored in AsyncLocalStorage.
 * Propagated by the tenant resolver middleware to all downstream services.
 */
export interface TenantStore {
  tenantId: string;
  userId: string | null;
  role: "owner" | "admin" | "staff" | "super_admin" | null;
  isSuperAdmin: boolean;
}

/**
 * AsyncLocalStorage instance holding the current request's tenant context.
 * Populated by the tenant resolver middleware at the start of each request.
 */
export const tenantStorage = new AsyncLocalStorage<TenantStore>();

/**
 * Get the current tenant context. Throws if called outside a request
 * (i.e. when no context has been set via `tenantStorage.run()`).
 */
export function getTenantContext(): TenantStore {
  const store = tenantStorage.getStore();
  if (!store) {
    throw new Error(
      "getTenantContext() called outside of a request context. " +
        "Ensure the tenant resolver middleware is active.",
    );
  }
  return store;
}

/**
 * Get the current tenant_id or throw. Used as a guard by all DB queries
 * to ensure tenant isolation is enforced.
 */
export function requireTenantId(): string {
  const store = tenantStorage.getStore();
  if (!store?.tenantId) {
    throw new Error(
      "requireTenantId() — no tenant_id in current context. " +
        "This operation requires an active tenant context.",
    );
  }
  return store.tenantId;
}

/**
 * Run a callback with a specific tenant context. Useful for cron jobs,
 * background tasks, and tests that need to execute code as a specific tenant.
 */
export async function withTenantContext<T>(
  store: TenantStore,
  fn: () => T | Promise<T>,
): Promise<T> {
  return tenantStorage.run(store, fn);
}
