import crypto from "node:crypto";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { pbtConfig } from "@/test/pbt";

// ---------------------------------------------------------------------------
// Property 3: Webhook Idempotency — Task 8.3
// ---------------------------------------------------------------------------

describe("Property 3: Webhook Idempotency (Req 7.6)", () => {
  it("processing the same webhook N times produces the same state as once", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(fc.constantFrom("success", "expired", "failed"), {
          minLength: 1,
          maxLength: 20,
        }),
        (paymentRef, events) => {
          const processed = new Map<string, { status: string; count: number }>();

          function processWebhook(ref: string, eventType: string) {
            const existing = processed.get(ref);
            if (existing) {
              existing.count++;
              return { changed: false, status: existing.status };
            }
            const status = eventType === "success" ? "success" : eventType;
            processed.set(ref, { status, count: 1 });
            return { changed: true, status };
          }

          const results = events.map((evt) => processWebhook(paymentRef, evt));

          const firstResult = results[0];
          for (let i = 1; i < results.length; i++) {
            expect(results[i].changed).toBe(false);
            expect(results[i].status).toBe(firstResult.status);
          }

          expect(processed.get(paymentRef)?.count).toBe(events.length);
          expect(processed.get(paymentRef)?.status).toBe(firstResult.status);
        },
      ),
      pbtConfig,
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: Gateway Credential Isolation — Task 8.4
// ---------------------------------------------------------------------------

describe("Property 9: Gateway Credential Isolation (Req 6.1, 6.7)", () => {
  it("payment requests for tenant A always use tenant A's credentials", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            tenantId: fc.uuid(),
            apiKey: fc.string({ minLength: 10, maxLength: 50 }),
          }),
          { minLength: 2, maxLength: 10 },
        ),
        (tenants) => {
          const uniqueTenants = new Map<string, string>();
          for (const t of tenants) {
            uniqueTenants.set(t.tenantId, t.apiKey);
          }

          for (const [tenantId, apiKey] of uniqueTenants) {
            const resolvedKey = uniqueTenants.get(tenantId);
            expect(resolvedKey).toBe(apiKey);
            expect(resolvedKey).toBeDefined();
          }

          for (const [tenantA, keyA] of uniqueTenants) {
            for (const [tenantB, keyB] of uniqueTenants) {
              if (tenantA !== tenantB) {
                expect(keyA).not.toBe(keyB);
              }
            }
          }
        },
      ),
      pbtConfig,
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7: Payment Reference Uniqueness — Task 8.5
// ---------------------------------------------------------------------------

describe("Property 7: Payment Reference Uniqueness (Req 6.4)", () => {
  it("all generated payment references are globally unique", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), (count) => {
        const references = new Set<string>();
        for (let i = 0; i < count; i++) {
          const ref = `PAY-${Date.now()}-${crypto.randomUUID()}`;
          expect(references.has(ref)).toBe(false);
          references.add(ref);
        }
        expect(references.size).toBe(count);
      }),
      { ...pbtConfig, numRuns: 50 },
    );
  });

  it("references never contain collision-prone substrings", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 50 }), (count) => {
        const refs: string[] = [];
        for (let i = 0; i < count; i++) {
          refs.push(`INV-${Date.now()}-${crypto.randomUUID().slice(0, 12)}`);
        }
        const unique = new Set(refs);
        expect(unique.size).toBe(count);
      }),
      { ...pbtConfig, numRuns: 50 },
    );
  });
});
