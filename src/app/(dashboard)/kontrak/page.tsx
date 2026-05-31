"use client";

import { FileText, Plus, Printer } from "lucide-react";
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
import { formatTanggal } from "@/lib/locale/datetime";
import copy from "@/lib/locale/copy/id";
import { dataSource, PRIMARY_TENANT_ID, type Contract } from "@/lib/mock";
import { formatRupiah } from "@/lib/locale/rupiah";
import { contractDateRangeSchema, submitHandler, useZodForm } from "@/lib/schemas";
import { useTenant } from "@/lib/tenant";

/**
 * Digital Contracts Page — Task 16
 * --------------------------------
 * Contract list with status badges and date ranges (Asia/Jakarta).
 * Click a row to open a detail dialog showing parties, room, locked price,
 * deposit, and rental period. "Buat Kontrak" form with date-range validation.
 * Printable contract preview layout.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 18.7
 */

export default function KontrakPage() {
  const { tenant } = useTenant();
  const [contracts, setContracts] = useState<Contract[] | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    const tenantId = tenant.id || PRIMARY_TENANT_ID;
    dataSource.listContracts(tenantId).then(setContracts);
  }, [tenant.id]);

  const isLoading = contracts === null;

  if (!isLoading && contracts.length === 0) {
    return (
      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-xl font-semibold text-foreground">Kontrak</h1>
          <Button iconLeft={Plus} onClick={() => setShowCreateDialog(true)}>
            Buat Kontrak
          </Button>
        </div>
        <EmptyState
          illustration="umum"
          title="Belum ada kontrak"
          description="Buat kontrak pertama untuk mencatat perjanjian sewa dengan penghuni."
          action={{ label: "Buat Kontrak", onClick: () => setShowCreateDialog(true) }}
        />
        <CreateContractDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-xl font-semibold text-foreground">Kontrak</h1>
        <Button iconLeft={Plus} onClick={() => setShowCreateDialog(true)}>
          Buat Kontrak
        </Button>
      </div>

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : (
        <FadeIn>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Penghuni</TableHead>
                      <TableHead>Kamar</TableHead>
                      <TableHead className="hidden sm:table-cell">Periode</TableHead>
                      <TableHead className="hidden md:table-cell">Deposit</TableHead>
                      <TableHead className="hidden lg:table-cell">Harga/bln</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.map((contract) => (
                      <TableRow
                        key={contract.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedContract(contract)}
                      >
                        <TableCell className="font-medium">
                          {contract.residentName}
                        </TableCell>
                        <TableCell>{contract.roomNumber}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {formatTanggal(contract.startDate)} –{" "}
                            {formatTanggal(contract.endDate)}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <RupiahText amount={contract.depositAmount} size="sm" />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <RupiahText amount={contract.monthlyPrice} size="sm" />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={contract.status} />
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

      {/* Contract Detail Dialog */}
      <ContractDetailDialog
        contract={selectedContract}
        onOpenChange={(open) => {
          if (!open) setSelectedContract(null);
        }}
      />

      {/* Create Contract Dialog */}
      <CreateContractDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Contract Detail Dialog                                                       */
/* -------------------------------------------------------------------------- */

interface ContractDetailDialogProps {
  contract: Contract | null;
  onOpenChange: (open: boolean) => void;
}

function ContractDetailDialog({ contract, onOpenChange }: ContractDetailDialogProps) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <Dialog open={contract !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Detail Kontrak</DialogTitle>
        </DialogHeader>

        {contract && !showPreview && (
          <div className="flex flex-col gap-5">
            <DetailSection title="Penghuni">
              <p className="text-sm font-medium">{contract.residentName}</p>
            </DetailSection>

            <DetailSection title="Kamar">
              <p className="text-sm">{contract.roomNumber}</p>
            </DetailSection>

            <DetailSection title="Harga Sewa per Bulan">
              <RupiahText amount={contract.monthlyPrice} size="md" />
            </DetailSection>

            <DetailSection title="Deposit">
              <RupiahText amount={contract.depositAmount} size="md" />
            </DetailSection>

            <DetailSection title="Periode Sewa">
              <p className="text-sm">
                {formatTanggal(contract.startDate)} – {formatTanggal(contract.endDate)}
              </p>
            </DetailSection>

            <DetailSection title="Status">
              <StatusBadge status={contract.status} />
            </DetailSection>

            <Button
              variant="outline-ink"
              iconLeft={Printer}
              onClick={() => setShowPreview(true)}
              className="mt-2"
            >
              Lihat Preview Cetak
            </Button>
          </div>
        )}

        {contract && showPreview && (
          <PrintableContractPreview
            contract={contract}
            onBack={() => setShowPreview(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Printable Contract Preview                                                   */
/* -------------------------------------------------------------------------- */

function PrintableContractPreview({
  contract,
  onBack,
}: {
  contract: Contract;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="border-2 border-dashed border-line print:border-solid">
        <CardContent className="p-6 space-y-4">
          <div className="text-center border-b border-line pb-4">
            <h3 className="font-display text-lg font-bold">PERJANJIAN SEWA KAMAR KOS</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Dokumen ini merupakan bukti perjanjian sewa yang sah
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Penyewa</span>
              <p className="font-medium">{contract.residentName}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Kamar</span>
              <p className="font-medium">{contract.roomNumber}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Mulai</span>
              <p className="font-medium">{formatTanggal(contract.startDate)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Berakhir</span>
              <p className="font-medium">{formatTanggal(contract.endDate)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Harga/bulan</span>
              <p className="font-mono text-sm tabular-nums">
                {formatRupiah(contract.monthlyPrice)}
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Deposit</span>
              <p className="font-mono text-sm tabular-nums">
                {formatRupiah(contract.depositAmount)}
              </p>
            </div>
          </div>

          <div className="border-t border-line pt-4 mt-4">
            <div className="grid grid-cols-2 gap-8 text-center text-xs text-muted-foreground">
              <div>
                <div className="h-12" />
                <div className="border-t border-ink-900 pt-1">Pemilik Kos</div>
              </div>
              <div>
                <div className="h-12" />
                <div className="border-t border-ink-900 pt-1">Penyewa</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button variant="ghost" onClick={onBack}>
        ← Kembali ke detail
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Create Contract Dialog                                                       */
/* -------------------------------------------------------------------------- */

interface CreateContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateContractDialog({ open, onOpenChange }: CreateContractDialogProps) {
  const form = useZodForm(contractDateRangeSchema, {
    defaultValues: {
      startDate: "",
      endDate: "",
    },
  });

  const {
    register,
    formState: { errors },
    reset,
  } = form;

  function handleClose() {
    reset();
    onOpenChange(false);
  }

  const onSubmit = submitHandler(form, () => {
    handleClose();
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Buat Kontrak</DialogTitle>
          <DialogDescription>
            Buat kontrak sewa baru. Tanggal selesai harus setelah tanggal mulai.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <FormField label="Nama Penghuni" name="residentName">
            <Input placeholder="Nama lengkap penghuni" />
          </FormField>

          <FormField label="Nomor Kamar" name="roomNumber">
            <Input placeholder="Contoh: A1" />
          </FormField>

          <FormField
            label="Tanggal Mulai"
            error={errors.startDate?.message}
            name="startDate"
          >
            <Input id="startDate" type="date" {...register("startDate")} />
          </FormField>

          <FormField
            label="Tanggal Selesai"
            error={errors.endDate?.message}
            name="endDate"
          >
            <Input id="endDate" type="date" {...register("endDate")} />
          </FormField>

          <FormField label="Deposit (Rp)" name="depositAmount">
            <Input placeholder="Contoh: 1.500.000" inputMode="numeric" />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose}>
              {copy.aksi.batal}
            </Button>
            <Button type="submit">{copy.aksi.simpan}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                      */
/* -------------------------------------------------------------------------- */

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </span>
      {children}
    </div>
  );
}

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
