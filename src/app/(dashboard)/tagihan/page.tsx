"use client";

import { CheckCircle2, Circle, ExternalLink, Layers, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { EmptyState, RupiahText, StatusBadge } from "@/components/brand";
import { FadeIn, ListSkeleton } from "@/components/shared";
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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import copy from "@/lib/locale/copy/id";
import { formatTanggal, relativeJatuhTempo } from "@/lib/locale/datetime";
import { dataSource, type Invoice, PRIMARY_TENANT_ID, type Property } from "@/lib/mock";
import { useTenant } from "@/lib/tenant";
import {
  ALL_FILTER,
  buildInvoiceFilter,
  buildPeriodOptions,
  getTimelineIndex,
  monthLabel,
  type StatusFilter,
  simulateBulkInvoiceCount,
  TIMELINE_STEPS,
} from "./billing-helpers";

/**
 * Billing / Invoices Page — Task 17
 * ---------------------------------
 * 17.1 — Invoice list (table) with filters for status, period, and property
 * (wired into `dataSource.listInvoices`'s `InvoiceFilter`), totals via
 * `RupiahText`, due-date urgency via `relativeJatuhTempo`, and status badges
 * mapped to draft/tertagih/lunas/jatuh_tempo/batal.
 *
 * 17.2 — Invoice detail dialog with line items, a status timeline, and a
 * "Lihat Halaman Pembayaran" link to `/pay/[token]`; plus mocked "Buat
 * Tagihan" and "Buat Tagihan Massal" generation interfaces.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: ALL_FILTER, label: "Semua" },
  { value: "draft", label: "Draf" },
  { value: "tertagih", label: "Tertagih" },
  { value: "lunas", label: "Lunas" },
  { value: "jatuh_tempo", label: "Jatuh Tempo" },
  { value: "batal", label: "Batal" },
];

export default function TagihanPage() {
  const { tenant } = useTenant();

  // All invoices (unfiltered) — used to derive the period options.
  const [allInvoices, setAllInvoices] = useState<Invoice[] | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);

  // Filter state.
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ALL_FILTER);
  const [propertyFilter, setPropertyFilter] = useState<string>(ALL_FILTER);
  const [periodFilter, setPeriodFilter] = useState<string>(ALL_FILTER);

  // The filtered result set fetched through the DataSource seam.
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);

  // Dialog state.
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);

  const tenantId = tenant.id || PRIMARY_TENANT_ID;

  // Load the full invoice set + properties once (for filter option lists).
  useEffect(() => {
    dataSource.listInvoices(tenantId).then(setAllInvoices);
    dataSource.listProperties(tenantId).then(setProperties);
  }, [tenantId]);

  // Re-fetch the filtered set whenever a filter changes (wired into the
  // DataSource's InvoiceFilter — Req 12.1).
  useEffect(() => {
    const filter = buildInvoiceFilter(statusFilter, propertyFilter, periodFilter);
    dataSource.listInvoices(tenantId, filter).then(setInvoices);
  }, [tenantId, statusFilter, propertyFilter, periodFilter]);

  const periodOptions = useMemo(
    () => buildPeriodOptions(allInvoices ?? []),
    [allInvoices],
  );

  // Initial load (no invoices fetched yet at all).
  const isLoading = invoices === null || allInvoices === null;

  // Whole-tenant empty state: the tenant has no invoices at all.
  const hasNoInvoices = allInvoices !== null && allInvoices.length === 0;

  if (hasNoInvoices) {
    return (
      <section className="flex flex-col gap-6">
        <PageHeader
          onCreate={() => setShowCreateDialog(true)}
          onBulk={() => setShowBulkDialog(true)}
        />
        <EmptyState
          illustration="tagihan"
          title={copy.kosong.tagihan.judul}
          description={copy.kosong.tagihan.deskripsi}
          action={{ label: "Buat Tagihan", onClick: () => setShowCreateDialog(true) }}
        />
        <CreateInvoiceDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
        <BulkGenerateDialog
          open={showBulkDialog}
          onOpenChange={setShowBulkDialog}
          properties={properties}
          periodOptions={periodOptions}
        />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        onCreate={() => setShowCreateDialog(true)}
        onBulk={() => setShowBulkDialog(true)}
      />

      {/* Status tabs (Req 12.1, 12.3) */}
      <div className="overflow-x-auto">
        <Tabs
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <TabsList>
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Property + period filters (Req 12.1) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <FilterSelect
          label="Properti"
          value={propertyFilter}
          onChange={setPropertyFilter}
          allLabel="Semua Properti"
          options={properties.map((p) => ({ value: p.id, label: p.name }))}
        />
        <FilterSelect
          label="Periode"
          value={periodFilter}
          onChange={setPeriodFilter}
          allLabel="Semua Periode"
          options={periodOptions}
        />
      </div>

      {isLoading ? (
        <ListSkeleton rows={6} />
      ) : (
        <FadeIn>
          <Card>
            <CardHeader className="pb-0" />
            <CardContent className="p-0">
              {invoices.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                  {copy.umum.tidakAdaData}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No. Invoice</TableHead>
                        <TableHead>Penghuni</TableHead>
                        <TableHead className="hidden sm:table-cell">Kamar</TableHead>
                        <TableHead className="hidden lg:table-cell">Periode</TableHead>
                        <TableHead className="hidden md:table-cell">Total</TableHead>
                        <TableHead className="hidden lg:table-cell">
                          Jatuh Tempo
                        </TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow
                          key={invoice.id}
                          className="cursor-pointer"
                          onClick={() => setSelectedInvoice(invoice)}
                        >
                          <TableCell className="font-mono text-xs">
                            {invoice.invoiceNumber}
                          </TableCell>
                          <TableCell className="font-medium">
                            {invoice.residentName}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {invoice.roomNumber}
                          </TableCell>
                          <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                            {monthLabel(invoice.periodStart.slice(0, 7))}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <RupiahText amount={invoice.total} size="sm" />
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <DueDateCell dueDate={invoice.dueDate} />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={invoice.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Invoice detail dialog (Req 12.4) */}
      <InvoiceDetailDialog
        invoice={selectedInvoice}
        onOpenChange={(open) => {
          if (!open) setSelectedInvoice(null);
        }}
      />

      {/* Create / bulk-generate dialogs (Req 12.5) */}
      <CreateInvoiceDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
      <BulkGenerateDialog
        open={showBulkDialog}
        onOpenChange={setShowBulkDialog}
        properties={properties}
        periodOptions={periodOptions}
      />
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Page header                                                                  */
/* -------------------------------------------------------------------------- */

function PageHeader({ onCreate, onBulk }: { onCreate: () => void; onBulk: () => void }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="font-display text-xl font-semibold text-foreground">Tagihan</h1>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button variant="outline-ink" iconLeft={Layers} onClick={onBulk}>
          Buat Tagihan Massal
        </Button>
        <Button iconLeft={Plus} onClick={onCreate}>
          Buat Tagihan
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Filter select (native, themed to match Input)                               */
/* -------------------------------------------------------------------------- */

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  allLabel: string;
  options: { value: string; label: string }[];
}

function FilterSelect({ label, value, onChange, allLabel, options }: FilterSelectProps) {
  const id = `filter-${label.toLowerCase()}`;
  return (
    <div className="flex flex-col gap-1.5 sm:w-56">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-10 w-full rounded-input border border-line bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <option value={ALL_FILTER}>{allLabel}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Due-date cell with urgency (Req 12.2)                                        */
/* -------------------------------------------------------------------------- */

function DueDateCell({ dueDate }: { dueDate: string }) {
  const relative = relativeJatuhTempo(dueDate);
  const isOverdue = relative.startsWith("Terlambat");
  const isToday = relative.includes("hari ini");

  return (
    <div className="flex flex-col">
      <span className="text-sm">{formatTanggal(dueDate)}</span>
      <span
        className={`text-xs ${
          isOverdue
            ? "font-medium text-danger"
            : isToday
              ? "font-medium text-warning"
              : "text-muted-foreground"
        }`}
      >
        {relative}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Invoice detail dialog (Req 12.4)                                             */
/* -------------------------------------------------------------------------- */

interface InvoiceDetailDialogProps {
  invoice: Invoice | null;
  onOpenChange: (open: boolean) => void;
}

function InvoiceDetailDialog({ invoice, onOpenChange }: InvoiceDetailDialogProps) {
  return (
    <Dialog open={invoice !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Detail Tagihan</DialogTitle>
        </DialogHeader>

        {invoice && (
          <div className="flex flex-col gap-5">
            {/* Header info */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-sm font-medium">{invoice.invoiceNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {invoice.residentName} — Kamar {invoice.roomNumber}
                </p>
              </div>
              <StatusBadge status={invoice.status} />
            </div>

            {/* Status timeline */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Status
              </span>
              <StatusTimeline status={invoice.status} />
            </div>

            {/* Line items */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Rincian
              </span>
              <div className="divide-y divide-line rounded-input border border-line">
                {invoice.lines.map((line) => (
                  <div
                    key={`${line.description}-${line.amount}`}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <span className="text-sm">{line.description}</span>
                    <RupiahText amount={line.amount} size="sm" />
                  </div>
                ))}
                <div className="flex items-center justify-between bg-muted/30 px-4 py-3">
                  <span className="text-sm font-semibold">Total</span>
                  <RupiahText amount={invoice.total} size="sm" />
                </div>
              </div>
            </div>

            {/* Due date */}
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Jatuh Tempo
              </span>
              <DueDateCell dueDate={invoice.dueDate} />
            </div>

            {/* Payment page link (Req 12.4) */}
            <Link
              href={`/pay/${invoice.paymentToken}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-brand-pandan-600 hover:underline"
            >
              <ExternalLink className="lucide size-4" />
              Lihat Halaman Pembayaran
            </Link>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Status timeline                                                              */
/* -------------------------------------------------------------------------- */

function StatusTimeline({ status }: { status: Invoice["status"] }) {
  const currentIndex = getTimelineIndex(status);
  const isCancelled = status === "batal";
  const isOverdue = status === "jatuh_tempo";

  const stepLabel = (step: (typeof TIMELINE_STEPS)[number]): string => {
    if (step === "tertagih" && isOverdue) return "Jatuh tempo";
    return step === "draft" ? "Dibuat" : step === "tertagih" ? "Tertagih" : "Lunas";
  };

  return (
    <div className="flex items-center gap-2">
      {TIMELINE_STEPS.map((step, i) => {
        const isCompleted = !isCancelled && i <= currentIndex;
        const isCurrent = !isCancelled && i === currentIndex;

        return (
          <div key={step} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              {isCompleted ? (
                <CheckCircle2
                  className={`lucide size-5 ${
                    isCurrent && isOverdue
                      ? "text-danger"
                      : isCurrent
                        ? "text-brand-pandan-600"
                        : "text-success"
                  }`}
                />
              ) : (
                <Circle className="lucide size-5 text-muted-foreground/40" />
              )}
              <span
                className={`text-xs ${
                  isCompleted ? "font-medium text-foreground" : "text-muted-foreground"
                }`}
              >
                {stepLabel(step)}
              </span>
            </div>
            {i < TIMELINE_STEPS.length - 1 && (
              <div
                className={`h-0.5 w-8 ${
                  !isCancelled && i < currentIndex
                    ? "bg-success"
                    : "bg-muted-foreground/20"
                }`}
              />
            )}
          </div>
        );
      })}
      {isCancelled && (
        <span className="ml-2 text-xs font-medium text-danger">Dibatalkan</span>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Create invoice dialog (mocked — Req 12.5)                                    */
/* -------------------------------------------------------------------------- */

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateInvoiceDialog({ open, onOpenChange }: CreateInvoiceDialogProps) {
  const [done, setDone] = useState(false);

  function handleOpenChange(next: boolean) {
    if (!next) setDone(false);
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Buat Tagihan</DialogTitle>
          <DialogDescription>
            Buat tagihan baru untuk penghuni. Fitur ini akan terhubung ke backend di fase
            berikutnya.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <SuccessNotice message="Tagihan berhasil dibuat." />
        ) : (
          <div className="flex flex-col gap-4">
            <FormField label="Penghuni" name="resident">
              <Input id="resident" placeholder="Pilih penghuni" />
            </FormField>
            <FormField label="Kamar" name="room">
              <Input id="room" placeholder="Nomor kamar" />
            </FormField>
            <FormField label="Periode Mulai" name="periodStart">
              <Input id="periodStart" type="date" />
            </FormField>
            <FormField label="Periode Akhir" name="periodEnd">
              <Input id="periodEnd" type="date" />
            </FormField>
            <FormField label="Jumlah (Rp)" name="amount">
              <Input id="amount" placeholder="Contoh: 1.500.000" inputMode="numeric" />
            </FormField>
          </div>
        )}

        <DialogFooter>
          {done ? (
            <Button type="button" onClick={() => handleOpenChange(false)}>
              {copy.aksi.tutup}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
              >
                {copy.aksi.batal}
              </Button>
              <Button type="button" onClick={() => setDone(true)}>
                {copy.aksi.simpan}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Bulk-generate dialog (mocked — Req 12.5)                                     */
/* -------------------------------------------------------------------------- */

interface BulkGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties: Property[];
  periodOptions: { value: string; label: string }[];
}

function BulkGenerateDialog({
  open,
  onOpenChange,
  properties,
  periodOptions,
}: BulkGenerateDialogProps) {
  const [propertyId, setPropertyId] = useState<string>(ALL_FILTER);
  const [period, setPeriod] = useState<string>(periodOptions[0]?.value ?? ALL_FILTER);
  const [generatedCount, setGeneratedCount] = useState<number | null>(null);

  function reset() {
    setPropertyId(ALL_FILTER);
    setPeriod(periodOptions[0]?.value ?? ALL_FILTER);
    setGeneratedCount(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function handleGenerate() {
    // Mocked: derive a believable count from occupied rooms in scope.
    setGeneratedCount(simulateBulkInvoiceCount(properties, propertyId));
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Buat Tagihan Massal</DialogTitle>
          <DialogDescription>
            Buat tagihan sekaligus untuk seluruh penghuni aktif pada periode terpilih.
            Simulasi — belum tersimpan ke backend.
          </DialogDescription>
        </DialogHeader>

        {generatedCount !== null ? (
          <SuccessNotice message={`${generatedCount} tagihan dibuat.`} />
        ) : (
          <div className="flex flex-col gap-4">
            <FormField label="Properti" name="bulk-property">
              <select
                id="bulk-property"
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="flex h-10 w-full rounded-input border border-line bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <option value={ALL_FILTER}>Semua Properti</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Periode" name="bulk-period">
              <select
                id="bulk-period"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="flex h-10 w-full rounded-input border border-line bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {periodOptions.length === 0 ? (
                  <option value={ALL_FILTER}>Semua Periode</option>
                ) : (
                  periodOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))
                )}
              </select>
            </FormField>
          </div>
        )}

        <DialogFooter>
          {generatedCount !== null ? (
            <Button type="button" onClick={() => handleOpenChange(false)}>
              {copy.aksi.tutup}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
              >
                {copy.aksi.batal}
              </Button>
              <Button type="button" iconLeft={Layers} onClick={handleGenerate}>
                Buat Tagihan
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                      */
/* -------------------------------------------------------------------------- */

function SuccessNotice({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 rounded-input border border-success/20 bg-success/10 px-4 py-3">
      <CheckCircle2 className="lucide size-5 shrink-0 text-success" />
      <p className="text-sm font-medium text-foreground">{message}</p>
    </div>
  );
}

function FormField({
  label,
  children,
  name,
}: {
  label: string;
  children: React.ReactNode;
  name?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
