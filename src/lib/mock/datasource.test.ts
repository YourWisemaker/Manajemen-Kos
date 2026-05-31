/**
 * Mock data source unit tests — Task 3.3
 * --------------------------------------
 * Verifies the Phase 1 mock data layer:
 *  - every operation resolves asynchronously (Promise-returning),
 *  - seeded fixtures conform to the frontend view-model types (runtime shape
 *    spot-checks; full structural typing is enforced at compile time),
 *  - `getInvoiceByToken` returns a non-null PublicInvoiceView for the seeded
 *    token and `null` for an unknown token,
 *  - `listInvoices` filters narrow the result set,
 *  - the QRIS channel is always present on the public invoice view.
 *
 * Requirements: 19.3, 19.4
 */

import { describe, expect, it } from "vitest";
import {
  dataSource,
  KNOWN_PAYMENT_TOKEN,
  MockDataSource,
  PRIMARY_TENANT_ID,
  PROPERTY_IDS,
} from "./index";
import type { Invoice, PublicInvoiceView } from "./types";

const INVOICE_STATUSES: Invoice["status"][] = [
  "draft",
  "tertagih",
  "lunas",
  "jatuh_tempo",
  "batal",
];

describe("MockDataSource — async contract (Req 19.3)", () => {
  it("returns a Promise from every operation", () => {
    expect(dataSource.getDashboardSummary(PRIMARY_TENANT_ID)).toBeInstanceOf(Promise);
    expect(dataSource.listProperties(PRIMARY_TENANT_ID)).toBeInstanceOf(Promise);
    expect(dataSource.listRooms(PRIMARY_TENANT_ID, PROPERTY_IDS.melati)).toBeInstanceOf(
      Promise,
    );
    expect(dataSource.listResidents(PRIMARY_TENANT_ID)).toBeInstanceOf(Promise);
    expect(dataSource.listContracts(PRIMARY_TENANT_ID)).toBeInstanceOf(Promise);
    expect(dataSource.listInvoices(PRIMARY_TENANT_ID)).toBeInstanceOf(Promise);
    expect(dataSource.getInvoiceByToken(KNOWN_PAYMENT_TOKEN)).toBeInstanceOf(Promise);
    expect(
      dataSource.getReports(PRIMARY_TENANT_ID, {
        start: "2025-01-01",
        end: "2025-02-28",
      }),
    ).toBeInstanceOf(Promise);
    expect(dataSource.getTenantSettings(PRIMARY_TENANT_ID)).toBeInstanceOf(Promise);
    expect(dataSource.listTenants()).toBeInstanceOf(Promise);
    expect(dataSource.getPlatformMetrics()).toBeInstanceOf(Promise);
  });

  it("resolves asynchronously to seeded data", async () => {
    const properties = await dataSource.listProperties(PRIMARY_TENANT_ID);
    expect(properties.length).toBeGreaterThanOrEqual(2);
  });

  it("returns cloned data so callers cannot mutate shared fixtures", async () => {
    const first = await dataSource.listProperties(PRIMARY_TENANT_ID);
    first[0].name = "MUTATED";
    const second = await dataSource.listProperties(PRIMARY_TENANT_ID);
    expect(second[0].name).not.toBe("MUTATED");
  });
});

describe("MockDataSource — fixture conformance (Req 19.5)", () => {
  it("dashboard summary has the required numeric KPIs and trend shape", async () => {
    const summary = await dataSource.getDashboardSummary(PRIMARY_TENANT_ID);
    expect(typeof summary.properties).toBe("number");
    expect(typeof summary.monthlyRevenue).toBe("number");
    expect(Number.isInteger(summary.monthlyRevenue)).toBe(true);
    expect(summary.revenueTrend.length).toBeGreaterThan(0);
    expect(summary.recentPayments.length).toBeGreaterThan(0);
    for (const point of summary.revenueTrend) {
      expect(typeof point.month).toBe("string");
      expect(Number.isInteger(point.amount)).toBe(true);
    }
  });

  it("rooms conform to the Room view model with valid status literals", async () => {
    const rooms = await dataSource.listRooms(PRIMARY_TENANT_ID, PROPERTY_IDS.melati);
    expect(rooms.length).toBeGreaterThan(0);
    for (const room of rooms) {
      expect(room.propertyId).toBe(PROPERTY_IDS.melati);
      expect(["tersedia", "terisi", "perbaikan"]).toContain(room.status);
      expect(Number.isInteger(room.monthlyPrice)).toBe(true);
      expect(Array.isArray(room.facilities)).toBe(true);
    }
  });

  it("residents carry 16-digit KTP numbers and +62 phones", async () => {
    const residents = await dataSource.listResidents(PRIMARY_TENANT_ID);
    expect(residents.length).toBeGreaterThan(0);
    for (const resident of residents) {
      expect(resident.ktpNumber).toMatch(/^\d{16}$/);
      expect(resident.phone).toMatch(/^\+62\d+$/);
      expect(["aktif", "keluar"]).toContain(resident.status);
    }
  });

  it("invoices use valid status literals and totals equal to the line sum", async () => {
    const invoices = await dataSource.listInvoices(PRIMARY_TENANT_ID);
    expect(invoices.length).toBeGreaterThan(0);
    for (const invoice of invoices) {
      expect(INVOICE_STATUSES).toContain(invoice.status);
      expect(Number.isInteger(invoice.total)).toBe(true);
      expect(invoice.lines.length).toBeGreaterThan(0);
      const sum = invoice.lines.reduce((acc, line) => acc + line.amount, 0);
      expect(invoice.total).toBe(sum);
    }
  });

  it("seeds invoices covering every allowed status", async () => {
    const invoices = await dataSource.listInvoices(PRIMARY_TENANT_ID);
    const statuses = new Set(invoices.map((inv) => inv.status));
    for (const status of INVOICE_STATUSES) {
      expect(statuses).toContain(status);
    }
  });

  it("seeds rooms covering every allowed status across properties", async () => {
    const perProperty = await Promise.all(
      Object.values(PROPERTY_IDS).map((id) =>
        dataSource.listRooms(PRIMARY_TENANT_ID, id),
      ),
    );
    const statuses = new Set(perProperty.flat().map((room) => room.status));
    for (const status of ["tersedia", "terisi", "perbaikan"] as const) {
      expect(statuses).toContain(status);
    }
  });

  it("lists properties with non-negative, bounded occupancy", async () => {
    const properties = await dataSource.listProperties(PRIMARY_TENANT_ID);
    expect(properties.length).toBeGreaterThan(1);
    for (const property of properties) {
      expect(property.occupiedRooms).toBeGreaterThanOrEqual(0);
      expect(property.occupiedRooms).toBeLessThanOrEqual(property.totalRooms);
    }
  });

  it("tenant settings expose plan/status literals and id-ID locale", async () => {
    const settings = await dataSource.getTenantSettings(PRIMARY_TENANT_ID);
    expect(["starter", "pro", "enterprise"]).toContain(settings.plan);
    expect(["trial", "aktif", "ditangguhkan", "berhenti"]).toContain(settings.status);
    expect(settings.locale).toBe("id-ID");
    expect(settings.timezone).toBe("Asia/Jakarta");
  });

  it("super-admin views seed multiple tenants and a platform MRR trend", async () => {
    const tenants = await dataSource.listTenants();
    const metrics = await dataSource.getPlatformMetrics();
    expect(tenants.length).toBeGreaterThanOrEqual(3);
    const plans = new Set(tenants.map((t) => t.plan));
    expect(plans).toContain("starter");
    expect(plans).toContain("pro");
    expect(plans).toContain("enterprise");
    expect(metrics.mrrTrend.length).toBeGreaterThan(0);
    expect(Number.isInteger(metrics.mrr)).toBe(true);
  });

  it("reports bundle has all four datasets", async () => {
    const reports = await dataSource.getReports(PRIMARY_TENANT_ID, {
      start: "2024-09-01",
      end: "2025-02-28",
    });
    expect(reports.occupancyByProperty.length).toBeGreaterThan(0);
    expect(reports.revenueByMonth.length).toBeGreaterThan(0);
    expect(reports.agingBuckets.length).toBeGreaterThan(0);
    expect(reports.channelBreakdown.length).toBeGreaterThan(0);
  });
});

describe("getInvoiceByToken (Req 19.4)", () => {
  it("resolves to a non-null PublicInvoiceView for the seeded token", async () => {
    const view = await dataSource.getInvoiceByToken(KNOWN_PAYMENT_TOKEN);
    expect(view).not.toBeNull();
    const invoice = view as PublicInvoiceView;
    expect(invoice.invoiceNumber).toBe(KNOWN_PAYMENT_TOKEN);
    expect(invoice.residentName).toBeTruthy();
    expect(invoice.roomLabel).toBeTruthy();
    expect(Number.isInteger(invoice.total)).toBe(true);
    expect(invoice.channels.length).toBeGreaterThan(0);
  });

  it("resolves to null for an unknown token", async () => {
    const view = await dataSource.getInvoiceByToken("DOES-NOT-EXIST");
    expect(view).toBeNull();
  });

  it("always includes a QRIS channel on the public invoice view (Req 13.3)", async () => {
    const view = await dataSource.getInvoiceByToken(KNOWN_PAYMENT_TOKEN);
    expect(view).not.toBeNull();
    const codes = (view as PublicInvoiceView).channels.map((c) => c.code);
    expect(codes).toContain("QRIS");
    const qris = (view as PublicInvoiceView).channels.find((c) => c.code === "QRIS");
    expect(qris?.type).toBe("qris");
    expect(qris?.enabled).toBe(true);
  });
});

describe("listInvoices filtering", () => {
  it("narrows results by status", async () => {
    const all = await dataSource.listInvoices(PRIMARY_TENANT_ID);
    const lunas = await dataSource.listInvoices(PRIMARY_TENANT_ID, { status: "lunas" });
    expect(lunas.length).toBeGreaterThan(0);
    expect(lunas.length).toBeLessThan(all.length);
    expect(lunas.every((inv) => inv.status === "lunas")).toBe(true);
  });

  it("narrows results by property", async () => {
    const melatiInvoices = await dataSource.listInvoices(PRIMARY_TENANT_ID, {
      propertyId: PROPERTY_IDS.melati,
    });
    expect(melatiInvoices.length).toBeGreaterThan(0);
    const all = await dataSource.listInvoices(PRIMARY_TENANT_ID);
    expect(melatiInvoices.length).toBeLessThan(all.length);
  });

  it("narrows results by billing period overlap", async () => {
    const febOnly = await dataSource.listInvoices(PRIMARY_TENANT_ID, {
      period: { start: "2025-02-01", end: "2025-02-28" },
    });
    expect(febOnly.length).toBeGreaterThan(0);
    expect(
      febOnly.every(
        (inv) => inv.periodStart <= "2025-02-28" && inv.periodEnd >= "2025-02-01",
      ),
    ).toBe(true);
  });

  it("combines filters (status + property)", async () => {
    const result = await dataSource.listInvoices(PRIMARY_TENANT_ID, {
      status: "tertagih",
      propertyId: PROPERTY_IDS.melati,
    });
    expect(result.every((inv) => inv.status === "tertagih")).toBe(true);
  });
});

describe("empty / missing tenants", () => {
  it("returns empty collections for a tenant with no operational data", async () => {
    const properties = await dataSource.listProperties("tenant-griya-asri");
    const invoices = await dataSource.listInvoices("tenant-griya-asri");
    expect(properties).toEqual([]);
    expect(invoices).toEqual([]);
  });

  it("throws when settings are requested for an unknown tenant", async () => {
    await expect(dataSource.getTenantSettings("tenant-unknown")).rejects.toThrow();
  });

  it("exposes a constructable MockDataSource class", () => {
    expect(new MockDataSource()).toBeInstanceOf(MockDataSource);
  });
});
