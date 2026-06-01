/**
 * DataSource swap mechanism — Task 5.2
 * -------------------------------------
 * Exports the correct DataSource implementation based on the `USE_REAL_DB`
 * environment variable. When `USE_REAL_DB=true`, the real PostgreSQL-backed
 * implementation is used; otherwise the mock fixtures are served.
 *
 * This module is the seam: frontend imports can migrate from `@/lib/mock` to
 * `@/lib/data` without changing any surface code. All view-model types are
 * re-exported so the import surface is unchanged.
 *
 * Requirements: 5.7
 */

import type { DataSource } from "@/lib/mock/datasource";
import { dataSource as mockDataSource } from "@/lib/mock/datasource";

export type { DataSource, MockDataSource } from "@/lib/mock/datasource";
// Re-export fixture constants so pages can import from `@/lib/data` instead of `@/lib/mock`
export {
  KNOWN_PAYMENT_TOKEN,
  PAYMENT_CHANNELS,
  PRIMARY_TENANT_ID,
  PRIMARY_TENANT_SEED,
  PROPERTY_IDS,
} from "@/lib/mock/fixtures";
// Re-export all view-model types so consumers can import from `@/lib/data`
export type {
  Contract,
  DashboardSummary,
  DateRange,
  IDR,
  Invoice,
  InvoiceFilter,
  InvoiceLine,
  ISODate,
  PaymentChannelView,
  PlatformMetrics,
  Property,
  PublicInvoiceView,
  ReportBundle,
  Resident,
  Room,
  TenantSaasSummary,
  TenantSettings,
  UUID,
} from "@/lib/mock/types";

function createDataSource(): DataSource {
  if (process.env.USE_REAL_DB === "true") {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { RealDataSource } =
      require("@/lib/server/datasource") as typeof import("@/lib/server/datasource");
    return new RealDataSource();
  }
  return mockDataSource;
}

/**
 * The active DataSource instance. Determined at module load time by the
 * `USE_REAL_DB` environment variable.
 *
 * - `USE_REAL_DB=true` → RealDataSource (PostgreSQL via Drizzle ORM)
 * - Otherwise → MockDataSource (in-memory fixtures)
 */
export const dataSource: DataSource = createDataSource();
