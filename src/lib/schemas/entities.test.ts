import { describe, expect, it } from "vitest";
import { residentSchema } from "./resident";
import { tenantSchema } from "./tenant";

/**
 * Entity form-schema tests — Task 4.2
 * -----------------------------------
 * Unit coverage that the per-entity object schemas compose the field
 * primitives correctly (trimming, phone normalization, optional email).
 * KTP/phone/subdomain/money/date invariants are property-tested in
 * `schemas.test.ts`; these examples lock the composed object behavior.
 */

describe("residentSchema (Req 18.3, 18.4, 10.4)", () => {
  it("accepts a valid resident and normalizes the phone to +62", () => {
    const result = residentSchema.safeParse({
      fullName: "  Budi Santoso  ",
      ktpNumber: "3201010101010001",
      phone: "081234567890",
      email: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fullName).toBe("Budi Santoso");
      expect(result.data.phone).toBe("+6281234567890");
    }
  });

  it("rejects an invalid KTP", () => {
    const result = residentSchema.safeParse({
      fullName: "Budi",
      ktpNumber: "123",
      phone: "081234567890",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid optional email but rejects a malformed one", () => {
    expect(
      residentSchema.safeParse({
        fullName: "Budi",
        ktpNumber: "3201010101010001",
        phone: "081234567890",
        email: "budi@example.com",
      }).success,
    ).toBe(true);
    expect(
      residentSchema.safeParse({
        fullName: "Budi",
        ktpNumber: "3201010101010001",
        phone: "081234567890",
        email: "not-an-email",
      }).success,
    ).toBe(false);
  });
});

describe("tenantSchema (Req 18.5)", () => {
  it("accepts a valid subdomain and rejects an invalid one", () => {
    expect(
      tenantSchema.safeParse({ name: "Kos Bunga", subdomain: "kos-bunga" }).success,
    ).toBe(true);
    expect(
      tenantSchema.safeParse({ name: "Kos Bunga", subdomain: "Kos_Bunga" }).success,
    ).toBe(false);
  });
});
