"use client";

import { Download, FileSpreadsheet } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/brand";
import { CardSkeleton, FadeIn } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { chartSeries, chartTheme, chartTooltipStyle } from "@/lib/charts/theme";
import type { ReportBundle } from "@/lib/data";
import copy from "@/lib/locale/copy/id";
import { formatRupiah } from "@/lib/locale/rupiah";
import { getReports } from "./actions";

/**
 * Reports & Analytics Page — Task 19
 * -----------------------------------
 * Date-range picker (Asia/Jakarta), charts for occupancy per property,
 * revenue per month, AR aging buckets, and payment channel breakdown.
 * All monetary values formatted via formatRupiah. Charts use the shared
 * brand-palette chart theme (OKLCH design tokens), not default chart colors.
 * Excel and PDF export buttons as visual stubs.
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
 */

/** Categorical palette for the channel pie, drawn from the brand chart theme. */
const PIE_COLORS = chartSeries;

export default function LaporanPage() {
  const [reports, setReports] = useState<ReportBundle | null>(null);
  const [startDate, setStartDate] = useState("2024-09-01");
  const [endDate, setEndDate] = useState("2025-02-28");

  useEffect(() => {
    getReports({ start: startDate, end: endDate }).then(setReports);
  }, [startDate, endDate]);

  const isLoading = reports === null;

  const isEmpty =
    reports &&
    reports.occupancyByProperty.length === 0 &&
    reports.revenueByMonth.length === 0;

  return (
    <section className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-xl font-semibold text-foreground">
          Laporan & Analitik
        </h1>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button variant="outline-ink" iconLeft={FileSpreadsheet} disabled>
                    Export Excel
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Fitur export akan tersedia di fase berikutnya
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button variant="outline-ink" iconLeft={Download} disabled>
                    Export PDF
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Fitur export akan tersedia di fase berikutnya
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Date Range Picker */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
          <label
            htmlFor="laporan-mulai"
            className="text-sm font-medium text-muted-foreground"
          >
            Periode:
          </label>
          <div className="flex items-center gap-2">
            <Input
              id="laporan-mulai"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-auto"
              aria-label="Tanggal mulai"
            />
            <span className="text-sm text-muted-foreground">–</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-auto"
              aria-label="Tanggal akhir"
            />
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && isEmpty && (
        <EmptyState
          illustration="laporan"
          title={copy.kosong.laporan.judul}
          description={copy.kosong.laporan.deskripsi}
        />
      )}

      {/* Charts */}
      {!isLoading && !isEmpty && reports && (
        <FadeIn>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Occupancy per Property */}
            <Card>
              <CardHeader className="pb-2">
                <h2 className="text-sm font-semibold text-foreground">
                  Okupansi per Properti
                </h2>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={reports.occupancyByProperty}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                    <XAxis dataKey="property" tick={{ fontSize: 12 }} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      unit="%"
                      domain={[0, 100]}
                    />
                    <RechartsTooltip
                      formatter={(value) => [`${Number(value)}%`, "Okupansi"]}
                      contentStyle={chartTooltipStyle}
                      labelStyle={{ color: chartTheme.ink }}
                    />
                    <Bar
                      dataKey="occupancyPct"
                      fill={chartTheme.pandan}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue per Month */}
            <Card>
              <CardHeader className="pb-2">
                <h2 className="text-sm font-semibold text-foreground">
                  Pendapatan per Bulan
                </h2>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={reports.revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      tickFormatter={(v: number) =>
                        formatRupiah(v, { showSymbol: false })
                      }
                    />
                    <RechartsTooltip
                      formatter={(value) => [formatRupiah(Number(value)), "Pendapatan"]}
                      contentStyle={chartTooltipStyle}
                      labelStyle={{ color: chartTheme.ink }}
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke={chartTheme.pandan}
                      strokeWidth={2}
                      dot={{ fill: chartTheme.pandan, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* AR Aging Buckets */}
            <Card>
              <CardHeader className="pb-2">
                <h2 className="text-sm font-semibold text-foreground">
                  Aging Piutang (AR)
                </h2>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={reports.agingBuckets}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                    <XAxis dataKey="bucket" tick={{ fontSize: 11 }} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      tickFormatter={(v: number) =>
                        formatRupiah(v, { showSymbol: false })
                      }
                    />
                    <RechartsTooltip
                      formatter={(value) => [formatRupiah(Number(value)), "Jumlah"]}
                      contentStyle={chartTooltipStyle}
                      labelStyle={{ color: chartTheme.ink }}
                    />
                    <Bar
                      dataKey="amount"
                      fill={chartTheme.terracotta}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Payment Channel Breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <h2 className="text-sm font-semibold text-foreground">
                  Breakdown Channel Pembayaran
                </h2>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={reports.channelBreakdown}
                      dataKey="amount"
                      nameKey="channel"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={(props: { name?: string; percent?: number }) =>
                        `${props.name ?? ""} (${((props.percent ?? 0) * 100).toFixed(0)}%)`
                      }
                      labelLine={false}
                    >
                      {reports.channelBreakdown.map((entry, index) => (
                        <Cell
                          key={`cell-${entry.channel}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value) => [formatRupiah(Number(value)), "Jumlah"]}
                      contentStyle={chartTooltipStyle}
                      labelStyle={{ color: chartTheme.ink }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </FadeIn>
      )}
    </section>
  );
}
