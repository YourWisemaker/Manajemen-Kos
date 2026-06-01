import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { pbtConfig } from "@/test/pbt";
import {
  getTenantContext,
  requireTenantId,
  type TenantStore,
  withTenantContext,
} from "./context";

/**
 * Tenant context isolation tests — Task 2.2
 * -----------------------------------------
 * Property 1 (Tenant Isolation Invariant), validated at the application layer:
 * AsyncLocalStorage must keep each request's resolved tenant context isolated
 * even when many requests run concurrently and interleave their awaits. Within
 * any one context, `requireTenantId()` / `getTenantContext()` must always
 * return that context's OWN `tenantId` — never a value that leaked in from a
 * concurrent context. Unit examples lock the documented no-context behavior.
 *
 * **Validates: Requirements 1.7, 1.8, 1.9**
 *
 * Note: 1.7–1.9 concern the database layer's `app.current_tenant_id`
 * session variable and RLS. That variable is derived from the
 * AsyncLocalStorage tenant context; this suite proves the context itself is
 * never cross-contaminated under concurrency, which is the precondition for
 * the DB layer to set the correct `app.current_tenant_id` per request.
 */

const ROLES: ReadonlyArray<TenantStore["role"]> = [
  "owner",
  "admin",
  "staff",
  "super_admin",
];

/** Yield the event loop a few times so concurrent contexts genuinely interleave. */
async function interleave(): Promise<void> {
  await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
  await Promise.resolve();
}

describe("tenant context isolation (Property 1 — Req 1.7, 1.8, 1.9)", () => {
  it("never leaks tenant context between concurrent operations", async () => {
    // **Validates: Requirements 1.7, 1.8, 1.9**
    await fc.assert(
      fc.asyncProperty(
        // A batch of distinct tenant contexts that will run concurrently.
        // Distinct tenantIds let us detect any cross-context leak unambiguously.
        fc.uniqueArray(
          fc.record({
            tenantId: fc.uuid(),
            userId: fc.option(fc.uuid(), { nil: null }),
            role: fc.constantFrom(...ROLES),
          }),
          { minLength: 2, maxLength: 12, selector: (s) => s.tenantId },
        ),
        async (specs) => {
          const stores: TenantStore[] = specs.map((s) => ({
            tenantId: s.tenantId,
            userId: s.userId,
            role: s.role,
            isSuperAdmin: s.role === "super_admin",
          }));

          // Run every context concurrently. Each repeatedly checks — across
          // several interleaved await points — that it still sees ITS OWN
          // tenantId and full store, proving no concurrent context bled in.
          const observed = await Promise.all(
            stores.map((store) =>
              withTenantContext(store, async () => {
                for (let i = 0; i < 3; i++) {
                  expect(requireTenantId()).toBe(store.tenantId);
                  const ctx = getTenantContext();
                  expect(ctx.tenantId).toBe(store.tenantId);
                  expect(ctx.userId).toBe(store.userId);
                  expect(ctx.role).toBe(store.role);
                  expect(ctx.isSuperAdmin).toBe(store.isSuperAdmin);
                  await interleave();
                }
                return requireTenantId();
              }),
            ),
          );

          // Each concurrent operation resolved with its own tenantId, in order.
          expect(observed).toEqual(stores.map((s) => s.tenantId));
        },
      ),
      pbtConfig,
    );
  });

  it("nested contexts restore the outer tenant once the inner scope exits", async () => {
    // **Validates: Requirements 1.7, 1.8, 1.9**
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        async (outerId, innerId) => {
          fc.pre(outerId !== innerId);
          const outer: TenantStore = {
            tenantId: outerId,
            userId: null,
            role: "owner",
            isSuperAdmin: false,
          };
          const inner: TenantStore = {
            tenantId: innerId,
            userId: null,
            role: "admin",
            isSuperAdmin: false,
          };

          await withTenantContext(outer, async () => {
            expect(requireTenantId()).toBe(outerId);
            await withTenantContext(inner, async () => {
              await interleave();
              expect(requireTenantId()).toBe(innerId);
            });
            // Inner scope must not clobber the outer context.
            await interleave();
            expect(requireTenantId()).toBe(outerId);
          });
        },
      ),
      pbtConfig,
    );
  });
});

describe("tenant context guards with no active context", () => {
  it("requireTenantId() throws when called outside any context", () => {
    // **Validates: Requirements 1.7, 1.9** (no tenant context → guard must fail closed)
    expect(() => requireTenantId()).toThrow();
  });

  it("getTenantContext() throws when called outside any context", () => {
    // **Validates: Requirements 1.7, 1.9**
    expect(() => getTenantContext()).toThrow();
  });
});
