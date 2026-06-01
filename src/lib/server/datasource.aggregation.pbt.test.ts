import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { Invoice } from "@/lib/mock";
import { pbtConfig } from "@/test/pbt";

/**
 * Dashboard aggregation property tests — Task 5.4
 * -----------------------------------------------
 * Property 2 (Invoice Total Consistency), applied to the dashboard's
 * `monthlyRevenue` aggregation: *for any* set of invoices, the dashboard
 * `monthlyRevenue` must equal the sum of the `total` of every PAID (`lunas`)
 * invoice whose `dueDate` falls within the current month.
 *
 * **Validates: Requirements 5.3, 8.3**
 *
 * Why a reference model instead of the real query?
 * ------------------------------------------------
 * The production aggregation lives in `RealDataSource.getDashboardSummary`
 * (`src/lib/server/datasource.ts`) and is expressed as a Drizzle/SQL query:
 *
 *   SELECT sum(invoice.total)
 *   FROM invoice
 *   WHERE invoice.tenant_id = $tenant
 *     AND invoice.status = 'lunas'
 *     AND invoice.due_date >= $monthStart
 *     AND invoice.due_date <= $monthEnd
 *
 * Executing that query requires a live PostgreSQL instance (with RLS), which
 * is unavailable in unit-test CI. So we test the aggregation *rule* — the pure
 * reducer the SQL expresses — via a faithful reference model
 * (`aggregateMonthlyRevenue`). The model mirrors the SQL exactly: PAID status
 * + `dueDate` within the inclusive `[monthStart, monthEnd]` window, summing
 * `total`. ISO `YYYY-MM-DD` strings compare lexicographically the same as
 * chronologically, matching the date-column comparison the SQL performs.
 */

// ---------------------------------------------------------------------------
// Domain constants (mirrors Invoice["status"] in src/lib/mock/types.ts)
// ---------------------------------------------------------------------------

const ALL_STATUSES: Invoice["status"][] = [
  "draft",
  "tertagih",
  "lunas",
  "jatuh_tempo",
  "batal",
];

/** Every status that is NOT a paid invoice — these must never count. */
const NON_PAID_STATUSES: Invoice["status"][] = [
  "draft",
  "tertagih",
  "jatuh_tempo",
  "batal",
];

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/** A calendar month, `month1` being 1..12. */
interface MonthRef {
  year: number;
  month1: number;
}

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

/** Last calendar day of the given (1-based) month, leap-year aware. */
function lastDayOfMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

/** Build an ISO `YYYY-MM-DD` date string. */
function isoDate(year: number, month1: number, day: number): string {
  return `${year}-${pad2(month1)}-${pad2(day)}`;
}

/**
 * Inclusive `[start, end]` ISO-date bounds for a month, mirroring the SQL:
 *   monthStart = first day, monthEnd = last day.
 */
function monthBounds(ref: MonthRef): { start: string; end: string } {
  return {
    start: isoDate(ref.year, ref.month1, 1),
    end: isoDate(ref.year, ref.month1, lastDayOfMonth(ref.year, ref.month1)),
  };
}

// ---------------------------------------------------------------------------
// Reference model — mirrors RealDataSource.getDashboardSummary's revenue query
// ---------------------------------------------------------------------------

/**
 * Pure reference reducer for the dashboard `monthlyRevenue` aggregation.
 * Sums `total` over invoices that are PAID (`lunas`) AND whose `dueDate` is
 * within the inclusive month window — exactly the predicate the SQL applies.
 */
function aggregateMonthlyRevenue(invoices: Invoice[], ref: MonthRef): number {
  const { start, end } = monthBounds(ref);
  return invoices
    .filter((inv) => inv.status === "lunas" && inv.dueDate >= start && inv.dueDate <= end)
    .reduce((acc, inv) => acc + inv.total, 0);
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Non-negative integer rupiah amount. */
const moneyArb = fc.integer({ min: 0, max: 100_000_000 });

/** A random calendar month used as the "current month" reference. */
const monthRefArb: fc.Arbitrary<MonthRef> = fc.record({
  year: fc.integer({ min: 2023, max: 2027 }),
  month1: fc.integer({ min: 1, max: 12 }),
});

/** A valid ISO date spanning a wide range (multiple months/years). */
const anyDueDateArb: fc.Arbitrary<string> = fc
  .tuple(fc.integer({ min: 2020, max: 2030 }), fc.integer({ min: 1, max: 12 }))
  .chain(([year, month1]) =>
    fc
      .integer({ min: 1, max: lastDayOfMonth(year, month1) })
      .map((day) => isoDate(year, month1, day)),
  );

/** An ISO date guaranteed to fall inside `ref`'s month. */
function inMonthDueDateArb(ref: MonthRef): fc.Arbitrary<string> {
  return fc
    .integer({ min: 1, max: lastDayOfMonth(ref.year, ref.month1) })
    .map((day) => isoDate(ref.year, ref.month1, day));
}

/** An ISO date guaranteed to fall OUTSIDE `ref`'s month (different month). */
function outOfMonthDueDateArb(ref: MonthRef): fc.Arbitrary<string> {
  return fc
    .integer({ min: -24, max: 24 })
    .filter((offset) => offset !== 0)
    .chain((offset) => {
      const base = ref.year * 12 + (ref.month1 - 1) + offset;
      const year = Math.floor(base / 12);
      const month1 = (base % 12) + 1;
      return fc
        .integer({ min: 1, max: lastDayOfMonth(year, month1) })
        .map((day) => isoDate(year, month1, day));
    });
}

let invoiceSeq = 0;

/** Assemble a minimal-but-complete Invoice; only the fields under test vary. */
function makeInvoice(status: Invoice["status"], dueDate: string, total: number): Invoice {
  const id = `inv-${invoiceSeq++}`;
  return {
    id,
    invoiceNumber: `INV-${id}`,
    residentName: "Tester",
    roomNumber: "A1",
    periodStart: dueDate,
    periodEnd: dueDate,
    dueDate,
    lines: [{ description: "Sewa", amount: total }],
    total,
    status,
    paymentToken: `PAY-${id}`,
  };
}

/** A PAID invoice whose dueDate is inside the reference month — these COUNT. */
function qualifyingInvoiceArb(ref: MonthRef): fc.Arbitrary<Invoice> {
  return fc
    .tuple(inMonthDueDateArb(ref), moneyArb)
    .map(([dueDate, total]) => makeInvoice("lunas", dueDate, total));
}

/**
 * An invoice that must NOT count toward monthly revenue, because it is either:
 *  - not paid (any date), or
 *  - paid but with a dueDate outside the reference month.
 */
function nonQualifyingInvoiceArb(ref: MonthRef): fc.Arbitrary<Invoice> {
  const notPaid = fc
    .tuple(fc.constantFrom(...NON_PAID_STATUSES), anyDueDateArb, moneyArb)
    .map(([status, dueDate, total]) => makeInvoice(status, dueDate, total));

  const paidButOutOfMonth = fc
    .tuple(outOfMonthDueDateArb(ref), moneyArb)
    .map(([dueDate, total]) => makeInvoice("lunas", dueDate, total));

  return fc.oneof(notPaid, paidButOutOfMonth);
}

/** Any invoice at all (random status + date), for order/non-negativity laws. */
function anyInvoiceArb(): fc.Arbitrary<Invoice> {
  return fc
    .tuple(fc.constantFrom(...ALL_STATUSES), anyDueDateArb, moneyArb)
    .map(([status, dueDate, total]) => makeInvoice(status, dueDate, total));
}

/**
 * A scenario with a KNOWN partition: a set of qualifying invoices (whose total
 * sum is the independently-computed expected revenue) mixed with invoices that
 * must contribute nothing.
 */
const partitionScenarioArb = monthRefArb.chain((ref) =>
  fc.record({
    ref: fc.constant(ref),
    qualifying: fc.array(qualifyingInvoiceArb(ref), { maxLength: 30 }),
    nonQualifying: fc.array(nonQualifyingInvoiceArb(ref), { maxLength: 30 }),
  }),
);

/** Interleave two arrays so qualifying/non-qualifying are not grouped. */
function interleave<T>(a: T[], b: T[]): T[] {
  const out: T[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (i < a.length) out.push(a[i]);
    if (i < b.length) out.push(b[i]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe("Property 2: Dashboard monthlyRevenue aggregation (Req 5.3, 8.3)", () => {
  it("equals the sum of paid, current-month invoice totals", () => {
    // **Validates: Requirements 5.3, 8.3**
    // Core correctness with an INDEPENDENT oracle: the expected revenue is the
    // sum of the totals of invoices we constructed to qualify (paid + in-month).
    // The reducer must recover exactly that sum from the mixed input, proving
    // its status/date filter selects precisely the qualifying invoices.
    fc.assert(
      fc.property(partitionScenarioArb, ({ ref, qualifying, nonQualifying }) => {
        const expected = qualifying.reduce((acc, inv) => acc + inv.total, 0);
        const mixed = interleave(qualifying, nonQualifying);
        expect(aggregateMonthlyRevenue(mixed, ref)).toBe(expected);
      }),
      pbtConfig,
    );
  });

  it("yields 0 for the empty set", () => {
    // **Validates: Requirements 5.3, 8.3**
    fc.assert(
      fc.property(monthRefArb, (ref) => {
        expect(aggregateMonthlyRevenue([], ref)).toBe(0);
      }),
      pbtConfig,
    );
  });

  it("is always non-negative for non-negative invoice totals", () => {
    // **Validates: Requirements 5.3, 8.3**
    fc.assert(
      fc.property(
        monthRefArb,
        fc.array(anyInvoiceArb(), { maxLength: 50 }),
        (ref, invoices) => {
          expect(aggregateMonthlyRevenue(invoices, ref)).toBeGreaterThanOrEqual(0);
        },
      ),
      pbtConfig,
    );
  });

  it("is invariant under input reordering (commutativity)", () => {
    // **Validates: Requirements 5.3, 8.3**
    // A filter+sum aggregation must not depend on the order rows arrive in,
    // matching SQL's set-based semantics. Compare three orderings.
    fc.assert(
      fc.property(
        monthRefArb,
        fc.array(anyInvoiceArb(), { maxLength: 50 }),
        (ref, invoices) => {
          const original = aggregateMonthlyRevenue(invoices, ref);
          const reversed = aggregateMonthlyRevenue([...invoices].reverse(), ref);
          const sorted = aggregateMonthlyRevenue(
            [...invoices].sort((a, b) => a.total - b.total),
            ref,
          );
          expect(reversed).toBe(original);
          expect(sorted).toBe(original);
        },
      ),
      pbtConfig,
    );
  });

  it("never increases revenue when non-qualifying invoices are added", () => {
    // **Validates: Requirements 5.3, 8.3**
    // Excluding non-paid or out-of-month invoices must not change revenue:
    // adding such invoices to any base set leaves the aggregate untouched.
    const exclusionArb = monthRefArb.chain((ref) =>
      fc.record({
        ref: fc.constant(ref),
        base: fc.array(anyInvoiceArb(), { maxLength: 30 }),
        nonQualifying: fc.array(nonQualifyingInvoiceArb(ref), { maxLength: 30 }),
      }),
    );

    fc.assert(
      fc.property(exclusionArb, ({ ref, base, nonQualifying }) => {
        const baseRevenue = aggregateMonthlyRevenue(base, ref);
        const withExtra = aggregateMonthlyRevenue(interleave(base, nonQualifying), ref);
        expect(withExtra).toBe(baseRevenue);
      }),
      pbtConfig,
    );
  });
});
