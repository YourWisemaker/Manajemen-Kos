/**
 * Real DataSource implementation — Task 5.1
 * ------------------------------------------
 * Replaces the mock DataSource with real PostgreSQL queries via Drizzle ORM.
 * Each method queries the database with tenant isolation enforced by
 * `withTenantDb()` (which sets the RLS session variable).
 *
 * Return types match the frontend view-model types exactly so the UI surfaces
 * remain unchanged when swapping from mock to real.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */

import { and, count, eq, gte, lte, sql, sum } from "drizzle-orm";

import type { DataSource } from "@/lib/mock/datasource";
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
} from "@/lib/mock/types";
import { getDb, withTenantDb } from "@/lib/server/db";
import {
  contract,
  gatewayConfig,
  invoice,
  invoiceLine,
  kosTenant,
  payment,
  paymentChannel,
  property,
  room,
  subscription,
  tenantSaas,
} from "@/lib/server/db/schema";

/**
 * Real implementation of the DataSource interface backed by PostgreSQL.
 * Each method uses `withTenantDb` for tenant-scoped queries (RLS enforced),
 * except `listTenants` and `getPlatformMetrics` which use `getDb()` directly
 * for cross-tenant aggregation (super admin only).
 */
export class RealDataSource implements DataSource {
  /** Req 5.3 — Aggregate dashboard metrics from properties, rooms, invoices, payments. */
  async getDashboardSummary(tenantId: UUID): Promise<DashboardSummary> {
    return withTenantDb(tenantId, async (tdb) => {
      // Property count
      const [propCount] = await tdb
        .select({ value: count() })
        .from(property)
        .where(eq(property.tenantId, tenantId));

      // Room counts
      const [roomCounts] = await tdb
        .select({
          total: count(),
          occupied: count(sql`CASE WHEN ${room.status} = 'terisi' THEN 1 END`),
        })
        .from(room)
        .where(eq(room.tenantId, tenantId));

      // Monthly revenue: sum of paid invoices this month
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .slice(0, 10);

      const [revenueRow] = await tdb
        .select({ value: sum(invoice.total) })
        .from(invoice)
        .where(
          and(
            eq(invoice.tenantId, tenantId),
            eq(invoice.status, "lunas"),
            gte(invoice.dueDate, monthStart),
            lte(invoice.dueDate, monthEnd),
          ),
        );

      // Outstanding: sum of unpaid invoices (tertagih + jatuh_tempo)
      const [outstandingRow] = await tdb
        .select({ value: sum(invoice.total) })
        .from(invoice)
        .where(
          and(
            eq(invoice.tenantId, tenantId),
            sql`${invoice.status} IN ('tertagih', 'jatuh_tempo')`,
          ),
        );

      // Overdue invoice count
      const [overdueCount] = await tdb
        .select({ value: count() })
        .from(invoice)
        .where(and(eq(invoice.tenantId, tenantId), eq(invoice.status, "jatuh_tempo")));

      // Recent payments (last 10)
      const recentPayments = await tdb
        .select({
          residentName: kosTenant.fullName,
          amount: payment.amountPaid,
          paidAt: payment.paidAt,
        })
        .from(payment)
        .innerJoin(invoice, eq(payment.invoiceId, invoice.id))
        .innerJoin(contract, eq(invoice.contractId, contract.id))
        .innerJoin(kosTenant, eq(contract.kosTenantId, kosTenant.id))
        .where(and(eq(payment.tenantId, tenantId), eq(payment.status, "settled")))
        .orderBy(sql`${payment.paidAt} DESC`)
        .limit(10);

      // Revenue trend: last 6 months
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
        .toISOString()
        .slice(0, 10);

      const revenueTrendRows = await tdb
        .select({
          month: sql<string>`to_char(${invoice.dueDate}::date, 'YYYY-MM')`,
          amount: sum(invoice.total),
        })
        .from(invoice)
        .where(
          and(
            eq(invoice.tenantId, tenantId),
            eq(invoice.status, "lunas"),
            gte(invoice.dueDate, sixMonthsAgo),
          ),
        )
        .groupBy(sql`to_char(${invoice.dueDate}::date, 'YYYY-MM')`)
        .orderBy(sql`to_char(${invoice.dueDate}::date, 'YYYY-MM')`);

      return {
        properties: propCount?.value ?? 0,
        totalRooms: roomCounts?.total ?? 0,
        occupiedRooms: roomCounts?.occupied ?? 0,
        monthlyRevenue: Number(revenueRow?.value ?? 0),
        outstanding: Number(outstandingRow?.value ?? 0),
        overdueInvoices: overdueCount?.value ?? 0,
        recentPayments: recentPayments.map((p) => ({
          residentName: p.residentName,
          amount: Number(p.amount),
          paidAt: p.paidAt?.toISOString() ?? "",
        })),
        revenueTrend: revenueTrendRows.map((r) => ({
          month: r.month,
          amount: Number(r.amount ?? 0),
        })),
      };
    });
  }

  /** Req 5.1 — List properties with occupancy counts. */
  async listProperties(tenantId: UUID): Promise<Property[]> {
    return withTenantDb(tenantId, async (tdb) => {
      const rows = await tdb
        .select({
          id: property.id,
          name: property.name,
          address: property.address,
          city: property.city,
          totalRooms: property.totalRooms,
          occupiedRooms: sql<number>`(
            SELECT COUNT(*)::int FROM room
            WHERE room.property_id = ${property.id}
              AND room.status = 'terisi'
          )`,
        })
        .from(property)
        .where(eq(property.tenantId, tenantId));

      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        address: r.address,
        city: r.city,
        totalRooms: r.totalRooms ?? 0,
        occupiedRooms: r.occupiedRooms ?? 0,
      }));
    });
  }

  /** Req 5.1 — List rooms for a specific property. */
  async listRooms(tenantId: UUID, propertyId: UUID): Promise<Room[]> {
    return withTenantDb(tenantId, async (tdb) => {
      const rows = await tdb
        .select()
        .from(room)
        .where(and(eq(room.tenantId, tenantId), eq(room.propertyId, propertyId)));

      return rows.map((r) => ({
        id: r.id,
        propertyId: r.propertyId,
        number: r.number,
        type: r.type,
        monthlyPrice: Number(r.monthlyPrice),
        status: r.status as Room["status"],
        facilities: (r.facilities as string[]) ?? [],
      }));
    });
  }

  /** Req 5.1 — List all residents for a tenant. */
  async listResidents(tenantId: UUID): Promise<Resident[]> {
    return withTenantDb(tenantId, async (tdb) => {
      // Join with contract + room to get roomNumber and derive status
      const rows = await tdb
        .select({
          id: kosTenant.id,
          fullName: kosTenant.fullName,
          ktpNumber: kosTenant.ktpNumber,
          ktpImageKey: kosTenant.ktpImageKey,
          phone: kosTenant.phone,
          email: kosTenant.email,
          emergencyContact: kosTenant.emergencyContact,
          roomNumber: room.number,
          contractStatus: contract.status,
        })
        .from(kosTenant)
        .leftJoin(
          contract,
          and(eq(contract.kosTenantId, kosTenant.id), eq(contract.status, "active")),
        )
        .leftJoin(room, eq(room.id, contract.roomId))
        .where(eq(kosTenant.tenantId, tenantId));

      return rows.map((r) => ({
        id: r.id,
        fullName: r.fullName,
        ktpNumber: r.ktpNumber,
        ktpImageUrl: r.ktpImageKey ?? undefined,
        phone: r.phone,
        email: r.email ?? undefined,
        emergencyContact: r.emergencyContact ?? undefined,
        roomNumber: r.roomNumber ?? undefined,
        status: (r.contractStatus === "active"
          ? "aktif"
          : "keluar") as Resident["status"],
      }));
    });
  }

  /** Req 5.1 — List contracts with resident name and room number joins. */
  async listContracts(tenantId: UUID): Promise<Contract[]> {
    return withTenantDb(tenantId, async (tdb) => {
      const rows = await tdb
        .select({
          id: contract.id,
          residentName: kosTenant.fullName,
          roomNumber: room.number,
          startDate: contract.startDate,
          endDate: contract.endDate,
          depositAmount: contract.depositAmount,
          monthlyPrice: contract.monthlyPrice,
          status: contract.status,
        })
        .from(contract)
        .innerJoin(kosTenant, eq(contract.kosTenantId, kosTenant.id))
        .innerJoin(room, eq(contract.roomId, room.id))
        .where(eq(contract.tenantId, tenantId));

      return rows.map((r) => ({
        id: r.id,
        residentName: r.residentName,
        roomNumber: r.roomNumber,
        startDate: r.startDate,
        endDate: r.endDate,
        depositAmount: Number(r.depositAmount),
        monthlyPrice: Number(r.monthlyPrice),
        status: mapContractStatus(r.status),
      }));
    });
  }

  /** Req 5.4 — List invoices with optional filtering by status, propertyId, period. */
  async listInvoices(tenantId: UUID, filter?: InvoiceFilter): Promise<Invoice[]> {
    return withTenantDb(tenantId, async (tdb) => {
      const conditions = [eq(invoice.tenantId, tenantId)];

      if (filter?.status) {
        conditions.push(eq(invoice.status, filter.status));
      }
      if (filter?.propertyId) {
        // Filter by property via contract → room → property chain
        conditions.push(
          sql`${invoice.contractId} IN (
            SELECT c.id FROM contract c
            JOIN room r ON r.id = c.room_id
            WHERE r.property_id = ${filter.propertyId}
          )`,
        );
      }
      if (filter?.period) {
        // Overlap: invoice period overlaps the requested range
        conditions.push(lte(invoice.periodStart, filter.period.end));
        conditions.push(gte(invoice.periodEnd, filter.period.start));
      }

      const invoiceRows = await tdb
        .select({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          residentName: kosTenant.fullName,
          roomNumber: room.number,
          periodStart: invoice.periodStart,
          periodEnd: invoice.periodEnd,
          dueDate: invoice.dueDate,
          total: invoice.total,
          status: invoice.status,
          paymentLinkToken: invoice.paymentLinkToken,
        })
        .from(invoice)
        .innerJoin(contract, eq(invoice.contractId, contract.id))
        .innerJoin(kosTenant, eq(contract.kosTenantId, kosTenant.id))
        .innerJoin(room, eq(contract.roomId, room.id))
        .where(and(...conditions));

      // Fetch lines for all returned invoices
      const invoiceIds = invoiceRows.map((r) => r.id);
      const lines =
        invoiceIds.length > 0
          ? await tdb
              .select()
              .from(invoiceLine)
              .where(
                sql`${invoiceLine.invoiceId} IN (${sql.join(
                  invoiceIds.map((id) => sql`${id}`),
                  sql`, `,
                )})`,
              )
          : [];

      const linesByInvoice = new Map<string, { description: string; amount: number }[]>();
      for (const line of lines) {
        const arr = linesByInvoice.get(line.invoiceId) ?? [];
        arr.push({ description: line.description, amount: Number(line.amount) });
        linesByInvoice.set(line.invoiceId, arr);
      }

      return invoiceRows.map((r) => ({
        id: r.id,
        invoiceNumber: r.invoiceNumber,
        residentName: r.residentName,
        roomNumber: r.roomNumber,
        periodStart: r.periodStart,
        periodEnd: r.periodEnd,
        dueDate: r.dueDate,
        lines: linesByInvoice.get(r.id) ?? [],
        total: Number(r.total),
        status: r.status as Invoice["status"],
        paymentToken: r.paymentLinkToken,
      }));
    });
  }

  /** Req 5.5, 5.6 — Get public invoice view by payment link token. */
  async getInvoiceByToken(token: string): Promise<PublicInvoiceView | null> {
    const db = getDb();

    // Token lookup is cross-tenant (public page, no auth)
    const [row] = await db
      .select({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        dueDate: invoice.dueDate,
        status: invoice.status,
        tenantId: invoice.tenantId,
        contractId: invoice.contractId,
      })
      .from(invoice)
      .where(eq(invoice.paymentLinkToken, token))
      .limit(1);

    if (!row) return null;

    // Fetch tenant branding
    const [tenant] = await db
      .select({
        name: tenantSaas.name,
        logoUrl: tenantSaas.logoUrl,
        settings: tenantSaas.settings,
      })
      .from(tenantSaas)
      .where(eq(tenantSaas.id, row.tenantId));

    // Fetch resident name + room label via contract
    const [contractRow] = await db
      .select({
        residentName: kosTenant.fullName,
        roomNumber: room.number,
      })
      .from(contract)
      .innerJoin(kosTenant, eq(contract.kosTenantId, kosTenant.id))
      .innerJoin(room, eq(contract.roomId, room.id))
      .where(eq(contract.id, row.contractId));

    // Fetch invoice lines
    const lines = await db
      .select({
        description: invoiceLine.description,
        amount: invoiceLine.amount,
      })
      .from(invoiceLine)
      .where(eq(invoiceLine.invoiceId, row.invoiceId));

    // Fetch active payment channels for this tenant
    const channels = await db
      .select({
        code: paymentChannel.channelCode,
        type: paymentChannel.channelType,
        displayName: paymentChannel.displayName,
        isEnabled: paymentChannel.isEnabled,
      })
      .from(paymentChannel)
      .innerJoin(gatewayConfig, eq(paymentChannel.gatewayConfigId, gatewayConfig.id))
      .where(
        and(eq(paymentChannel.tenantId, row.tenantId), eq(gatewayConfig.isActive, true)),
      );

    const settings = (tenant?.settings ?? {}) as Record<string, unknown>;

    return {
      tenantName: tenant?.name ?? "",
      tenantLogoUrl: tenant?.logoUrl ?? undefined,
      tenantBrandColor: (settings.brandColor as string) ?? "#4F46E5",
      invoiceNumber: row.invoiceNumber,
      residentName: contractRow?.residentName ?? "",
      roomLabel: contractRow?.roomNumber ?? "",
      lines: lines.map((l) => ({
        description: l.description,
        amount: Number(l.amount),
      })),
      total: Number(row.total),
      dueDate: row.dueDate,
      status: row.status as Invoice["status"],
      channels: channels.map((ch) => ({
        code: ch.code,
        type: ch.type as PublicInvoiceView["channels"][number]["type"],
        displayName: ch.displayName,
        logoUrl: undefined,
        feeLabel: undefined,
        enabled: ch.isEnabled ?? true,
      })),
    };
  }

  /** Req 5.1 — Aggregate reports: occupancy, revenue, aging, channel breakdown. */
  async getReports(tenantId: UUID, range: DateRange): Promise<ReportBundle> {
    return withTenantDb(tenantId, async (tdb) => {
      // Occupancy by property
      const occupancyRows = await tdb
        .select({
          property: property.name,
          total: sql<number>`(SELECT COUNT(*)::int FROM room WHERE room.property_id = ${property.id})`,
          occupied: sql<number>`(SELECT COUNT(*)::int FROM room WHERE room.property_id = ${property.id} AND room.status = 'terisi')`,
        })
        .from(property)
        .where(eq(property.tenantId, tenantId));

      const occupancyByProperty = occupancyRows.map((r) => ({
        property: r.property,
        occupancyPct: r.total > 0 ? Math.round((r.occupied / r.total) * 100) : 0,
      }));

      // Revenue by month within range
      const revenueByMonthRows = await tdb
        .select({
          month: sql<string>`to_char(${invoice.dueDate}::date, 'YYYY-MM')`,
          amount: sum(invoice.total),
        })
        .from(invoice)
        .where(
          and(
            eq(invoice.tenantId, tenantId),
            eq(invoice.status, "lunas"),
            gte(invoice.dueDate, range.start),
            lte(invoice.dueDate, range.end),
          ),
        )
        .groupBy(sql`to_char(${invoice.dueDate}::date, 'YYYY-MM')`)
        .orderBy(sql`to_char(${invoice.dueDate}::date, 'YYYY-MM')`);

      const revenueByMonth = revenueByMonthRows.map((r) => ({
        month: r.month,
        amount: Number(r.amount ?? 0),
      }));

      // Aging buckets: current, 1-30, 31-60, 60+
      const today = new Date().toISOString().slice(0, 10);
      const agingRows = await tdb
        .select({
          bucket: sql<string>`
            CASE
              WHEN ${invoice.dueDate} >= ${today} THEN 'Belum jatuh tempo'
              WHEN ${today}::date - ${invoice.dueDate}::date <= 30 THEN '1-30 hari'
              WHEN ${today}::date - ${invoice.dueDate}::date <= 60 THEN '31-60 hari'
              ELSE '60+ hari'
            END
          `,
          amount: sum(invoice.total),
        })
        .from(invoice)
        .where(
          and(
            eq(invoice.tenantId, tenantId),
            sql`${invoice.status} IN ('tertagih', 'jatuh_tempo')`,
          ),
        )
        .groupBy(sql`
          CASE
            WHEN ${invoice.dueDate} >= ${today} THEN 'Belum jatuh tempo'
            WHEN ${today}::date - ${invoice.dueDate}::date <= 30 THEN '1-30 hari'
            WHEN ${today}::date - ${invoice.dueDate}::date <= 60 THEN '31-60 hari'
            ELSE '60+ hari'
          END
        `);

      const agingBuckets = agingRows.map((r) => ({
        bucket: r.bucket,
        amount: Number(r.amount ?? 0),
      }));

      // Channel breakdown: revenue by payment channel
      const channelRows = await tdb
        .select({
          channel: payment.channelCode,
          amount: sum(payment.amountPaid),
        })
        .from(payment)
        .where(and(eq(payment.tenantId, tenantId), eq(payment.status, "settled")))
        .groupBy(payment.channelCode);

      const channelBreakdown = channelRows.map((r) => ({
        channel: r.channel,
        amount: Number(r.amount ?? 0),
      }));

      return {
        occupancyByProperty,
        revenueByMonth,
        agingBuckets,
        channelBreakdown,
      };
    });
  }

  /** Req 5.1 — Get tenant settings mapped to the TenantSettings view model. */
  async getTenantSettings(tenantId: UUID): Promise<TenantSettings> {
    return withTenantDb(tenantId, async (tdb) => {
      const [row] = await tdb
        .select()
        .from(tenantSaas)
        .where(eq(tenantSaas.id, tenantId));

      if (!row) {
        throw new Error(`Tenant tidak ditemukan: "${tenantId}"`);
      }

      const settings = (row.settings ?? {}) as Record<string, unknown>;

      return {
        id: row.id,
        name: row.name,
        subdomain: row.subdomain ?? row.slug,
        plan: row.plan as TenantSettings["plan"],
        status: mapTenantStatus(row.status),
        logoUrl: row.logoUrl ?? undefined,
        brandColor: (settings.brandColor as string) ?? "#4F46E5",
        timezone: "Asia/Jakarta" as const,
        locale: "id-ID" as const,
        waTemplates: (settings.waTemplates as TenantSettings["waTemplates"]) ?? {
          invoiceIssued: "",
          paymentSuccess: "",
          reminder: "",
        },
        trialEndsAt: row.trialEndsAt?.toISOString() ?? undefined,
      };
    });
  }

  /** Req 5.1 — List all tenants (super admin, no tenant_id filter). */
  async listTenants(): Promise<TenantSaasSummary[]> {
    const db = getDb();

    const rows = await db
      .select({
        id: tenantSaas.id,
        name: tenantSaas.name,
        plan: tenantSaas.plan,
        status: tenantSaas.status,
        createdAt: tenantSaas.createdAt,
        rooms: sql<number>`(
          SELECT COUNT(*)::int FROM room WHERE room.tenant_id = ${tenantSaas.id}
        )`,
      })
      .from(tenantSaas);

    // Get MRR per tenant from subscriptions
    const subs = await db
      .select({
        tenantId: subscription.tenantId,
        amountMonthly: subscription.amountMonthly,
      })
      .from(subscription)
      .where(eq(subscription.status, "active"));

    const mrrByTenant = new Map<string, number>();
    for (const s of subs) {
      mrrByTenant.set(s.tenantId, Number(s.amountMonthly));
    }

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      plan: r.plan as TenantSaasSummary["plan"],
      status: mapTenantStatus(r.status),
      rooms: r.rooms ?? 0,
      mrr: mrrByTenant.get(r.id) ?? 0,
      joinedAt: r.createdAt.toISOString(),
    }));
  }

  /** Req 5.1 — Aggregate platform metrics (super admin). */
  async getPlatformMetrics(): Promise<PlatformMetrics> {
    const db = getDb();

    // Active subscriptions MRR
    const [mrrRow] = await db
      .select({ value: sum(subscription.amountMonthly) })
      .from(subscription)
      .where(eq(subscription.status, "active"));

    // Tenant counts by status
    const [activeCount] = await db
      .select({ value: count() })
      .from(tenantSaas)
      .where(eq(tenantSaas.status, "aktif"));

    const [trialCount] = await db
      .select({ value: count() })
      .from(tenantSaas)
      .where(eq(tenantSaas.status, "trial"));

    const [cancelledCount] = await db
      .select({ value: count() })
      .from(tenantSaas)
      .where(eq(tenantSaas.status, "berhenti"));

    const [totalCount] = await db.select({ value: count() }).from(tenantSaas);

    // Failed webhooks (payments with status 'failed' in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [failedWh] = await db
      .select({ value: count() })
      .from(payment)
      .where(
        and(
          eq(payment.status, "failed"),
          gte(payment.createdAt, new Date(thirtyDaysAgo)),
        ),
      );

    // MRR trend: last 6 months from subscription data
    const sixMonthsAgo = new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1)
      .toISOString()
      .slice(0, 10);

    const mrrTrendRows = await db
      .select({
        month: sql<string>`to_char(${subscription.currentPeriodStart}::date, 'YYYY-MM')`,
        amount: sum(subscription.amountMonthly),
      })
      .from(subscription)
      .where(
        and(
          eq(subscription.status, "active"),
          gte(subscription.currentPeriodStart, sixMonthsAgo),
        ),
      )
      .groupBy(sql`to_char(${subscription.currentPeriodStart}::date, 'YYYY-MM')`)
      .orderBy(sql`to_char(${subscription.currentPeriodStart}::date, 'YYYY-MM')`);

    const total = totalCount?.value ?? 0;
    const churnPct =
      total > 0 ? Math.round(((cancelledCount?.value ?? 0) / total) * 100 * 10) / 10 : 0;

    return {
      mrr: Number(mrrRow?.value ?? 0),
      activeTenants: activeCount?.value ?? 0,
      trialTenants: trialCount?.value ?? 0,
      churnPct,
      failedWebhooks: failedWh?.value ?? 0,
      mrrTrend: mrrTrendRows.map((r) => ({
        month: r.month,
        amount: Number(r.amount ?? 0),
      })),
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map DB contract status to view-model status literals. */
function mapContractStatus(dbStatus: string): Contract["status"] {
  switch (dbStatus) {
    case "active":
      return "aktif";
    case "expired":
      return "berakhir";
    case "terminated":
      return "diputus";
    default:
      return "aktif";
  }
}

/** Map DB tenant status to view-model status literals. */
function mapTenantStatus(dbStatus: string): TenantSettings["status"] {
  switch (dbStatus) {
    case "trial":
      return "trial";
    case "active":
      return "aktif";
    case "suspended":
      return "ditangguhkan";
    case "cancelled":
      return "berhenti";
    // Already in view-model format
    case "aktif":
      return "aktif";
    case "ditangguhkan":
      return "ditangguhkan";
    case "berhenti":
      return "berhenti";
    default:
      return "trial";
  }
}
