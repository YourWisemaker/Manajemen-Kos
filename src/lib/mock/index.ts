/**
 * Mock data layer — public entry point — Task 3.2
 * -----------------------------------------------
 * `@/lib/mock` is the single import point for the Phase 1 mock data layer.
 * Surfaces import the `dataSource` singleton and the view-model types from
 * here so swapping the mock for a real API client later is a contained change.
 *
 * Requirements: 19.2, 19.5
 */

// The DataSource contract and its seeded mock implementation.
export { type DataSource, dataSource, MockDataSource } from "./datasource";
// Useful fixture constants for deep-linking and tests.
export {
  KNOWN_PAYMENT_TOKEN,
  PAYMENT_CHANNELS,
  PRIMARY_TENANT_ID,
  PRIMARY_TENANT_SEED,
  PROPERTY_IDS,
} from "./fixtures";
// View-model types and shared aliases.
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
} from "./types";
