"use client";

import { ArrowRight, Building2, DoorOpen, TriangleAlert, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  computeOccupancyPct,
  EmptyState,
  OccupancyMeter,
  RupiahText,
  StatCard,
} from "@/components/brand";
import { CardSkeleton, FadeIn, ListSkeleton } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { chartTheme, chartTooltipStyle } from "@/lib/charts/theme";
import {
  type DashboardSummary,
  dataSource,
  type Invoice,
  PRIMARY_TENANT_ID,
  type Property,
} from "@/lib/data";
import copy from "@/lib/locale/copy/id";
import { formatTanggalWaktu, relativeJatuhTempo } from "@/lib/locale/datetime";
import { formatRupiah } from "@/lib/locale/rupiah";
import { useTenant } from "@/lib/tenant";

/**
 * Dashboard content — Task 12 (Requirements 8.1–8.6, 21.1, 21.2, 21.3)
 * --------------------------------------------------------------------
 * The client-only body of the multi-property dashboard. The page shell keeps
 * the conditional trial-banner slot; this component owns the KPIs, charts, and
 * lists. It reads exclusively from the mock `dataSource`:
 *  - KPI row: Okupansi (with an `OccupancyMeter`), Pendapatan Bulan Ini and
 *    Tunggakan (via `RupiahText`), and Properti.
 *  - Revenue trend area chart, recent payments list, overdue invoices list
 *    (the overdue list links through to `/tagihan`).
 *  - When the tenant manages more than one property, a "Semua properti"
 *    aggregate plus a per-property toggle that filters the KPIs and the
 *    overdue list (client-side aggregation over the mock data).
 *  - A branded empty state when the tenant has no properties.
 *
 * Charts use the brand palette via `@/lib/charts/theme` (no default chart-lib
 * colors). Loading shows skeletons; resolved content fades in without shift.
 *
 * This is a client component: it depends on the client `useTenant` hook, loads
 * data in `useEffect`, and Recharts requires the browser.
 */

/** The aggregate selection sentinel for the property selector. */
const ALL_PROPERTIES = "semua";

const INDONESIAN_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

/** Sum the `total` field across a list of invoices. */
function sumTotals(invoices: Invoice[]): number {
  return invoices.reduce((sum, inv) => sum + inv.total, 0);
}

/** Abbreviate a Rupiah amount for the chart Y-axis (e.g. 1_250_000 -> "1,2jt"). */
function formatRupiahAbbrev(value: number): string {
  if (value >= 1_000_000) {
    const jt = value / 1_000_000;
    return `${jt % 1 === 0 ? jt : jt.toFixed(1).replace(".", ",")}jt`;
  }
  if (value >= 1_000) {
    const rb = value / 1_000;
    return `${rb % 1 === 0 ? rb : rb.toFixed(1).replace(".", ",")}rb`;
  }
  return String(value);
}

/** Convert an ISO month key ("2024-09") to a short label ("Sep '24"). */
function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const monthIndex = Number.parseInt(month, 10) - 1;
  return `${INDONESIAN_MONTHS[monthIndex] ?? month} '${year.slice(2)}`;
}

/** The KPI/list view model for the currently selected scope. */
interface ScopedView {
  totalRooms: number;
  occupiedRooms: number;
  propertyCount: number;
  monthlyRevenue: number;
  outstanding: number;
  overdue: Invoice[];
}

/**
 * Derive the scoped KPI view for the active selection.
 *
 * The "Semua properti" view uses the canonical aggregate from
 * `getDashboardSummary`. A specific property is aggregated client-side from
 * that property's primitives: occupancy from the `Property` counts, outstanding
 * from its `jatuh_tempo` invoices, and realized revenue from its `lunas`
 * invoices (Requirement 8.4).
 */
function deriveScopedView(
  selected: string,
  summary: DashboardSummary,
  properties: Property[],
  invoicesByProperty: Record<string, Invoice[]>,
): ScopedView {
  const allInvoices = Object.values(invoicesByProperty).flat();

  if (selected === ALL_PROPERTIES) {
    return {
      totalRooms: summary.totalRooms,
      occupiedRooms: summary.occupiedRooms,
      propertyCount: summary.properties,
      monthlyRevenue: summary.monthlyRevenue,
      outstanding: summary.outstanding,
      overdue: allInvoices.filter((inv) => inv.status === "jatuh_tempo"),
    };
  }

  const property = properties.find((p) => p.id === selected);
  const invoices = invoicesByProperty[selected] ?? [];
  const overdue = invoices.filter((inv) => inv.status === "jatuh_tempo");

  return {
    totalRooms: property?.totalRooms ?? 0,
    occupiedRooms: property?.occupiedRooms ?? 0,
    propertyCount: 1,
    monthlyRevenue: sumTotals(invoices.filter((inv) => inv.status === "lunas")),
    outstanding: sumTotals(overdue),
    overdue,
  };
}

export function DashboardContent() {
  const { tenant } = useTenant();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [properties, setProperties] = useState<Property[] | null>(null);
  const [invoicesByProperty, setInvoicesByProperty] = useState<Record<
    string,
    Invoice[]
  > | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<string>(ALL_PROPERTIES);

  useEffect(() => {
    const tenantId = tenant.id || PRIMARY_TENANT_ID;
    let active = true;

    // Reset the scope whenever the active tenant changes.
    setSelectedProperty(ALL_PROPERTIES);

    async function load() {
      const [summaryData, propertyData] = await Promise.all([
        dataSource.getDashboardSummary(tenantId),
        dataSource.listProperties(tenantId),
      ]);

      // Fetch invoices per property so KPIs/lists can be scoped client-side.
      const invoiceEntries = await Promise.all(
        propertyData.map(
          async (property) =>
            [
              property.id,
              await dataSource.listInvoices(tenantId, { propertyId: property.id }),
            ] as const,
        ),
      );

      if (!active) return;
      setSummary(summaryData);
      setProperties(propertyData);
      setInvoicesByProperty(Object.fromEntries(invoiceEntries));
    }

    load();
    return () => {
      active = false;
    };
  }, [tenant.id]);

  const isLoading =
    summary === null || properties === null || invoicesByProperty === null;

  const scoped = useMemo<ScopedView | null>(() => {
    if (summary === null || properties === null || invoicesByProperty === null) {
      return null;
    }
    return deriveScopedView(selectedProperty, summary, properties, invoicesByProperty);
  }, [selectedProperty, summary, properties, invoicesByProperty]);

  // Empty state: tenant manages no properties yet (Requirements 8.5, 21.3).
  if (!isLoading && properties.length === 0) {
    return (
      <FadeIn>
        <Card>
          <EmptyState
            illustration="umum"
            title="Belum ada properti"
            description="Tambahkan properti pertama Anda untuk mulai memantau okupansi, pendapatan, dan tagihan di dasbor."
            action={{ label: "Tambah Properti Pertama", href: "/properti" }}
          />
        </Card>
      </FadeIn>
    );
  }

  const hasMultipleProperties = !isLoading && properties.length > 1;
  const occupancyPct = scoped
    ? computeOccupancyPct(scoped.occupiedRooms, scoped.totalRooms)
    : 0;
  // Recent payments + revenue trend come from the aggregate summary, which has
  // no per-property dimension; both are labelled as covering all properties.
  const aggregateLabel = hasMultipleProperties ? "Seluruh properti" : undefined;

  return (
    <>
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold">Dasbor</h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan okupansi, pendapatan, dan tagihan {tenant.name}.
        </p>
      </div>

      {/* Per-property selector — aggregate + per-property toggle (Req 8.4). */}
      {hasMultipleProperties ? (
        <FadeIn>
          <Tabs value={selectedProperty} onValueChange={setSelectedProperty}>
            <TabsList className="flex-wrap">
              <TabsTrigger value={ALL_PROPERTIES}>Semua properti</TabsTrigger>
              {properties.map((property) => (
                <TabsTrigger key={property.id} value={property.id}>
                  {property.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </FadeIn>
      ) : null}

      {/* KPI row (Requirements 8.1, 8.2). */}
      {isLoading || scoped === null ? (
        <KpiSkeleton />
      ) : (
        <FadeIn>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Okupansi"
              value={`${occupancyPct}%`}
              icon={DoorOpen}
              accent="pandan"
            >
              <OccupancyMeter
                occupied={scoped.occupiedRooms}
                total={scoped.totalRooms}
                className="mt-2"
              />
            </StatCard>

            <StatCard
              label="Pendapatan Bulan Ini"
              value={<RupiahText amount={scoped.monthlyRevenue} size="lg" />}
              icon={Wallet}
              accent="pandan"
            />

            <StatCard
              label="Tunggakan"
              value={
                <RupiahText
                  amount={scoped.outstanding}
                  size="lg"
                  tone={scoped.outstanding > 0 ? "danger" : "default"}
                />
              }
              icon={TriangleAlert}
              accent={scoped.outstanding > 0 ? "terracotta" : undefined}
            />

            <StatCard
              label="Properti"
              value={String(scoped.propertyCount)}
              icon={Building2}
              accent="kunyit"
            />
          </div>
        </FadeIn>
      )}

      {/* Revenue trend chart + recent payments (Requirements 8.3, 8.6). */}
      {isLoading || summary === null ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <CardSkeleton className="h-72" />
          <ListSkeleton rows={3} />
        </div>
      ) : (
        <FadeIn>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <RevenueTrendCard trend={summary.revenueTrend} sublabel={aggregateLabel} />
            <RecentPaymentsCard
              payments={summary.recentPayments}
              sublabel={aggregateLabel}
            />
          </div>
        </FadeIn>
      )}

      {/* Overdue invoices list (Requirement 8.3). */}
      {isLoading || scoped === null ? (
        <ListSkeleton rows={3} />
      ) : (
        <FadeIn>
          <OverdueInvoicesCard invoices={scoped.overdue} />
        </FadeIn>
      )}
    </>
  );
}

/** Skeleton matching the four-card KPI row layout (Requirement 21.1). */
function KpiSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}

/** A small muted caption shown under a card title (e.g. scope hint). */
function CardSublabel({ children }: { children?: string }) {
  if (!children) return null;
  return <span className="text-xs font-normal text-muted-foreground">{children}</span>;
}

/** Revenue trend area chart, themed with the brand palette (Req 8.6). */
function RevenueTrendCard({
  trend,
  sublabel,
}: {
  trend: DashboardSummary["revenueTrend"];
  sublabel?: string;
}) {
  const data = trend.map((point) => ({
    month: formatMonthLabel(point.month),
    amount: point.amount,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-baseline justify-between gap-2 text-base">
          Tren Pendapatan
          <CardSublabel>{sublabel}</CardSublabel>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenuePandan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartTheme.pandan} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartTheme.pandan} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={chartTheme.grid}
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: chartTheme.axis }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatRupiahAbbrev}
                tick={{ fontSize: 12, fill: chartTheme.axis }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip
                formatter={(value) => [formatRupiah(Number(value)), "Pendapatan"]}
                labelStyle={{ color: chartTheme.ink }}
                contentStyle={chartTooltipStyle}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke={chartTheme.pandan}
                strokeWidth={2}
                fill="url(#revenuePandan)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {copy.umum.tidakAdaData}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** Recent payments list (residentName, amount, paidAt). */
function RecentPaymentsCard({
  payments,
  sublabel,
}: {
  payments: DashboardSummary["recentPayments"];
  sublabel?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-baseline justify-between gap-2 text-base">
          Pembayaran Terbaru
          <CardSublabel>{sublabel}</CardSublabel>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length > 0 ? (
          <div className="divide-y divide-line">
            {payments.map((payment) => (
              <div
                key={`${payment.residentName}-${payment.paidAt}`}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">
                    {payment.residentName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTanggalWaktu(payment.paidAt)}
                  </span>
                </div>
                <RupiahText amount={payment.amount} size="sm" tone="success" />
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {copy.umum.tidakAdaData}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** Overdue (jatuh tempo) invoices list with relative due-date urgency. */
function OverdueInvoicesCard({ invoices }: { invoices: Invoice[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-baseline justify-between gap-2 text-base">
          Tagihan Jatuh Tempo
          <Link
            href="/tagihan"
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-pandan-600 hover:underline"
          >
            Lihat semua tagihan
            <ArrowRight className="lucide size-3" aria-hidden="true" />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {invoices.length > 0 ? (
          <div className="divide-y divide-line">
            {invoices.map((invoice) => (
              <Link
                key={invoice.id}
                href="/tagihan"
                className="-mx-2 flex flex-col gap-1 rounded-card px-2 py-3 transition-colors first:pt-0 last:pb-0 hover:bg-secondary/60 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">
                    {invoice.invoiceNumber}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {invoice.residentName} — Kamar {invoice.roomNumber}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <RupiahText amount={invoice.total} size="sm" tone="danger" />
                  <span className="text-xs text-danger">
                    {relativeJatuhTempo(invoice.dueDate)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Tidak ada tagihan yang jatuh tempo.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
