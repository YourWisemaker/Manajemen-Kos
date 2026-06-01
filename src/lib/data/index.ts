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

export type { DataSource } from "@/lib/mock/datasource";
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

/**
 * The active DataSource instance. Determined at module load time by the
 * `USE_REAL_DB` environment variable.
 *
 * - `USE_REAL_DB=true` → RealDataSource (PostgreSQL via Drizzle ORM)
 * - Otherwise → MockDataSource (in-memory fixtures)
 */
export const dataSource: DataSource =
  process.env.USE_REAL_DB === "true"
    ? (() => {
        // Dynamic require to avoid importing server-only code in client bundles
        // when USE_REAL_DB is not set.
        const { RealDataSource } =
          require("@/lib/server/datasource") as typeof import("@/lib/server/datasource");
        return new RealDataSource();
      })()
    : (() => {
        const { dataSource: mock } =
          require("@/lib/mock/datasource") as typeof import("@/lib/mock/datasource");
        return mock;
      })();
