import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { pbtConfig } from "@/test/pbt";
import { formatRupiah, parseRupiah } from "./rupiah";

/**
 * Rupiah formatting/parsing tests — Task 2.2
 * ------------------------------------------
 * Unit examples lock the documented formatting behavior; property tests cover
 * the universal round-trip and rejection invariants across many inputs.
 */

describe("formatRupiah (Req 3.1, 3.2)", () => {
  it("formats with period thousands separators and no decimals", () => {
    // Req 3.1: id-ID grouping, no fractional digits.
    expect(formatRupiah(1250000, { showSymbol: false })).toBe("1.250.000");
  });

  it("prefixes 'Rp ' by default (showSymbol defaults to true)", () => {
    // Req 3.2: default symbol prefix.
    expect(formatRupiah(1250000)).toBe("Rp 1.250.000");
  });

  it("omits the symbol when showSymbol is false", () => {
    expect(formatRupiah(0, { showSymbol: false })).toBe("0");
    expect(formatRupiah(0)).toBe("Rp 0");
  });

  it("handles small numbers without grouping", () => {
    expect(formatRupiah(100, { showSymbol: false })).toBe("100");
  });

  it("throws on non-finite amounts", () => {
    expect(() => formatRupiah(Number.NaN)).toThrow();
    expect(() => formatRupiah(Number.POSITIVE_INFINITY)).toThrow();
  });
});

describe("parseRupiah (Req 3.3)", () => {
  it("strips the 'Rp' prefix, whitespace, and period separators", () => {
    expect(parseRupiah("Rp 1.250.000")).toBe(1250000);
    expect(parseRupiah("1.250.000")).toBe(1250000);
    expect(parseRupiah("1250000")).toBe(1250000);
    expect(parseRupiah("Rp0")).toBe(0);
  });
});

describe("Rupiah round-trip property (Req 3.4)", () => {
  it("parseRupiah(formatRupiah(x)) === x for all integer IDR >= 0", () => {
    // **Validates: Requirements 3.4**
    fc.assert(
      fc.property(fc.nat(), (x) => {
        expect(parseRupiah(formatRupiah(x))).toBe(x);
        // The symbol-free rendering must round-trip identically.
        expect(parseRupiah(formatRupiah(x, { showSymbol: false }))).toBe(x);
      }),
      pbtConfig,
    );
  });
});

describe("Rupiah parsing rejection property (Req 3.5)", () => {
  it("rejects negative monetary strings", () => {
    // **Validates: Requirements 3.5**
    fc.assert(
      fc.property(fc.integer({ min: 1 }), (x) => {
        expect(() => parseRupiah(`-${x}`)).toThrow();
        expect(() => parseRupiah(`Rp -${x}`)).toThrow();
      }),
      pbtConfig,
    );
  });

  it("rejects non-integer (fractional) monetary strings", () => {
    // **Validates: Requirements 3.5**
    fc.assert(
      fc.property(fc.nat(), fc.integer({ min: 1, max: 99 }), (whole, frac) => {
        // Comma-style fraction (id-ID decimal mark) must be rejected.
        expect(() => parseRupiah(`${whole},${frac}`)).toThrow();
        // Period used as a decimal point (not a 3-digit group) is invalid.
        expect(() => parseRupiah(`${whole}.${frac}`)).toThrow();
      }),
      pbtConfig,
    );
  });

  it("rejects strings containing letters or stray symbols", () => {
    // **Validates: Requirements 3.5**
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => !/^\s*(rp)?[\d.\s]+$/i.test(s)),
        (garbage) => {
          expect(() => parseRupiah(garbage)).toThrow();
        },
      ),
      pbtConfig,
    );
  });
});
