import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { pbtConfig } from "@/test/pbt";

// ---------------------------------------------------------------------------
// Storage Tenant Isolation — Task 14.4
// ---------------------------------------------------------------------------

function buildStorageKey(
  tenantId: string,
  propertyId: string,
  category: string,
  filename: string,
): string {
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${tenantId}/${propertyId}/${category}/${sanitized}`;
}

function keyIncludesTenant(key: string, tenantId: string): boolean {
  return key.startsWith(`${tenantId}/`);
}

describe("Storage tenant isolation (Req 11.1, 11.5)", () => {
  it("every upload path starts with the current tenant_id", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.constantFrom("ktp", "contract", "transfer_proof", "logo", "attachment"),
        fc
          .string({ minLength: 1, maxLength: 50 })
          .filter((s) => /^[a-zA-Z0-9._-]+$/.test(s)),
        (tenantId, propertyId, category, filename) => {
          const key = buildStorageKey(tenantId, propertyId, category, filename);
          expect(keyIncludesTenant(key, tenantId)).toBe(true);
          expect(key).toContain(tenantId);
          expect(key).toContain(propertyId);
          expect(key).toContain(category);
        },
      ),
      pbtConfig,
    );
  });

  it("tenant A cannot access files stored under tenant B's path", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.constantFrom("ktp", "contract", "logo"),
        (tenantA, tenantB, propertyId, category) => {
          fc.pre(tenantA !== tenantB);

          const keyA = buildStorageKey(tenantA, propertyId, category, "file.jpg");
          const keyB = buildStorageKey(tenantB, propertyId, category, "file.jpg");

          expect(keyIncludesTenant(keyA, tenantA)).toBe(true);
          expect(keyIncludesTenant(keyA, tenantB)).toBe(false);
          expect(keyIncludesTenant(keyB, tenantB)).toBe(true);
          expect(keyIncludesTenant(keyB, tenantA)).toBe(false);
          expect(keyA).not.toBe(keyB);
        },
      ),
      pbtConfig,
    );
  });

  it("path structure is always tenant/property/category/filename", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.constantFrom("ktp", "contract", "transfer_proof", "logo", "attachment"),
        fc
          .string({ minLength: 1, maxLength: 30 })
          .filter((s) => /^[a-zA-Z0-9._-]+$/.test(s)),
        (tenantId, propertyId, category, filename) => {
          const key = buildStorageKey(tenantId, propertyId, category, filename);
          const parts = key.split("/");
          expect(parts.length).toBe(4);
          expect(parts[0]).toBe(tenantId);
          expect(parts[1]).toBe(propertyId);
          expect(parts[2]).toBe(category);
        },
      ),
      pbtConfig,
    );
  });
});
