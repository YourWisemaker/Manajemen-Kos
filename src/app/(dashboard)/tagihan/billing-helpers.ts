/**
 * Billing helpers — Task 17 (pure logic)
 * --------------------------------------
 * Framework-free, testable logic backing the invoices surface (`/tagihan`):
 * mapping the UI filter state to a {@link InvoiceFilter}, deriving the month
 * period options from a set of invoices, converting a `YYYY-MM` value into an
 * Asia/Jakarta {@link DateRange}, computing the invoice status-timeline index,
 * and simulating the bulk-generate count.
 *
 * Keeping this logic out of the page component lets us unit-test the filter
 * wiring and date math without rendering, while the page stays a thin view.
 *
 * Requirements: 12.1, 12.2, 12.4, 12.5
 */

import type { DateRange, Invoice, InvoiceFilter, Property } from "@/lib/data";

/** Sentinel value used by the status/property/period selects for "no filter". */
export const ALL_FILTER = "semua" as const;

/** The status filter union: every invoice status plus the "all" sentinel. */
export type StatusFilter = typeof ALL_FILTER | Invoice["status"];

/** A `{ value, label }` option used to populate the period select. */
export interface PeriodOption {
  /** The `YYYY-MM` value, or {@link ALL_FILTER}. */
  value: string;
  /** The Bahasa Indonesia label, e.g. "Februari 2025". */
  label: string;
}

const LOCALE = "id-ID";
const TIME_ZONE = "Asia/Jakarta";

/** Long Indonesian month + year, e.g. "Februari 2025". */
const bulanFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  month: "long",
  year: "numeric",
});

/** Zero-pad a 1- or 2-digit number to two characters. */
function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

/**
 * Render a `YYYY-MM` value as a long Indonesian month label.
 *
 * @param month - A `YYYY-MM` string, e.g. `"2025-02"`.
 * @returns e.g. `"Februari 2025"`, interpreted in Asia/Jakarta.
 */
export function monthLabel(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  // Day 1 at UTC midnight is still day 1 in WIB (UTC+7), so the month is stable.
  const date = new Date(Date.UTC(year, monthNumber - 1, 1));
  return bulanFormatter.format(date);
}

/**
 * Convert a `YYYY-MM` value into the inclusive Asia/Jakarta {@link DateRange}
 * spanning that whole calendar month (first day → last day).
 *
 * @param month - A `YYYY-MM` string, e.g. `"2025-02"`.
 * @returns e.g. `{ start: "2025-02-01", end: "2025-02-28" }`.
 */
export function monthValueToRange(month: string): DateRange {
  const [year, monthNumber] = month.split("-").map(Number);
  // Day 0 of the next month is the last day of this month (handles leap years).
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return {
    start: `${year}-${pad2(monthNumber)}-01`,
    end: `${year}-${pad2(monthNumber)}-${pad2(lastDay)}`,
  };
}

/**
 * Derive the distinct, newest-first month options from a set of invoices,
 * based on each invoice's billing-period start month.
 *
 * @param invoices - The (unfiltered) invoices to read periods from.
 * @returns Period options sorted newest-first; empty when there are none.
 */
export function buildPeriodOptions(invoices: Invoice[]): PeriodOption[] {
  const months = new Set(invoices.map((inv) => inv.periodStart.slice(0, 7)));
  return [...months]
    .sort()
    .reverse()
    .map((value) => ({ value, label: monthLabel(value) }));
}

/**
 * Map the UI filter selections to the {@link InvoiceFilter} consumed by
 * `dataSource.listInvoices`. The {@link ALL_FILTER} sentinel leaves a field
 * unconstrained (omitted from the filter).
 *
 * @param status - The selected status filter.
 * @param propertyId - The selected property id, or {@link ALL_FILTER}.
 * @param period - The selected `YYYY-MM` period, or {@link ALL_FILTER}.
 */
export function buildInvoiceFilter(
  status: StatusFilter,
  propertyId: string,
  period: string,
): InvoiceFilter {
  const filter: InvoiceFilter = {};
  if (status !== ALL_FILTER) {
    filter.status = status;
  }
  if (propertyId !== ALL_FILTER) {
    filter.propertyId = propertyId;
  }
  if (period !== ALL_FILTER) {
    filter.period = monthValueToRange(period);
  }
  return filter;
}

/** The happy-path invoice lifecycle rendered by the status timeline. */
export const TIMELINE_STEPS = ["draft", "tertagih", "lunas"] as const;

/**
 * Map an invoice status to its index on the {@link TIMELINE_STEPS} timeline.
 *
 * `jatuh_tempo` shares the "tertagih" step (it is a billed-but-overdue state);
 * `batal` is off-timeline and returns `-1`.
 *
 * @param status - The invoice status.
 * @returns The 0-based timeline index, or `-1` for `batal`.
 */
export function getTimelineIndex(status: Invoice["status"]): number {
  if (status === "draft") return 0;
  if (status === "tertagih" || status === "jatuh_tempo") return 1;
  if (status === "lunas") return 2;
  return -1; // batal
}

/**
 * Simulate how many invoices a bulk-generate run would create for the chosen
 * scope. The mocked count is the number of occupied rooms in the selected
 * property, or across all properties when {@link ALL_FILTER} is chosen.
 *
 * @param properties - The tenant's properties.
 * @param propertyId - The selected property id, or {@link ALL_FILTER}.
 * @returns The simulated number of invoices that would be generated.
 */
export function simulateBulkInvoiceCount(
  properties: Property[],
  propertyId: string,
): number {
  if (propertyId === ALL_FILTER) {
    return properties.reduce((sum, p) => sum + p.occupiedRooms, 0);
  }
  const property = properties.find((p) => p.id === propertyId);
  return property ? property.occupiedRooms : 0;
}
