"use client";

import { FileText, Plus, Search, Upload, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { EmptyState, StatusBadge } from "@/components/brand";
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
import { dataSource, PRIMARY_TENANT_ID, type Resident } from "@/lib/mock";
import { residentSchema, submitHandler, useZodForm } from "@/lib/schemas";
import { useTenant } from "@/lib/tenant";

/**
 * Penghuni (Resident) Management Page — Task 14
 * -----------------------------------------------
 * Searchable, status-filterable resident table with KTP masking in list view.
 * Detail drawer (Dialog) shows full identity, KTP upload stub, emergency
 * contact, current room, and payment history placeholder.
 * Add-resident form with KTP validation (exactly 16 digits).
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

type StatusFilter = "semua" | "aktif" | "keluar";

/** Mask a 16-digit KTP number, showing only the last 4 digits. */
function maskKtp(ktp: string): string {
  if (ktp.length <= 4) return ktp;
  return `••••••••••••${ktp.slice(-4)}`;
}

export default function PenghuniPage() {
  const { tenant } = useTenant();

  const [residents, setResidents] = useState<Resident[] | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("semua");
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    const tenantId = tenant.id || PRIMARY_TENANT_ID;
    dataSource.listResidents(tenantId).then(setResidents);
  }, [tenant.id]);

  const isLoading = residents === null;

  /** Client-side filtered residents based on search and status. */
  const filtered = useMemo(() => {
    if (!residents) return [];
    return residents.filter((r) => {
      const matchesSearch =
        search.trim() === "" || r.fullName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "semua" || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [residents, search, statusFilter]);

  // Empty state: no residents at all
  if (!isLoading && residents.length === 0) {
    return (
      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-xl font-semibold text-foreground">Penghuni</h1>
          <Button iconLeft={Plus} onClick={() => setShowAddDialog(true)}>
            Tambah Penghuni
          </Button>
        </div>
        <EmptyState
          illustration="penghuni"
          title={copy.kosong.penghuni.judul}
          description={copy.kosong.penghuni.deskripsi}
          action={{ label: "Tambah Penghuni", onClick: () => setShowAddDialog(true) }}
        />
        <AddResidentDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-xl font-semibold text-foreground">Penghuni</h1>
        <Button iconLeft={Plus} onClick={() => setShowAddDialog(true)}>
          Tambah Penghuni
        </Button>
      </div>

      {/* Search + Status Filter */}
      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : (
        <FadeIn>
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="lucide absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama penghuni…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Tabs
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                >
                  <TabsList>
                    <TabsTrigger value="semua">Semua</TabsTrigger>
                    <TabsTrigger value="aktif">Aktif</TabsTrigger>
                    <TabsTrigger value="keluar">Keluar</TabsTrigger>
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
                        <TableHead>Nama</TableHead>
                        <TableHead className="hidden sm:table-cell">No. KTP</TableHead>
                        <TableHead className="hidden md:table-cell">Telepon</TableHead>
                        <TableHead className="hidden lg:table-cell">Kamar</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((resident) => (
                        <TableRow
                          key={resident.id}
                          className="cursor-pointer"
                          onClick={() => setSelectedResident(resident)}
                        >
                          <TableCell className="font-medium">
                            {resident.fullName}
                          </TableCell>
                          <TableCell className="hidden font-mono text-xs sm:table-cell">
                            {maskKtp(resident.ktpNumber)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {resident.phone}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {resident.roomNumber ?? "—"}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={resident.status} />
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

      {/* Detail Drawer (Dialog) */}
      <ResidentDetailDialog
        resident={selectedResident}
        onOpenChange={(open) => {
          if (!open) setSelectedResident(null);
        }}
      />

      {/* Add Resident Dialog */}
      <AddResidentDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Resident Detail Dialog                                                      */
/* -------------------------------------------------------------------------- */

interface ResidentDetailDialogProps {
  resident: Resident | null;
  onOpenChange: (open: boolean) => void;
}

function ResidentDetailDialog({ resident, onOpenChange }: ResidentDetailDialogProps) {
  return (
    <Dialog open={resident !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Detail Penghuni</DialogTitle>
        </DialogHeader>

        {resident && (
          <div className="flex flex-col gap-5">
            {/* Identity */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-secondary">
                  <User className="lucide size-5 text-brand-pandan-600" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{resident.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {resident.status === "aktif" ? "Penghuni aktif" : "Sudah keluar"}
                  </p>
                </div>
              </div>
            </div>

            {/* KTP — full number shown in detail view (Req 10.3) */}
            <DetailSection title="Nomor KTP">
              <p className="font-mono text-sm tabular-nums">{resident.ktpNumber}</p>
            </DetailSection>

            {/* KTP Image Upload Stub */}
            <DetailSection title="Foto KTP">
              <div className="flex items-center justify-center rounded-input border-2 border-dashed border-line bg-muted/30 px-4 py-6">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="lucide size-5" />
                  <span className="text-xs">Unggah KTP</span>
                </div>
              </div>
            </DetailSection>

            {/* Contact info */}
            <DetailSection title="Telepon">
              <p className="text-sm">{resident.phone}</p>
            </DetailSection>

            {resident.email && (
              <DetailSection title="Email">
                <p className="text-sm">{resident.email}</p>
              </DetailSection>
            )}

            {resident.emergencyContact && (
              <DetailSection title="Kontak Darurat">
                <p className="text-sm">{resident.emergencyContact}</p>
              </DetailSection>
            )}

            {/* Current room */}
            <DetailSection title="Kamar Saat Ini">
              <p className="text-sm">{resident.roomNumber ?? "Tidak ada kamar"}</p>
            </DetailSection>

            {/* Contract cross-surface link (residents → contracts) */}
            <DetailSection title="Kontrak">
              <Link
                href="/kontrak"
                className="inline-flex items-center gap-2 text-sm font-medium text-brand-pandan-600 hover:underline"
              >
                <FileText className="lucide size-4" aria-hidden="true" />
                Lihat kontrak penghuni
              </Link>
            </DetailSection>

            {/* Payment history placeholder */}
            <DetailSection title="Riwayat Pembayaran">
              <p className="text-xs text-muted-foreground">
                Riwayat pembayaran akan ditampilkan di sini.
              </p>
            </DetailSection>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

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

/* -------------------------------------------------------------------------- */
/* Add Resident Dialog (Form)                                                  */
/* -------------------------------------------------------------------------- */

interface AddResidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AddResidentDialog({ open, onOpenChange }: AddResidentDialogProps) {
  const form = useZodForm(residentSchema, {
    defaultValues: {
      fullName: "",
      ktpNumber: "",
      phone: "",
      email: "",
      emergencyContact: "",
      roomNumber: "",
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
    // Mock — no real persistence. Just close the dialog.
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
          <DialogTitle>Tambah Penghuni</DialogTitle>
          <DialogDescription>
            Masukkan data penghuni baru. Nomor KTP harus 16 digit.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {/* Full Name */}
          <FormField
            label="Nama Lengkap"
            error={errors.fullName?.message}
            name="fullName"
          >
            <Input
              id="fullName"
              {...register("fullName")}
              placeholder="Nama lengkap penghuni"
            />
          </FormField>

          {/* KTP Number */}
          <FormField label="Nomor KTP" error={errors.ktpNumber?.message} name="ktpNumber">
            <Input
              id="ktpNumber"
              {...register("ktpNumber")}
              placeholder="16 digit nomor KTP"
              inputMode="numeric"
              maxLength={16}
            />
          </FormField>

          {/* Phone */}
          <FormField label="Telepon" error={errors.phone?.message} name="phone">
            <Input
              id="phone"
              {...register("phone")}
              placeholder="08xxxxxxxxxx"
              inputMode="tel"
            />
          </FormField>

          {/* Email (optional) */}
          <FormField label="Email (opsional)" error={errors.email?.message} name="email">
            <Input
              id="email"
              {...register("email")}
              placeholder="email@contoh.com"
              type="email"
            />
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
/* Form Field helper                                                           */
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
