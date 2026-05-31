import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { formatRupiah } from "@/lib/locale/rupiah";
import { pbtConfig } from "@/test/pbt";
import {
  contractDateRangeSchema,
  ktpSchema,
  moneySchema,
  phoneSchema,
  propertySchema,
  roomSchema,
  subdomainSchema,
} from "./index";

/**
 * Zod schema tests — Task 4.2
 * ---------------------------
 * Property tests (fast-check, ≥100 runs via `pbtConfig`) cover the universal
 * acceptance/rejection invariants of each field schema; unit examples lock the
 * documented edge cases. Each property is tagged with the requirement it
 * validates.
 */

/* -------------------------------------------------------------------------- */
/* KTP — accepted iff exactly 16 digits                                       */
/* -------------------------------------------------------------------------- */

describe("ktpSchema", () => {
  it("accepts a value iff it is exactly 16 digits", () => {
    // **Validates: Requirements 18.3, 10.4**
    fc.assert(
      fc.property(
        fc.string().filter((s) => !/^\d{16}$/.test(s)),
        (notKtp) => {
          expect(ktpSchema.safeParse(notKtp).success).toBe(false);
        },
      ),
      pbtConfig,
    );

    fc.assert(
      // A 16-long string of digit characters is the only accepted shape.
      fc.property(
        fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 16, maxLength: 16 }),
        (digits) => {
          expect(ktpSchema.safeParse(digits.join("")).success).toBe(true);
        },
      ),
      pbtConfig,
    );
  });

  it("rejects digit strings of any length other than 16", () => {
    // **Validates: Requirements 18.3, 10.4**
    fc.assert(
      fc.property(
        fc
          .integer({ min: 0, max: 40 })
          .filter((n) => n !== 16)
          .chain((len) =>
            fc.array(fc.integer({ min: 0, max: 9 }), { minLength: len, maxLength: len }),
          ),
        (digits) => {
          expect(ktpSchema.safeParse(digits.join("")).success).toBe(false);
        },
      ),
      pbtConfig,
    );
  });

  it("unit: example KTP values", () => {
    expect(ktpSchema.safeParse("3201234567890123").success).toBe(true);
    expect(ktpSchema.safeParse("320123456789012").success).toBe(false); // 15
    expect(ktpSchema.safeParse("32012345678901234").success).toBe(false); // 17
    expect(ktpSchema.safeParse("32012345678901a3").success).toBe(false); // letter
  });
});

/* -------------------------------------------------------------------------- */
/* Phone — inputs starting "08" normalize to a "+62" prefix                   */
/* -------------------------------------------------------------------------- */

describe("phoneSchema", () => {
  it("normalizes 08xxxx inputs to a +62 prefix, dropping the leading 0", () => {
    // **Validates: Requirements 18.4**
    fc.assert(
      fc.property(
        // National significant part after the leading 0: starts with 8, total 9–12 digits.
        fc
          .integer({ min: 8, max: 11 })
          .chain((rest) =>
            fc
              .array(fc.integer({ min: 0, max: 9 }), { minLength: rest, maxLength: rest })
              .map((tail) => `8${tail.join("")}`),
          ),
        (national) => {
          const input = `0${national}`;
          const result = phoneSchema.safeParse(input);
          expect(result.success).toBe(true);
          if (result.success) {
            // Leading 0 dropped, "+62" prepended to the national number.
            expect(result.data).toBe(`+62${national}`);
            expect(result.data.startsWith("+62")).toBe(true);
            expect(result.data.startsWith("+620")).toBe(false);
          }
        },
      ),
      pbtConfig,
    );
  });

  it("unit: accepts +62 / 62 / bare-8 variants and separators, rejects junk", () => {
    expect(phoneSchema.parse("081234567890")).toBe("+6281234567890");
    expect(phoneSchema.parse("+6281234567890")).toBe("+6281234567890");
    expect(phoneSchema.parse("6281234567890")).toBe("+6281234567890");
    expect(phoneSchema.parse("0812-3456-7890")).toBe("+6281234567890");
    expect(phoneSchema.safeParse("12345").success).toBe(false);
    expect(phoneSchema.safeParse("08").success).toBe(false);
    expect(phoneSchema.safeParse("abcdefghij").success).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* Subdomain — lowercase a-z0-9-, 3–30 chars, no edge hyphen                  */
/* -------------------------------------------------------------------------- */

const SUBDOMAIN_REFERENCE = /^(?=.{3,30}$)[a-z0-9][a-z0-9-]*[a-z0-9]$/;

describe("subdomainSchema", () => {
  it("accepts a value iff lowercase a-z0-9-, length 3–30, no edge hyphen", () => {
    // **Validates: Requirements 18.5**
    // Generator emits strings over the relevant alphabet (incl. invalid edge
    // hyphens, casing, and out-of-range lengths) so both branches are covered.
    const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
    fc.assert(
      fc.property(
        fc.string({
          unit: fc.constantFrom(...alphabet.split("")),
          minLength: 0,
          maxLength: 35,
        }),
        (candidate) => {
          const expected = SUBDOMAIN_REFERENCE.test(candidate);
          expect(subdomainSchema.safeParse(candidate).success).toBe(expected);
        },
      ),
      pbtConfig,
    );
  });

  it("unit: representative valid and invalid subdomains", () => {
    expect(subdomainSchema.safeParse("kosbunga").success).toBe(true);
    expect(subdomainSchema.safeParse("kos-bunga-01").success).toBe(true);
    expect(subdomainSchema.safeParse("ab").success).toBe(false); // too short
    expect(subdomainSchema.safeParse("-kos").success).toBe(false); // leading hyphen
    expect(subdomainSchema.safeParse("kos-").success).toBe(false); // trailing hyphen
    expect(subdomainSchema.safeParse("KosBunga").success).toBe(false); // uppercase
    expect(subdomainSchema.safeParse("a".repeat(31)).success).toBe(false); // too long
  });
});

/* -------------------------------------------------------------------------- */
/* Money — reject negative/non-integer, round-trip valid amounts              */
/* -------------------------------------------------------------------------- */

describe("moneySchema", () => {
  it("round-trips a formatted Rupiah string back to its integer amount", () => {
    // **Validates: Requirements 18.6**
    fc.assert(
      fc.property(fc.nat(), (amount) => {
        const formatted = formatRupiah(amount); // "Rp 1.250.000"
        const result = moneySchema.safeParse(formatted);
        expect(result.success).toBe(true);
        if (result.success) expect(result.data).toBe(amount);
      }),
      pbtConfig,
    );
  });

  it("accepts non-negative integer numbers unchanged", () => {
    // **Validates: Requirements 18.6**
    fc.assert(
      fc.property(fc.nat(), (amount) => {
        const result = moneySchema.safeParse(amount);
        expect(result.success).toBe(true);
        if (result.success) expect(result.data).toBe(amount);
      }),
      pbtConfig,
    );
  });

  it("rejects negative values (string and number)", () => {
    // **Validates: Requirements 18.6**
    fc.assert(
      fc.property(fc.integer({ min: 1 }), (amount) => {
        expect(moneySchema.safeParse(-amount).success).toBe(false);
        expect(moneySchema.safeParse(`-${amount}`).success).toBe(false);
      }),
      pbtConfig,
    );
  });

  it("rejects non-integer values (string and number)", () => {
    // **Validates: Requirements 18.6**
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 1_000_000, noInteger: true, noNaN: true }),
        (value) => {
          expect(moneySchema.safeParse(value).success).toBe(false);
        },
      ),
      pbtConfig,
    );
    // Fractional string forms (id-ID comma + period-decimal) are rejected too.
    fc.assert(
      fc.property(fc.nat(), fc.integer({ min: 1, max: 99 }), (whole, frac) => {
        expect(moneySchema.safeParse(`${whole},${frac}`).success).toBe(false);
        expect(moneySchema.safeParse(`${whole}.${frac}`).success).toBe(false);
      }),
      pbtConfig,
    );
  });
});

/* -------------------------------------------------------------------------- */
/* Contract date range — accepted iff end date after start date               */
/* -------------------------------------------------------------------------- */

describe("contractDateRangeSchema", () => {
  it("accepts a range iff endDate is strictly after startDate", () => {
    // **Validates: Requirements 18.7**
    fc.assert(
      fc.property(
        fc.date({
          min: new Date("2000-01-01T00:00:00Z"),
          max: new Date("2100-12-31T00:00:00Z"),
          noInvalidDate: true,
        }),
        fc.integer({ min: -400, max: 400 }),
        (start, offsetDays) => {
          const startDate = start.toISOString().slice(0, 10);
          const end = new Date(start.getTime() + offsetDays * 86_400_000);
          const endDate = end.toISOString().slice(0, 10);

          const result = contractDateRangeSchema.safeParse({ startDate, endDate });
          // Civil-date comparison: accepted exactly when endDate > startDate.
          const expected = endDate > startDate;
          expect(result.success).toBe(expected);
        },
      ),
      pbtConfig,
    );
  });

  it("unit: rejects equal and reversed ranges, accepts forward ranges", () => {
    expect(
      contractDateRangeSchema.safeParse({
        startDate: "2025-02-01",
        endDate: "2025-08-01",
      }).success,
    ).toBe(true);
    expect(
      contractDateRangeSchema.safeParse({
        startDate: "2025-02-01",
        endDate: "2025-02-01",
      }).success,
    ).toBe(false); // equal
    expect(
      contractDateRangeSchema.safeParse({
        startDate: "2025-08-01",
        endDate: "2025-02-01",
      }).success,
    ).toBe(false); // reversed
  });
});

/* -------------------------------------------------------------------------- */
/* Property / Room — trimmed non-empty + price >= 0                           */
/* -------------------------------------------------------------------------- */

describe("propertySchema & roomSchema (Req 18.8)", () => {
  it("unit: property name must be non-empty after trim", () => {
    // **Validates: Requirements 18.8**
    expect(propertySchema.safeParse({ name: "Kos Bunga" }).success).toBe(true);
    const trimmed = propertySchema.safeParse({ name: "  Kos Melati  " });
    expect(trimmed.success).toBe(true);
    if (trimmed.success) expect(trimmed.data.name).toBe("Kos Melati");
    expect(propertySchema.safeParse({ name: "   " }).success).toBe(false);
    expect(propertySchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("unit: room number required and monthlyPrice >= 0", () => {
    // **Validates: Requirements 18.8**
    const ok = roomSchema.safeParse({ number: "A-01", monthlyPrice: "Rp 1.250.000" });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.monthlyPrice).toBe(1250000);

    expect(roomSchema.safeParse({ number: "A-02", monthlyPrice: 0 }).success).toBe(true);
    expect(roomSchema.safeParse({ number: "  ", monthlyPrice: 500000 }).success).toBe(
      false,
    ); // empty number
    expect(roomSchema.safeParse({ number: "A-03", monthlyPrice: -1 }).success).toBe(
      false,
    ); // negative price
  });
});
