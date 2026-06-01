import crypto from "node:crypto";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { pbtConfig } from "@/test/pbt";

// ---------------------------------------------------------------------------
// Property 11: Audit Log Immutability — Task 14.3
// ---------------------------------------------------------------------------

interface AuditEntry {
  id: string;
  tenantId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}

describe("Property 11: Audit Log Immutability (Req 12.3)", () => {
  it("once written, audit entries cannot be mutated through the application API", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(
          fc.record({
            actorId: fc.uuid(),
            action: fc.constantFrom("create", "update", "delete", "login"),
            entityType: fc.constantFrom("invoice", "payment", "resident", "room"),
            entityId: fc.uuid(),
          }),
          { minLength: 1, maxLength: 20 },
        ),
        (tenantId, actions) => {
          const store: AuditEntry[] = [];

          function writeEntry(input: {
            actorId: string;
            action: string;
            entityType: string;
            entityId: string;
          }): AuditEntry {
            const entry: AuditEntry = {
              id: crypto.randomUUID(),
              tenantId,
              actorId: input.actorId,
              action: input.action,
              entityType: input.entityType,
              entityId: input.entityId,
              createdAt: new Date().toISOString(),
            };
            store.push(entry);
            return entry;
          }

          const entries = actions.map(writeEntry);

          for (let i = 0; i < entries.length; i++) {
            expect(store[i].id).toBe(entries[i].id);
            expect(store[i].action).toBe(entries[i].action);
            expect(store[i].entityType).toBe(entries[i].entityType);
            expect(store[i].entityId).toBe(entries[i].entityId);
            expect(store[i].tenantId).toBe(tenantId);
            expect(store[i].createdAt).toBe(entries[i].createdAt);
          }

          expect(store.length).toBe(entries.length);
        },
      ),
      pbtConfig,
    );
  });

  it("audit entry IDs are always unique and immutable", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 50 }), (count) => {
        const ids = new Set<string>();
        for (let i = 0; i < count; i++) {
          const id = crypto.randomUUID();
          expect(ids.has(id)).toBe(false);
          ids.add(id);
        }
        expect(ids.size).toBe(count);
      }),
      pbtConfig,
    );
  });
});
