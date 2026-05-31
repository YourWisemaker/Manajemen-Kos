import { describe, expect, it } from "vitest";

import type { Invoice, Property } from "@/lib/mock";
import {
  ALL_FILTER,
  buildInvoiceFilter,
  buildPeriodOptions,
  getTimelineIndex,
  monthLabel,
  monthValueToRange,
  simulateBulkInvoiceCount,
  TIMELINE_STEPS,
} from "./billing-helpers";

/**
 * Billing helpers unit tests — Task 17
 * ------------------------------------
 * Verify the pure filter-wiring and date-math logic backing the invoices
 * surface: filter mapping (status/property/period), Asia/Jakarta month-range
 * derivation, period option building, timeline index, and the simulated
 * bulk-generate count.
 *
 * Requirements: 12.1, 12.4, 12.5
 */

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "inv-test",
    invoiceNumber: "INV-TEST",
    residentName: "Tester",
    roomNumber: "A1",
    periodStart: "2025-02-01",
    periodEnd: "2025-02-28",
    dueDate: "2025-02-10",
    lines: [{ description: "Sewa", amount: 1_000_000 }],
    total: 1_000_000,
    status: "tertagih",
    paymentToken: "PAY-TEST",
    ...overrides,
  };
}

describe("buildInvoiceFilter (Req 12.1)", () => {
  it("returns an empty filter when every selection is the ALL sentinel", () => {
    expect(buildInvoiceFilter(ALL_FILTER, ALL_FILTER, ALL_FILTER)).toEqual({});
  });

  it("maps the status selection into the filter", () => {
    expect(buildInvoiceFilter("lunas", ALL_FILTER, ALL_FILTER)).toEqual({
      status: "lunas",
    });
  });

  it("maps the property selection into the filter", () => {
    expect(buildInvoiceFilter(ALL_FILTER, "prop-melati", ALL_FILTER)).toEqual({
      propertyId: "prop-melati",
    });
  });

  it("maps the period selection into an Asia/Jakarta date range", () => {
    expect(buildInvoiceFilter(ALL_FILTER, ALL_FILTER, "2025-02")).toEqual({
      period: { start: "2025-02-01", end: "2025-02-28" },
    });
  });

  it("combines all three selections", () => {
    expect(buildInvoiceFilter("jatuh_tempo", "prop-anggrek", "2025-01")).toEqual({
      status: "jatuh_tempo",
      propertyId: "prop-anggrek",
      period: { start: "2025-01-01", end: "2025-01-31" },
    });
  });
});

describe("monthValueToRange (Req 12.1)", () => {
  it("spans a 31-day month", () => {
    expect(monthValueToRange("2025-01")).toEqual({
      start: "2025-01-01",
      end: "2025-01-31",
    });
  });

  it("spans a 28-day (non-leap February) month", () => {
    expect(monthValueToRange("2025-02")).toEqual({
      start: "2025-02-01",
      end: "2025-02-28",
    });
  });

  it("spans a 29-day (leap February) month", () => {
    expect(monthValueToRange("2024-02")).toEqual({
      start: "2024-02-01",
      end: "2024-02-29",
    });
  });
});

describe("monthLabel", () => {
  it("renders a long Indonesian month and year", () => {
    expect(monthLabel("2025-02")).toBe("Februari 2025");
    expect(monthLabel("2024-12")).toBe("Desember 2024");
  });
});

describe("buildPeriodOptions (Req 12.1)", () => {
  it("returns distinct months newest-first with Indonesian labels", () => {
    const invoices = [
      makeInvoice({ id: "a", periodStart: "2025-01-01" }),
      makeInvoice({ id: "b", periodStart: "2025-02-01" }),
      makeInvoice({ id: "c", periodStart: "2025-02-15" }),
      makeInvoice({ id: "d", periodStart: "2024-12-01" }),
    ];
    expect(buildPeriodOptions(invoices)).toEqual([
      { value: "2025-02", label: "Februari 2025" },
      { value: "2025-01", label: "Januari 2025" },
      { value: "2024-12", label: "Desember 2024" },
    ]);
  });

  it("returns an empty list for no invoices", () => {
    expect(buildPeriodOptions([])).toEqual([]);
  });
});

describe("getTimelineIndex (Req 12.4)", () => {
  it("places draft at the first step", () => {
    expect(getTimelineIndex("draft")).toBe(0);
  });

  it("places tertagih and jatuh_tempo at the billed step", () => {
    expect(getTimelineIndex("tertagih")).toBe(1);
    expect(getTimelineIndex("jatuh_tempo")).toBe(1);
  });

  it("places lunas at the final step", () => {
    expect(getTimelineIndex("lunas")).toBe(TIMELINE_STEPS.length - 1);
  });

  it("treats batal as off-timeline", () => {
    expect(getTimelineIndex("batal")).toBe(-1);
  });
});

describe("simulateBulkInvoiceCount (Req 12.5)", () => {
  const properties: Property[] = [
    {
      id: "prop-melati",
      name: "Kos Melati",
      address: "Jl. A",
      city: "Yogyakarta",
      totalRooms: 6,
      occupiedRooms: 4,
    },
    {
      id: "prop-anggrek",
      name: "Kos Anggrek",
      address: "Jl. B",
      city: "Yogyakarta",
      totalRooms: 6,
      occupiedRooms: 5,
    },
  ];

  it("sums occupied rooms across all properties for the ALL sentinel", () => {
    expect(simulateBulkInvoiceCount(properties, ALL_FILTER)).toBe(9);
  });

  it("returns the occupied rooms of the selected property", () => {
    expect(simulateBulkInvoiceCount(properties, "prop-melati")).toBe(4);
  });

  it("returns 0 for an unknown property", () => {
    expect(simulateBulkInvoiceCount(properties, "prop-unknown")).toBe(0);
  });
});
