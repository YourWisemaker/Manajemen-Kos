"use client";

import {
  AlertTriangle,
  Ban,
  Building2,
  CheckCircle2,
  LogIn,
  Megaphone,
  Play,
  Send,
  TrendingDown,
  Users,
  Wallet,
} from "lucide-react";
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
import { RupiahText, StatCard, StatusBadge } from "@/components/brand";
import { CardSkeleton, FadeIn, ListSkeleton } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { chartTheme, chartTooltipStyle } from "@/lib/charts/theme";
import type { PlatformMetrics, TenantSaasSummary } from "@/lib/data";
import { formatTanggal } from "@/lib/locale/datetime";
import { formatRupiah } from "@/lib/locale/rupiah";
import { getPlatformMetrics, listTenants } from "./actions";

/**
 * Super Admin Console — Task 21 (Requirements 16.1–16.5)
 * ------------------------------------------------------
 * The platform-operator surface at `admin.koskita.id`. It renders inside the
 * `AdminShell` (wired by `(super-admin)/layout.tsx`), whose cool slate chrome
 * gives the console a visually distinct "internal tooling" identity so staff
 * never confuse it with a tenant workspace (Req 16.1).
 *
 * 21.1 — Platform dashboard + tenant table:
 *  - Platform `StatCard`s for MRR, active tenants, trial tenants, churn %, and
 *    failed webhooks, plus an MRR trend area chart themed via the brand
 *    `chartTheme` (never default chart-library colors) — Req 16.2.
 *  - A tenant table (name, plan, status, rooms, MRR, joined date) read from the
 *    mock `dataSource.listTenants()` — Req 16.3.
 *
 * 21.2 — Tenant actions + broadcast composer:
 *  - Per-row suspend/unsuspend that opens a confirmation `Dialog`; confirming
 *    reflects the change in local state (the row `StatusBadge` updates) — a
 *    purely visual action with no real persistence (Req 16.4).
 *  - A broadcast composer (textarea + send) and a per-row impersonate action,
 *    both presented as visual stubs that surface a confirmation notice (Req 16.5).
 *
 * Loading shows skeletons matching the eventual layout; resolved content fades
 * in without layout shift (Req 21.1, 21.2). Money renders through `RupiahText`
 * / `formatRupiah`, dates through `formatTanggal` (Asia/Jakarta). This is a
 * client component: it loads data in `useEffect`, owns dialog/local state, and
 * Recharts requires the browser.
 */

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

/** Convert an ISO month key ("2025-02") to a short label ("Feb '25"). */
function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const monthIndex = Number.parseInt(month, 10) - 1;
  return `${INDONESIAN_MONTHS[monthIndex] ?? month} '${year.slice(2)}`;
}

/** Abbreviate a Rupiah amount for the chart Y-axis (e.g. 2_997_000 -> "3jt"). */
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

export default function AdminPage() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [tenants, setTenants] = useState<TenantSaasSummary[] | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<TenantSaasSummary | null>(null);
  const [impersonateTarget, setImpersonateTarget] = useState<TenantSaasSummary | null>(
    null,
  );
  const [showBroadcast, setShowBroadcast] = useState(false);
  // Transient confirmation for the last visual action (suspend, impersonate, broadcast).
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getPlatformMetrics(), listTenants()]).then(
      ([metricsData, tenantData]) => {
        if (!active) return;
        setMetrics(metricsData);
        setTenants(tenantData.tenants);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const isLoading = metrics === null || tenants === null;

  /**
   * Toggle the target tenant's status in local state (Req 16.4). Suspending a
   * live tenant moves it to `ditangguhkan`; unsuspending restores it to
   * `aktif`. This is a visual-only change — no persistence.
   */
  function handleSuspendConfirm(target: TenantSaasSummary) {
    const reactivating = target.status === "ditangguhkan";
    setTenants((current) =>
      current
        ? current.map((t) =>
            t.id === target.id
              ? { ...t, status: reactivating ? "aktif" : "ditangguhkan" }
              : t,
          )
        : current,
    );
    setNotice(
      reactivating
        ? `Tenant ${target.name} diaktifkan kembali.`
        : `Tenant ${target.name} ditangguhkan.`,
    );
    setSuspendTarget(null);
  }

  /** Visual-only impersonation stub (Req 16.5). */
  function handleImpersonateConfirm(target: TenantSaasSummary) {
    setNotice(`Mode impersonate untuk ${target.name} (stub — belum aktif).`);
    setImpersonateTarget(null);
  }

  /** Visual-only broadcast stub (Req 16.5). */
  function handleBroadcastSent(recipientCount: number) {
    setNotice(`Broadcast terkirim ke ${recipientCount} tenant (stub).`);
  }

  const activeTenantCount = useMemo(
    () => tenants?.filter((t) => t.status === "aktif").length ?? 0,
    [tenants],
  );

  return (
    <section className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="font-display text-xl font-semibold text-foreground">
          Ringkasan Platform
        </h1>
        <p className="text-sm text-muted-foreground">
          Pantau metrik platform dan kelola tenant KosKita.
        </p>
      </div>

      {/* Last-action confirmation notice (Req 16.4, 16.5). */}
      {notice ? (
        <FadeIn>
          <SuccessNotice message={notice} onDismiss={() => setNotice(null)} />
        </FadeIn>
      ) : null}

      {/* Platform KPI StatCards (Req 16.2). */}
      {isLoading || metrics === null ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <FadeIn>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              label="MRR"
              value={<RupiahText amount={metrics.mrr} size="lg" />}
              icon={Wallet}
              accent="pandan"
            />
            <StatCard
              label="Tenant Aktif"
              value={String(metrics.activeTenants)}
              icon={Building2}
              accent="pandan"
            />
            <StatCard
              label="Tenant Trial"
              value={String(metrics.trialTenants)}
              icon={Users}
              accent="kunyit"
            />
            <StatCard
              label="Churn"
              value={`${metrics.churnPct}%`}
              icon={TrendingDown}
              accent="terracotta"
            />
            <StatCard
              label="Webhook Gagal"
              value={String(metrics.failedWebhooks)}
              icon={AlertTriangle}
              accent="terracotta"
            />
          </div>
        </FadeIn>
      )}

      {/* MRR trend chart, themed with the brand palette (Req 16.2). */}
      {isLoading || metrics === null ? (
        <CardSkeleton className="h-72" />
      ) : (
        <FadeIn>
          <MrrTrendChart trend={metrics.mrrTrend} />
        </FadeIn>
      )}

      {/* Broadcast composer trigger (Req 16.5). */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline-ink"
          iconLeft={Megaphone}
          onClick={() => setShowBroadcast(true)}
        >
          Broadcast ke Tenant
        </Button>
      </div>

      {/* Tenant table (Req 16.3). */}
      {isLoading || tenants === null ? (
        <ListSkeleton rows={5} />
      ) : (
        <FadeIn>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daftar Tenant</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Paket</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Kamar</TableHead>
                      <TableHead className="hidden md:table-cell">MRR</TableHead>
                      <TableHead className="hidden lg:table-cell">Bergabung</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenants.map((tenant) => {
                      const isSuspended = tenant.status === "ditangguhkan";
                      return (
                        <TableRow key={tenant.id}>
                          <TableCell className="font-medium">{tenant.name}</TableCell>
                          <TableCell className="text-sm capitalize">
                            {tenant.plan}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={tenant.status} />
                          </TableCell>
                          <TableCell className="hidden sm:table-cell tabular-nums">
                            {tenant.rooms}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <RupiahText amount={tenant.mrr} size="sm" />
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm">
                            {formatTanggal(tenant.joinedAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              {isSuspended ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  iconLeft={Play}
                                  onClick={() => setSuspendTarget(tenant)}
                                >
                                  <span className="hidden sm:inline">Aktifkan</span>
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  iconLeft={Ban}
                                  onClick={() => setSuspendTarget(tenant)}
                                >
                                  <span className="hidden sm:inline">Tangguhkan</span>
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                iconLeft={LogIn}
                                onClick={() => setImpersonateTarget(tenant)}
                              >
                                <span className="hidden sm:inline">Impersonate</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Suspend/unsuspend confirmation dialog (Req 16.4). */}
      <SuspendDialog
        tenant={suspendTarget}
        onConfirm={handleSuspendConfirm}
        onOpenChange={(open) => {
          if (!open) setSuspendTarget(null);
        }}
      />

      {/* Impersonate confirmation dialog — visual stub (Req 16.5). */}
      <ImpersonateDialog
        tenant={impersonateTarget}
        onConfirm={handleImpersonateConfirm}
        onOpenChange={(open) => {
          if (!open) setImpersonateTarget(null);
        }}
      />

      {/* Broadcast composer dialog — visual stub (Req 16.5). */}
      <BroadcastDialog
        open={showBroadcast}
        recipientCount={activeTenantCount}
        onSent={handleBroadcastSent}
        onOpenChange={setShowBroadcast}
      />
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* MRR trend chart                                                            */
/* -------------------------------------------------------------------------- */

/** MRR trend area chart themed with the brand palette (Req 16.2). */
function MrrTrendChart({ trend }: { trend: PlatformMetrics["mrrTrend"] }) {
  const data = trend.map((point) => ({
    month: formatMonthLabel(point.month),
    amount: point.amount,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tren MRR</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="mrrPandan" x1="0" y1="0" x2="0" y2="1">
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
                formatter={(value) => [formatRupiah(Number(value)), "MRR"]}
                labelStyle={{ color: chartTheme.ink }}
                contentStyle={chartTooltipStyle}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke={chartTheme.pandan}
                strokeWidth={2}
                fill="url(#mrrPandan)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Belum ada data MRR.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Suspend / unsuspend confirmation dialog                                    */
/* -------------------------------------------------------------------------- */

function SuspendDialog({
  tenant,
  onConfirm,
  onOpenChange,
}: {
  tenant: TenantSaasSummary | null;
  onConfirm: (tenant: TenantSaasSummary) => void;
  onOpenChange: (open: boolean) => void;
}) {
  if (!tenant) return null;

  const isSuspended = tenant.status === "ditangguhkan";
  const action = isSuspended ? "mengaktifkan kembali" : "menangguhkan";

  return (
    <Dialog open={tenant !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isSuspended ? "Aktifkan Tenant" : "Tangguhkan Tenant"}
          </DialogTitle>
          <DialogDescription>
            Apakah Anda yakin ingin {action} tenant <strong>{tenant.name}</strong>?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            variant={isSuspended ? "primary" : "danger"}
            onClick={() => onConfirm(tenant)}
          >
            {isSuspended ? "Aktifkan" : "Tangguhkan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Impersonate confirmation dialog (visual stub)                              */
/* -------------------------------------------------------------------------- */

function ImpersonateDialog({
  tenant,
  onConfirm,
  onOpenChange,
}: {
  tenant: TenantSaasSummary | null;
  onConfirm: (tenant: TenantSaasSummary) => void;
  onOpenChange: (open: boolean) => void;
}) {
  if (!tenant) return null;

  return (
    <Dialog open={tenant !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Impersonate Tenant</DialogTitle>
          <DialogDescription>
            Masuk ke workspace <strong>{tenant.name}</strong> sebagai operator internal.
            Fitur ini akan terhubung ke backend di fase berikutnya.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button iconLeft={LogIn} onClick={() => onConfirm(tenant)}>
            Masuk sebagai Tenant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Broadcast composer dialog (visual stub)                                    */
/* -------------------------------------------------------------------------- */

function BroadcastDialog({
  open,
  recipientCount,
  onSent,
  onOpenChange,
}: {
  open: boolean;
  recipientCount: number;
  onSent: (recipientCount: number) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function handleClose() {
    setMessage("");
    setSent(false);
    onOpenChange(false);
  }

  function handleSend() {
    setSent(true);
    onSent(recipientCount);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Broadcast ke Semua Tenant</DialogTitle>
          <DialogDescription>
            Kirim pesan ke {recipientCount} tenant aktif. Fitur ini akan terhubung ke
            backend di fase berikutnya.
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col gap-4">
            <SuccessNotice
              message={`Broadcast terkirim ke ${recipientCount} tenant (stub).`}
            />
            <DialogFooter>
              <Button onClick={handleClose}>Selesai</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Tulis pesan broadcast…"
              className="w-full resize-none rounded-input border border-line bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <DialogFooter>
              <Button variant="ghost" onClick={handleClose}>
                Batal
              </Button>
              <Button
                iconLeft={Send}
                disabled={message.trim() === ""}
                onClick={handleSend}
              >
                Kirim Broadcast
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Inline success notice                                                      */
/* -------------------------------------------------------------------------- */

function SuccessNotice({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss?: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-input border border-success/20 bg-success/10 px-4 py-3"
      role="status"
      aria-live="polite"
    >
      <CheckCircle2 className="lucide size-5 shrink-0 text-success" aria-hidden="true" />
      <p className="flex-1 text-sm font-medium text-foreground">{message}</p>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Tutup
        </button>
      ) : null}
    </div>
  );
}
