/**
 * Frontend view-model types — Task 3.1
 * ------------------------------------
 * UI-shaped view models for the Phase 1 mock data layer. These are a
 * camelCase, render-only subset of the future backend schema: they contain
 * only the fields the UI actually displays. They live here so both the mock
 * `DataSource` and (where forms exist) the Zod schemas can re-use them.
 *
 * All status union literals use the Bahasa Indonesia values the UI renders.
 * Money is integer Rupiah ({@link IDR}); dates are ISO strings interpreted in
 * Asia/Jakarta ({@link ISODate}).
 *
 * Requirements: 19.5
 */

/** A unique identifier (opaque string; UUID-shaped in fixtures). */
export type UUID = string;

/** Integer rupiah amount — no decimals are shown in IDR display. */
export type IDR = number;

/** An ISO date or datetime string, interpreted in the Asia/Jakarta timezone. */
export type ISODate = string;

/** Per-tenant configuration, branding, and subscription view. */
export interface TenantSettings {
  id: UUID;
  name: string;
  /** Tenant subdomain, e.g. "kosbunga". */
  subdomain: string;
  plan: "starter" | "pro" | "enterprise";
  status: "trial" | "aktif" | "ditangguhkan" | "berhenti";
  logoUrl?: string;
  /** Accent color used on the tenant's public payment page. */
  brandColor: string;
  timezone: "Asia/Jakarta";
  locale: "id-ID";
  waTemplates: { invoiceIssued: string; paymentSuccess: string; reminder: string };
  trialEndsAt?: ISODate;
}

/** A boarding-house property, with aggregate occupancy counts. */
export interface Property {
  id: UUID;
  name: string;
  address: string;
  city: string;
  totalRooms: number;
  occupiedRooms: number;
}

/** A single rentable room/unit within a property. */
export interface Room {
  id: UUID;
  propertyId: UUID;
  number: string;
  type: string;
  monthlyPrice: IDR;
  status: "tersedia" | "terisi" | "perbaikan";
  facilities: string[];
}

/** A resident (occupant) record, including KTP identity. */
export interface Resident {
  id: UUID;
  fullName: string;
  /** 16-digit Indonesian national ID number. */
  ktpNumber: string;
  ktpImageUrl?: string;
  phone: string;
  email?: string;
  emergencyContact?: string;
  roomNumber?: string;
  status: "aktif" | "keluar";
}

/** A digital rental contract linking a resident to a room. */
export interface Contract {
  id: UUID;
  residentName: string;
  roomNumber: string;
  startDate: ISODate;
  endDate: ISODate;
  depositAmount: IDR;
  monthlyPrice: IDR;
  status: "aktif" | "berakhir" | "diputus";
}

/** A single line item on an invoice. */
export interface InvoiceLine {
  description: string;
  amount: IDR;
}

/** A billing invoice for a resident's room over a period. */
export interface Invoice {
  id: UUID;
  invoiceNumber: string;
  residentName: string;
  roomNumber: string;
  periodStart: ISODate;
  periodEnd: ISODate;
  dueDate: ISODate;
  lines: InvoiceLine[];
  total: IDR;
  status: "draft" | "tertagih" | "lunas" | "jatuh_tempo" | "batal";
  /** Opaque token routing to the public payment page `/pay/[token]`. */
  paymentToken: string;
}

/** The public, no-auth invoice view rendered on `/pay/[token]`. */
export interface PublicInvoiceView {
  tenantName: string;
  tenantLogoUrl?: string;
  tenantBrandColor: string;
  invoiceNumber: string;
  residentName: string;
  roomLabel: string;
  lines: InvoiceLine[];
  total: IDR;
  dueDate: ISODate;
  status: Invoice["status"];
  channels: PaymentChannelView[];
}

/** A selectable payment channel shown on the public payment page. */
export interface PaymentChannelView {
  /** Channel code, e.g. "QRIS" | "BCA_VA" | "GOPAY" | "ALFAMART" | "MANUAL". */
  code: string;
  type: "qris" | "va" | "ewallet" | "retail" | "manual";
  displayName: string;
  logoUrl?: string;
  /** Optional fee note, e.g. "Gratis biaya admin". */
  feeLabel?: string;
  enabled: boolean;
}

/** Aggregated KPIs and recent activity for the tenant dashboard. */
export interface DashboardSummary {
  properties: number;
  totalRooms: number;
  occupiedRooms: number;
  monthlyRevenue: IDR;
  outstanding: IDR;
  overdueInvoices: number;
  recentPayments: { residentName: string; amount: IDR; paidAt: ISODate }[];
  revenueTrend: { month: string; amount: IDR }[];
}

/** A bundle of report datasets for the analytics surface. */
export interface ReportBundle {
  occupancyByProperty: { property: string; occupancyPct: number }[];
  revenueByMonth: { month: string; amount: IDR }[];
  agingBuckets: { bucket: string; amount: IDR }[];
  channelBreakdown: { channel: string; amount: IDR }[];
}

/** A tenant row in the super-admin tenant table. */
export interface TenantSaasSummary {
  id: UUID;
  name: string;
  plan: TenantSettings["plan"];
  status: TenantSettings["status"];
  rooms: number;
  mrr: IDR;
  joinedAt: ISODate;
}

/** Platform-wide metrics for the super-admin dashboard. */
export interface PlatformMetrics {
  mrr: IDR;
  activeTenants: number;
  trialTenants: number;
  churnPct: number;
  failedWebhooks: number;
  mrrTrend: { month: string; amount: IDR }[];
}

/**
 * Optional filter for {@link DataSource.listInvoices}. Any provided field
 * narrows the result; omitted fields are not constrained.
 */
export interface InvoiceFilter {
  status?: Invoice["status"];
  propertyId?: UUID;
  /** Inclusive period the invoice must overlap, interpreted in Asia/Jakarta. */
  period?: DateRange;
}

/** An inclusive date range, interpreted in Asia/Jakarta. */
export interface DateRange {
  start: ISODate;
  end: ISODate;
}
