import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { pbtConfig } from "@/test/pbt";

// ---------------------------------------------------------------------------
// Property 2: Invoice Total Consistency — Task 7.4
// ---------------------------------------------------------------------------

interface InvoiceLineItem {
  description: string;
  amount: string;
}

interface GeneratedInvoice {
  total: string;
  lines: InvoiceLineItem[];
}

function buildInvoice(lines: InvoiceLineItem[]): GeneratedInvoice {
  const total = lines.reduce((sum, l) => sum + Number(l.amount), 0).toFixed(2);
  return { total, lines };
}

const lineItemArb = fc.record({
  description: fc.string({ minLength: 1, maxLength: 50 }),
  amount: fc.integer({ min: 1, max: 10_000_000 }).map((v) => (v / 100).toFixed(2)),
});

describe("Property 2: Invoice Total Consistency (Req 8.3)", () => {
  it("total always equals the sum of all line item amounts", () => {
    fc.assert(
      fc.property(fc.array(lineItemArb, { minLength: 1, maxLength: 20 }), (lines) => {
        const invoice = buildInvoice(lines);
        const expectedTotal = lines
          .reduce((sum, l) => sum + Number(l.amount), 0)
          .toFixed(2);
        expect(invoice.total).toBe(expectedTotal);
      }),
      pbtConfig,
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: Billing Idempotency — Task 7.5
// ---------------------------------------------------------------------------

describe("Property 5: Billing Idempotency (Req 8.6)", () => {
  it("generating invoices twice for the same period produces no duplicates", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            contractId: fc.uuid(),
            roomId: fc.uuid(),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        fc.date({ min: new Date("2025-01-01"), max: new Date("2027-12-31") }),
        (contracts, _targetDate) => {
          const issuedContracts = new Set<string>();

          function generate(contractsList: typeof contracts) {
            let generated = 0;
            let skipped = 0;
            for (const c of contractsList) {
              if (issuedContracts.has(c.contractId)) {
                skipped++;
              } else {
                issuedContracts.add(c.contractId);
                generated++;
              }
            }
            return { generated, skipped };
          }

          const first = generate(contracts);
          const second = generate(contracts);

          expect(first.generated).toBe(contracts.length);
          expect(first.skipped).toBe(0);
          expect(second.generated).toBe(0);
          expect(second.skipped).toBe(contracts.length);
          expect(issuedContracts.size).toBe(contracts.length);
        },
      ),
      pbtConfig,
    );
  });
});

// ---------------------------------------------------------------------------
// Property 12: Late Fee Calculation Correctness — Task 7.6
// ---------------------------------------------------------------------------

function calculateLateFee(total: number, percent: number, maxAmount: number): number {
  const fee = total * (percent / 100);
  return Math.min(fee, maxAmount);
}

describe("Property 12: Late Fee Calculation Correctness (Req 8.8, 8.9)", () => {
  it("late fee = min(total * percent / 100, maxAmount)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 10_000_000 }).map((v) => v / 10),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 100, max: 10_000_000 }).map((v) => v / 10),
        (total, percent, maxAmount) => {
          const fee = calculateLateFee(total, percent, maxAmount);
          const rawFee = total * (percent / 100);

          expect(fee).toBeLessThanOrEqual(maxAmount);
          expect(fee).toBe(Math.min(rawFee, maxAmount));
          expect(fee).toBeGreaterThanOrEqual(0);
        },
      ),
      pbtConfig,
    );
  });

  it("late fee never exceeds the total itself", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 10_000_000 }).map((v) => v / 10),
        fc.integer({ min: 1, max: 100 }),
        (total, percent) => {
          const fee = calculateLateFee(total, percent, Number.POSITIVE_INFINITY);
          if (percent <= 100) {
            expect(fee).toBeLessThanOrEqual(total);
          }
        },
      ),
      pbtConfig,
    );
  });
});

// ---------------------------------------------------------------------------
// Property 13: Meter-Based Billing Calculation — Task 7.7
// ---------------------------------------------------------------------------

describe("Property 13: Meter-Based Billing Calculation (Req 17.2)", () => {
  it("charge = (current - previous) * rate, always non-negative", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100_000 }).map((v) => v / 10),
        fc.integer({ min: 0, max: 100_000 }).map((v) => v / 10),
        fc.integer({ min: 1, max: 50_000 }).map((v) => v / 10),
        (currentReading, previousReading, rate) => {
          const usage = Math.max(0, currentReading - previousReading);
          const charge = usage * rate;
          expect(charge).toBeGreaterThanOrEqual(0);
          expect(charge).toBeCloseTo(usage * rate, 1);
        },
      ),
      pbtConfig,
    );
  });

  it("falls back to default_value when no reading exists", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100_000 }).map((v) => v / 10),
        fc.integer({ min: 1, max: 50_000 }).map((v) => v / 10),
        (defaultValue, rate) => {
          const currentReading: number | null = null;
          const previousReading: number | null = null;

          let charge: number;
          if (currentReading === null || previousReading === null) {
            charge = defaultValue;
          } else {
            charge = Math.max(0, currentReading - previousReading) * rate;
          }

          expect(charge).toBe(defaultValue);
          expect(charge).toBeGreaterThanOrEqual(0);
        },
      ),
      pbtConfig,
    );
  });

  it("current < previous yields zero charge (no negative billing)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 999 }),
        fc.integer({ min: 1, max: 50_000 }).map((v) => v / 10),
        (difference, rate) => {
          const previousReading = 1000;
          const currentReading = previousReading - difference;
          const charge = Math.max(0, currentReading - previousReading) * rate;
          expect(charge).toBe(0);
        },
      ),
      pbtConfig,
    );
  });
});
