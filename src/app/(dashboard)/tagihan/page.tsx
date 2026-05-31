"use client";

import {
  CheckCircle2,
  Circle,
  ExternalLink,
  FileText,
  Plus,
  Send,
} from "lucide-react";
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
import { formatTanggal, relativeJatuhTempo } from "@/lib/locale/datetime";
import copy from "@/lib/locale/copy/id";
import { dataSource, PRIMARY_TENANT_ID, type Invoice } from "@/lib/mock";
import { useTenant } from "@/lib/tenant";

/**
 * Billing / Invoices Page — Task 17
 * ---------------------------------
 * Invoice list with filters (status, period, property), totals via RupiahText,
 * due-date urgency via relativeJatuhTempo, status badges. Click a row to open
 * invoice detail with line items, status timeline, and payment page link.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */

type StatusFilter =
  | "semua"
  | "draft"
  | "tertagih"
  | "lunas"
  | "jatuh_tempo"
  | "batal";

export default function TagihanPage() {
  const { tenant } = useTenant();
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("semua");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    const tenantId = tenant.id || PRIMARY_TENANT_ID;
    dataSource.listInvoices(tenantId).then(setInvoices);
  }, [tenant.id]);

  const isLoading = invoices === null;

  const filtered = useMemo(() => {
    if (!invoices) return [];
    if (statusFilter === "semua") return invoices;
    return invoices.filter((inv) => inv.status === statusFilter);
  }, [invoices, statusFilter]);

  if (!isLoading && invoices.length === 0) {
    return (
      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-xl font-semibold text-foreground">Tagihan</h1>
          <Button iconLeft={Plus} onClick={() => setShowCreateDialog(true)}>
            Buat Tagihan
          </Button>
        </div>
        <EmptyState
          illustration="tagihan"
          title={copy.kosong.tagihan.judul}
          description={copy.kosong.tagihan.deskripsi}
          action={{ label: "Buat Tagihan", onClick: () => setShowCreateDialog(true) }}
        />
        <CreateInvoiceDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-xl font-semibold text-foreground">Tagihan</h1>
        <Button iconLeft={Plus} onClick={() => setShowCreateDialog(true)}>
          Buat Tagihan
        </Button>
      </div>

      {isLoading ? (
        <ListSkeleton rows={6} />
      ) : (
        <FadeIn>
          <Card>
            <CardHeader className="pb-4">
              <div className="overflow-x-auto">
                <Tabs
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                >
                  <TabsList>
                    <TabsTrigger value="semua">Semua</TabsTrigger>
                    <TabsTrigger value="draft">Draft</TabsTrigger>
                    <TabsTrigger value="tertagih">Tertagih</TabsTrigger>
                    <TabsTrigger value="lunas">Lunas</TabsTrigger>
                    <TabsTrigger value="jatuh_tempo">Jatuh Tempo</TabsTrigger>
                    <TabsTrigger value="batal">Batal</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-muted-foreground">
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
                        <TableHead className="hidden md:table-cell">Total</TableHead>
                        <TableHead className="hidden lg:table-cell">
                          Jatuh Tempo
                        </TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((invoice) => (
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

      {/* Invoice Detail Dialog */}
      <InvoiceDetailDialog
        invoice={selectedInvoice}
        onOpenChange={(open) => {
          if (!open) setSelectedInvoice(null);
        }}
      />

      {/* Create Invoice Dialog */}
      <CreateInvoiceDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Due Date Cell with urgency                                                   */
/* -------------------------------------------------------------------------- */

function DueDateCell({ dueDate }: { dueDate: string }) {
  const relative = relativeJatuhTempo(dueDate);
  const isOverdue = relative.startsWith("Terlambat");
  const isToday = relative.includes("hari ini");

  return (
    <div className="flex flex-col">
      <span className="text-sm">{formatTanggal(dueDate)}</span>
      <span
        className={`text-xs ${isOverdue ? "text-danger font-medium" : isToday ? "text-warning font-medium" : "text-muted-foreground"}`}
      >
        {relative}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Invoice Detail Dialog                                                        */
/* -------------------------------------------------------------------------- */

interface InvoiceDetailDialogProps {
  invoice: Invoice | null;
  onOpenChange: (open: boolean) => void;
}

/** Status timeline steps for an invoice. */
const TIMELINE_STEPS = ["draft", "tertagih", "lunas"] as const;

function getTimelineIndex(status: Invoice["status"]): number {
  if (status === "draft") return 0;
  if (status === "tertagih" || status === "jatuh_tempo") return 1;
  if (status === "lunas") return 2;
  return -1; // batal
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
                <p className="font-mono text-sm font-medium">
                  {invoice.invoiceNumber}
                </p>
                <p className="text-xs text-muted-foreground">
                  {invoice.residentName} — Kamar {invoice.roomNumber}
                </p>
              </div>
              <StatusBadge status={invoice.status} />
            </div>

            {/* Status Timeline */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Status Timeline
              </span>
              <StatusTimeline status={invoice.status} />
            </div>

            {/* Line Items */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Rincian
              </span>
              <div className="rounded-input border border-line divide-y divide-line">
                {invoice.lines.map((line, i) => (
                  <div
                    key={`${line.description}-${i}`}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <span className="text-sm">{line.description}</span>
                    <RupiahText amount={line.amount} size="sm" />
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
                  <span className="text-sm font-semibold">Total</span>
                  <RupiahText amount={invoice.total} size="sm" tone="default" />
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

            {/* Payment page link */}
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
/* Status Timeline                                                              */
/* -------------------------------------------------------------------------- */

function StatusTimeline({ status }: { status: Invoice["status"] }) {
  const currentIndex = getTimelineIndex(status);
  const isCancelled = status === "batal";

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
                  className={`lucide size-5 ${isCurrent ? "text-brand-pandan-600" : "text-success"}`}
                />
              ) : (
                <Circle className="lucide size-5 text-muted-foreground/40" />
              )}
              <span
                className={`text-xs capitalize ${isCompleted ? "text-foreground font-medium" : "text-muted-foreground"}`}
              >
                {step === "jatuh_tempo" ? "Jatuh Tempo" : step}
              </span>
            </div>
            {i < TIMELINE_STEPS.length - 1 && (
              <div
                className={`h-0.5 w-8 ${!isCancelled && i < currentIndex ? "bg-success" : "bg-muted-foreground/20"}`}
              />
            )}
          </div>
        );
      })}
      {isCancelled && (
        <div className="ml-2 flex items-center gap-1">
          <span className="text-xs font-medium text-danger">Dibatalkan</span>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Create Invoice Dialog (Mocked stub)                                          */
/* -------------------------------------------------------------------------- */

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateInvoiceDialog({ open, onOpenChange }: CreateInvoiceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Buat Tagihan</DialogTitle>
          <DialogDescription>
            Buat tagihan baru untuk penghuni. Fitur ini akan terhubung ke backend di fase
            berikutnya.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <FormField label="Penghuni" name="resident">
            <Input placeholder="Pilih penghuni" />
          </FormField>

          <FormField label="Kamar" name="room">
            <Input placeholder="Nomor kamar" />
          </FormField>

          <FormField label="Periode Mulai" name="periodStart">
            <Input type="date" />
          </FormField>

          <FormField label="Periode Akhir" name="periodEnd">
            <Input type="date" />
          </FormField>

          <FormField label="Jumlah (Rp)" name="amount">
            <Input placeholder="Contoh: 1.500.000" inputMode="numeric" />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {copy.aksi.batal}
            </Button>
            <Button type="button" onClick={() => onOpenChange(false)}>
              {copy.aksi.simpan}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                      */
/* -------------------------------------------------------------------------- */

function FormField({
  label,
  error,
  children,
  name,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  name?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
