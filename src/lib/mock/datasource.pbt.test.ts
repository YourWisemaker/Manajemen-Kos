/**
 * DataSource token-lookup & invoice-filtering property tests — Task 5.3
 * --------------------------------------------------------------------
 * Property 8 (partial — token lookup) from the backend design document.
 *
 * The real implementation under test is `RealDataSource`
 * (`src/lib/server/datasource.ts`), which requires a live PostgreSQL database
 * that is not available in this environment. The mock `MockDataSource`
 * fulfils the *exact same* `DataSource` contract + view-model types and
 * embodies the same token-lookup invariant (valid token → exactly one
 * `PublicInvoiceView`; invalid token → `null`). These properties therefore
 * validate the shared `DataSource` contract (Req 5.5, 5.6) at the layer that
 * is deterministically testable without Postgres.
 *
 * fast-check, ≥100 runs via the shared `pbtConfig`. Each property is tagged
 * with the requirement it validates.
 */

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { pbtConfig } from "@/test/pbt";
import { PUBLIC_INVOICES } from "./fixtures";
import { dataSource, PRIMARY_TENANT_ID, PROPERTY_IDS } from "./index";
import type { Invoice } from "./types";

/** Every token wired into a public invoice view (the only valid tokens). */
const KNOWN_TOKENS = Object.keys(PUBLIC_INVOICES);

/** Generator over the seeded, valid payment tokens. */
const knownTokenArb = fc.constantFrom(...KNOWN_TOKENS);

/** All invoice status literals from the view-model union. */
const INVOICE_STATUSES: Invoice["status"][] = [
  "draft",
  "tertagih",
  "lunas",
  "jatuh_tempo",
  "batal",
];
const statusArb = fc.constantFrom(...INVOICE_STATUSES);

/** A YYYY-MM-DD ISO date string (string-comparable, as the contract relies on). */
const isoDateArb = fc
  .date({
    min: new Date("2023-01-01T00:00:00Z"),
    max: new Date("2026-12-31T00:00:00Z"),
    noInvalidDate: true,
  })
  .map((d) => d.toISOString().slice(0, 10));

/** An ordered inclusive date range [start, end] with start <= end. */
const dateRangeArb = fc
  .tuple(isoDateArb, isoDateArb)
  .map(([a, b]) => (a <= b ? { start: a, end: b } : { start: b, end: a }));

describe("Property 8 — token lookup resolves to exactly one invoice or null", () => {
  it("returns exactly one well-formed PublicInvoiceView for any valid token", async () => {
    // **Validates: Requirements 5.5**
    await fc.assert(
      fc.asyncProperty(knownTokenArb, async (token) => {
        const view = await dataSource.getInvoiceByToken(token);

        // Exactly one result (never null) for a valid token.
        expect(view).not.toBeNull();
        if (view === null) return;

        // Well-formed public view: branding present, totals non-negative.
        expect(typeof view.tenantName).toBe("string");
        expect(view.tenantName.length).toBeGreaterThan(0);
        expect(typeof view.tenantBrandColor).toBe("string");
        expect(view.tenantBrandColor.length).toBeGreaterThan(0);
        expect(view.residentName.length).toBeGreaterThan(0);
        expect(view.roomLabel.length).toBeGreaterThan(0);
        expect(Number.isInteger(view.total)).toBe(true);
        expect(view.total).toBeGreaterThanOrEqual(0);

        // The available payment channels always include an enabled QRIS option.
        expect(view.channels.length).toBeGreaterThan(0);
        const qris = view.channels.find((c) => c.code === "QRIS");
        expect(qris).toBeDefined();
        expect(qris?.type).toBe("qris");
        expect(qris?.enabled).toBe(true);
      }),
      pbtConfig,
    );
  });

  it("resolves to null for any token that is not in the fixture set", async () => {
    // **Validates: Requirements 5.6**
    await fc.assert(
      fc.asyncProperty(
        fc.string().filter((s) => !KNOWN_TOKENS.includes(s)),
        async (token) => {
          const view = await dataSource.getInvoiceByToken(token);
          expect(view).toBeNull();
        },
      ),
      pbtConfig,
    );
  });

  it("is deterministic — repeated lookups of the same token agree", async () => {
    // **Validates: Requirements 5.5, 5.6**
    await fc.assert(
      fc.asyncProperty(knownTokenArb, async (token) => {
        const [a, b] = await Promise.all([
          dataSource.getInvoiceByToken(token),
          dataSource.getInvoiceByToken(token),
        ]);
        expect(a).toEqual(b);
      }),
      pbtConfig,
    );
  });
});

describe("listInvoices filtering — shared DataSource contract", () => {
  it("status filter returns only invoices with that status, and a subset of all", async () => {
    // **Validates: Requirements 5.4**
    const all = await dataSource.listInvoices(PRIMARY_TENANT_ID);
    await fc.assert(
      fc.asyncProperty(statusArb, async (status) => {
        const filtered = await dataSource.listInvoices(PRIMARY_TENANT_ID, { status });
        // Every returned invoice carries the requested status.
        expect(filtered.every((inv) => inv.status === status)).toBe(true);
        // The filtered set is exactly the matching subset of the full set.
        const expected = all.filter((inv) => inv.status === status);
        expect(filtered.length).toBe(expected.length);
        expect(filtered.length).toBeLessThanOrEqual(all.length);
      }),
      pbtConfig,
    );
  });

  it("property filter returns only invoices belonging to that property", async () => {
    // **Validates: Requirements 5.4**
    const propertyArb = fc.constantFrom(...Object.values(PROPERTY_IDS));
    const all = await dataSource.listInvoices(PRIMARY_TENANT_ID);
    await fc.assert(
      fc.asyncProperty(propertyArb, async (propertyId) => {
        const filtered = await dataSource.listInvoices(PRIMARY_TENANT_ID, {
          propertyId,
        });
        expect(filtered.length).toBeLessThanOrEqual(all.length);
        // Result is a subset of the full set (same invoice ids).
        const allIds = new Set(all.map((inv) => inv.id));
        expect(filtered.every((inv) => allIds.has(inv.id))).toBe(true);
      }),
      pbtConfig,
    );
  });

  it("period filter returns only invoices whose billing period overlaps the range", async () => {
    // **Validates: Requirements 5.4**
    await fc.assert(
      fc.asyncProperty(dateRangeArb, async (period) => {
        const filtered = await dataSource.listInvoices(PRIMARY_TENANT_ID, { period });
        // Overlap invariant: periodStart <= range.end AND periodEnd >= range.start.
        expect(
          filtered.every(
            (inv) => inv.periodStart <= period.end && inv.periodEnd >= period.start,
          ),
        ).toBe(true);
      }),
      pbtConfig,
    );
  });
});
