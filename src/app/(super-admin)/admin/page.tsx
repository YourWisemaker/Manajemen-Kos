"use client";

import {
  AlertTriangle,
  Ban,
  Building2,
  DollarSign,
  LogIn,
  Megaphone,
  Play,
  Send,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { RupiahText, StatCard, StatusBadge } from "@/components/brand";
import { CardSkeleton, FadeIn, ListSkeleton } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { formatTanggal } from "@/lib/locale/datetime";
import { formatRupiah } from "@/lib/locale/rupiah";
import { dataSource, type PlatformMetrics, type TenantSaasSummary } from "@/lib/mock";

/**
 * Super Admin Console — Task 21
 * -----------------------------
 * Platform dashboard within AdminShell: StatCards for MRR, Active Tenants,
 * Trial Tenants, Churn %, Failed Webhooks. MRR trend chart. Tenant table
 * with suspend/unsuspend actions, broadcast composer, and impersonate stub.
 *
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5
 */

const CHART_COLOR = "hsl(165, 40%, 35%)";

export default function AdminPage() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [tenants, setTenants] = useState<TenantSaasSummary[] | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<TenantSaasSummary | null>(null);
  const [showBroadcast, setShowBroadcast] = useState(false);

  useEffect(() => {
    dataSource.getPlatformMetrics().then(setMetrics);
    dataSource.listTenants().then(setTenants);
  }, []);

  const isLoading = metrics === null || tenants === null;

  return (
    <section className="flex flex-col gap-6">
      <h1 className="font-display text-xl font-semibold text-foreground">
        Ringkasan Platform
      </h1>

      {/* KPI StatCards */}
      {isLoading ? (
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
              value={formatRupiah(metrics.mrr)}
              icon={DollarSign}
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
              icon={TrendingUp}
              accent="terracotta"
            />
            <StatCard
              label="Failed Webhooks"
              value={String(metrics.failedWebhooks)}
              icon={AlertTriangle}
              accent="terracotta"
            />
          </div>
        </FadeIn>
      )}

      {/* MRR Trend Chart */}
      {!isLoading && metrics && (
        <FadeIn>
          <Card>
            <CardHeader className="pb-2">
              <h2 className="text-sm font-semibold text-foreground">MRR Trend</h2>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={metrics.mrrTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(85, 10%, 90%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    tickFormatter={(v: number) => formatRupiah(v, { showSymbol: false })}
                  />
                  <RechartsTooltip
                    formatter={(value) => [formatRupiah(Number(value)), "MRR"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke={CHART_COLOR}
                    fill={CHART_COLOR}
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Broadcast Composer + Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline-ink"
          iconLeft={Megaphone}
          onClick={() => setShowBroadcast(true)}
        >
          Broadcast
        </Button>
      </div>

      {/* Tenant Table */}
      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : (
        <FadeIn>
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-foreground">Daftar Tenant</h2>
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
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenants.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell className="capitalize text-sm">{t.plan}</TableCell>
                        <TableCell>
                          <StatusBadge status={t.status} />
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{t.rooms}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <RupiahText amount={t.mrr} size="sm" />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {formatTanggal(t.joinedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {t.status === "ditangguhkan" ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                iconLeft={Play}
                                onClick={() => setSuspendTarget(t)}
                              >
                                <span className="hidden sm:inline">Aktifkan</span>
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                iconLeft={Ban}
                                onClick={() => setSuspendTarget(t)}
                              >
                                <span className="hidden sm:inline">Tangguhkan</span>
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" iconLeft={LogIn}>
                              <span className="hidden sm:inline">Impersonate</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Suspend/Unsuspend Confirmation Dialog */}
      <SuspendDialog
        tenant={suspendTarget}
        onOpenChange={(open) => {
          if (!open) setSuspendTarget(null);
        }}
      />

      {/* Broadcast Composer Dialog */}
      <BroadcastDialog open={showBroadcast} onOpenChange={setShowBroadcast} />
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Suspend/Unsuspend Dialog                                                     */
/* -------------------------------------------------------------------------- */

function SuspendDialog({
  tenant,
  onOpenChange,
}: {
  tenant: TenantSaasSummary | null;
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
            onClick={() => onOpenChange(false)}
          >
            {isSuspended ? "Aktifkan" : "Tangguhkan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Broadcast Composer Dialog                                                     */
/* -------------------------------------------------------------------------- */

function BroadcastDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [message, setMessage] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Broadcast ke Semua Tenant</DialogTitle>
          <DialogDescription>
            Kirim pesan broadcast ke semua tenant aktif. Fitur ini akan terhubung ke
            backend di fase berikutnya.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Tulis pesan broadcast…"
            className="w-full rounded-input border border-line bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button iconLeft={Send} onClick={() => onOpenChange(false)}>
              Kirim Broadcast
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
