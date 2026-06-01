/**
 * Typed mock data source — Task 3.2
 * ---------------------------------
 * The single seam between the UI and "server" data. In Phase 1 this is backed
 * by seeded in-memory fixtures (see `./fixtures.ts`); later the same
 * {@link DataSource} contract is fulfilled by real API calls, so swapping the
 * implementation is a contained change and surfaces never inline data.
 *
 * Every operation returns a Promise and resolves after a small simulated
 * latency to mimic future network round-trips. The latency is collapsed to
 * near-zero under test (`NODE_ENV === "test"`) so the suite stays fast.
 *
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5
 */

import {
  PLATFORM_METRICS,
  PUBLIC_INVOICES,
  TENANT_SAAS_SUMMARIES,
  TENANT_SEEDS,
  type TenantSeed,
} from "./fixtures";
import type {
  Contract,
  DashboardSummary,
  DateRange,
  Invoice,
  InvoiceFilter,
  PlatformMetrics,
  Property,
  PublicInvoiceView,
  ReportBundle,
  Resident,
  Room,
  TenantSaasSummary,
  TenantSettings,
  UUID,
} from "./types";

/**
 * The single typed contract the UI depends on for all server-shaped data.
 * Phase 1 is fulfilled by {@link MockDataSource}; later phases by a real API
 * client implementing the same interface.
 */
export interface DataSource {
  getDashboardSummary(tenantId: UUID): Promise<DashboardSummary>;
  listProperties(tenantId: UUID): Promise<Property[]>;
  listRooms(tenantId: UUID, propertyId: UUID): Promise<Room[]>;
  listResidents(tenantId: UUID): Promise<Resident[]>;
  listContracts(tenantId: UUID): Promise<Contract[]>;
  listInvoices(tenantId: UUID, filter?: InvoiceFilter): Promise<Invoice[]>;
  getInvoiceByToken(token: string): Promise<PublicInvoiceView | null>;
  getReports(tenantId: UUID, range: DateRange): Promise<ReportBundle>;
  getTenantSettings(tenantId: UUID): Promise<TenantSettings>;
  // super admin
  listTenants(): Promise<TenantSaasSummary[]>;
  getPlatformMetrics(): Promise<PlatformMetrics>;
}

/** True when running under the Vitest/Node test environment. */
const IS_TEST_ENV =
  typeof process !== "undefined" &&
  (process.env?.NODE_ENV === "test" || Boolean(process.env?.VITEST));

const MIN_LATENCY_MS = 50;
const MAX_LATENCY_MS = 150;

/**
 * Resolve `value` after a small simulated network latency.
 *
 * Under test the delay collapses to `0` so the suite stays fast while still
 * exercising the asynchronous contract; otherwise a short randomized delay in
 * the {@link MIN_LATENCY_MS}–{@link MAX_LATENCY_MS} range is used.
 */
function withLatency<T>(value: T): Promise<T> {
  if (IS_TEST_ENV) {
    return Promise.resolve(value);
  }
  const delay =
    MIN_LATENCY_MS + Math.floor(Math.random() * (MAX_LATENCY_MS - MIN_LATENCY_MS + 1));
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), delay);
  });
}

/** Return a deep-ish copy so callers can't mutate the shared fixtures. */
function clone<T>(value: T): T {
  return structuredClone(value);
}

/**
 * Seeded, in-memory implementation of {@link DataSource}. Reads exclusively
 * from the fixtures module; all reads are cloned so surfaces cannot mutate the
 * shared seed state.
 */
export class MockDataSource implements DataSource {
  private seed(tenantId: UUID): TenantSeed | undefined {
    return TENANT_SEEDS[tenantId];
  }

  async getDashboardSummary(tenantId: UUID): Promise<DashboardSummary> {
    const seed = this.seed(tenantId);
    return withLatency(clone(seed?.dashboard ?? EMPTY_DASHBOARD));
  }

  async listProperties(tenantId: UUID): Promise<Property[]> {
    const seed = this.seed(tenantId);
    return withLatency(clone(seed?.properties ?? []));
  }

  async listRooms(tenantId: UUID, propertyId: UUID): Promise<Room[]> {
    const seed = this.seed(tenantId);
    const rooms = (seed?.rooms ?? []).filter((room) => room.propertyId === propertyId);
    return withLatency(clone(rooms));
  }

  async listResidents(tenantId: UUID): Promise<Resident[]> {
    const seed = this.seed(tenantId);
    return withLatency(clone(seed?.residents ?? []));
  }

  async listContracts(tenantId: UUID): Promise<Contract[]> {
    const seed = this.seed(tenantId);
    return withLatency(clone(seed?.contracts ?? []));
  }

  async listInvoices(tenantId: UUID, filter?: InvoiceFilter): Promise<Invoice[]> {
    const seed = this.seed(tenantId);
    let invoices = seed?.invoices ?? [];

    if (filter?.status) {
      invoices = invoices.filter((inv) => inv.status === filter.status);
    }
    if (filter?.propertyId) {
      const index = seed?.invoicePropertyIndex ?? {};
      invoices = invoices.filter((inv) => index[inv.id] === filter.propertyId);
    }
    if (filter?.period) {
      const { start, end } = filter.period;
      // Keep invoices whose billing period overlaps the requested range.
      invoices = invoices.filter(
        (inv) => inv.periodStart <= end && inv.periodEnd >= start,
      );
    }

    return withLatency(clone(invoices));
  }

  async getInvoiceByToken(token: string): Promise<PublicInvoiceView | null> {
    // Use an own-property check so inherited members of the lookup object
    // (e.g. "toString", "constructor") are never treated as valid tokens.
    const view = Object.hasOwn(PUBLIC_INVOICES, token)
      ? PUBLIC_INVOICES[token]
      : undefined;
    // Unknown tokens resolve to null (Requirement 19.4).
    return withLatency(view ? clone(view) : null);
  }

  async getReports(tenantId: UUID, _range: DateRange): Promise<ReportBundle> {
    const seed = this.seed(tenantId);
    return withLatency(clone(seed?.reports ?? EMPTY_REPORTS));
  }

  async getTenantSettings(tenantId: UUID): Promise<TenantSettings> {
    const seed = this.seed(tenantId);
    if (!seed) {
      throw new Error(`Tenant tidak ditemukan: "${tenantId}"`);
    }
    return withLatency(clone(seed.settings));
  }

  async listTenants(): Promise<TenantSaasSummary[]> {
    return withLatency(clone(TENANT_SAAS_SUMMARIES));
  }

  async getPlatformMetrics(): Promise<PlatformMetrics> {
    return withLatency(clone(PLATFORM_METRICS));
  }
}

/** Fallback dashboard for tenants with no operational data. */
const EMPTY_DASHBOARD: DashboardSummary = {
  properties: 0,
  totalRooms: 0,
  occupiedRooms: 0,
  monthlyRevenue: 0,
  outstanding: 0,
  overdueInvoices: 0,
  recentPayments: [],
  revenueTrend: [],
};

/** Fallback report bundle for tenants with no operational data. */
const EMPTY_REPORTS: ReportBundle = {
  occupancyByProperty: [],
  revenueByMonth: [],
  agingBuckets: [],
  channelBreakdown: [],
};

/**
 * The shared singleton data source. Surfaces import this instance (or the
 * `dataSource` re-export from `@/lib/mock`) rather than constructing their own.
 */
export const dataSource: DataSource = new MockDataSource();
