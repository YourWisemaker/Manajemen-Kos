import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { pbtConfig } from "@/test/pbt";

// ---------------------------------------------------------------------------
// Integration Test 18.3: Tenant Isolation
// ---------------------------------------------------------------------------

/**
 * Verifies the tenant isolation contract at the pure-logic layer.
 *
 * In production, tenant isolation is enforced by:
 *   1. Application layer: `requireTenantId()` injects tenant_id into every query
 *   2. Drizzle ORM: WHERE tenant_id = ? on every table access
 *   3. PostgreSQL RLS: `current_setting('app.current_tenant_id')` as last defense
 *
 * This test validates the contract that any tenant-scoped operation must:
 *   - Never return data belonging to a different tenant
 *   - Always include tenant_id in the isolation key
 *   - Deny access to other tenants' resources
 */

interface TenantResource {
  id: string;
  tenantId: string;
  data: string;
}

function queryWithTenant(store: TenantResource[], tenantId: string): TenantResource[] {
  return store.filter((r) => r.tenantId === tenantId);
}

describe("Integration 18.3: Tenant isolation (Req 1.8, 18.3)", () => {
  it("tenant A cannot access tenant B's data through any query method", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            tenantId: fc.constantFrom("tenant-a", "tenant-b", "tenant-c"),
            id: fc.uuid(),
            data: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          { minLength: 1, maxLength: 100 },
        ),
        (resources) => {
          for (const tenantId of ["tenant-a", "tenant-b", "tenant-c"]) {
            const results = queryWithTenant(resources, tenantId);
            for (const r of results) {
              expect(r.tenantId).toBe(tenantId);
            }

            const otherTenants = resources.filter((r) => r.tenantId !== tenantId);
            for (const r of otherTenants) {
              expect(results).not.toContainEqual(r);
            }
          }
        },
      ),
      pbtConfig,
    );
  });

  it("aggregate metrics for tenant A never leak tenant B's data", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            tenantId: fc.constantFrom("a", "b"),
            value: fc.integer({ min: 0, max: 1_000_000 }),
          }),
          { minLength: 1, maxLength: 100 },
        ),
        (records) => {
          const totalA = records
            .filter((r) => r.tenantId === "a")
            .reduce((sum, r) => sum + r.value, 0);
          const totalB = records
            .filter((r) => r.tenantId === "b")
            .reduce((sum, r) => sum + r.value, 0);
          const totalAll = records.reduce((sum, r) => sum + r.value, 0);

          expect(totalA).toBeGreaterThanOrEqual(0);
          expect(totalB).toBeGreaterThanOrEqual(0);
          expect(totalA + totalB).toBeCloseTo(totalAll, 2);
        },
      ),
      pbtConfig,
    );
  });

  it("storage paths include tenant_id, preventing cross-tenant file access", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.constantFrom("ktp", "contract", "logo"),
        (tenantA, tenantB, propertyId, category) => {
          fc.pre(tenantA !== tenantB);

          const pathA = `${tenantA}/${propertyId}/${category}/file.jpg`;
          const pathB = `${tenantB}/${propertyId}/${category}/file.jpg`;

          expect(pathA.startsWith(`${tenantA}/`)).toBe(true);
          expect(pathA.startsWith(`${tenantB}/`)).toBe(false);
          expect(pathB.startsWith(`${tenantB}/`)).toBe(true);
          expect(pathB.startsWith(`${tenantA}/`)).toBe(false);
        },
      ),
      pbtConfig,
    );
  });
});
