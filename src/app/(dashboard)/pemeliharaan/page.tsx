"use client";

import { CheckCircle2, Plus, Search, Wrench } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { EntityStatus } from "@/components/brand";
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
import { formatTanggal } from "@/lib/locale/datetime";
import { listRooms } from "../properti/actions";
import {
  createMaintenanceRequest,
  listMaintenanceRequests,
  updateMaintenanceRequest,
} from "./actions";

/**
 * Pemeliharaan (Maintenance) Management Page
 * -------------------------------------------
 * Manage maintenance requests: create, view, filter by status, and resolve.
 * Backend is wired to the MaintenanceService via server actions.
 */

interface MaintenanceItem {
  id: string;
  tenantId: string;
  roomId: string;
  kosTenantId: string | null;
  description: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

type StatusFilter = "semua" | "open" | "in_progress" | "resolved";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "semua", label: "Semua" },
  { value: "open", label: "Baru" },
  { value: "in_progress", label: "Dikerjakan" },
  { value: "resolved", label: "Selesai" },
];

function statusLabel(status: string): string {
  switch (status) {
    case "open":
      return "Baru";
    case "in_progress":
      return "Dikerjakan";
    case "resolved":
      return "Selesai";
    default:
      return status;
  }
}

export default function PemeliharaanPage() {
  const [requests, setRequests] = useState<MaintenanceItem[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("semua");
  const [search, setSearch] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceItem | null>(null);

  const loadData = useCallback((filter?: { status?: string }) => {
    const queryFilter = filter?.status && filter.status !== "semua" ? filter : undefined;
    listMaintenanceRequests(queryFilter).then((data) =>
      setRequests(data as MaintenanceItem[]),
    );
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    if (!requests) return [];
    return requests.filter((r) => {
      const matchesStatus = statusFilter === "semua" || r.status === statusFilter;
      const matchesSearch =
        search.trim() === "" ||
        r.description.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [requests, statusFilter, search]);

  const isLoading = requests === null;
  const hasNoRequests = requests !== null && requests.length === 0;

  if (hasNoRequests) {
    return (
      <section className="flex flex-col gap-6">
        <PageHeader onCreate={() => setShowCreateDialog(true)} />
        <EmptyState
          illustration="umum"
          title="Belum Ada Permintaan Pemeliharaan"
          description="Buat permintaan pemeliharaan pertama untuk melacak perbaikan dan perawatan properti Anda."
          action={{
            label: "Buat Permintaan",
            onClick: () => setShowCreateDialog(true),
          }}
        />
        <CreateMaintenanceDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onCreated={() => loadData()}
        />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader onCreate={() => setShowCreateDialog(true)} />

      {/* Status tabs */}
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

      {/* Search */}
      <div className="relative w-full sm:max-w-xs">
        <Search className="lucide absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari deskripsi…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : (
        <FadeIn>
          <Card>
            <CardHeader className="pb-0" />
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                  {copy.umum.tidakAdaData}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Deskripsi</TableHead>
                        <TableHead className="hidden sm:table-cell">Tanggal</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden md:table-cell">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((item) => (
                        <TableRow
                          key={item.id}
                          className="cursor-pointer"
                          onClick={() => setSelectedRequest(item)}
                        >
                          <TableCell className="max-w-xs truncate font-medium">
                            {item.description}
                          </TableCell>
                          <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                            {formatTanggal(
                              item.createdAt instanceof Date
                                ? item.createdAt.toISOString().slice(0, 10)
                                : String(item.createdAt).slice(0, 10),
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={item.status as EntityStatus} />
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {item.status !== "resolved" && (
                              <Button
                                size="sm"
                                variant="outline-ink"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleResolve(item.id);
                                }}
                              >
                                Selesai
                              </Button>
                            )}
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

      {/* Detail dialog */}
      <MaintenanceDetailDialog
        item={selectedRequest}
        onOpenChange={(open) => {
          if (!open) setSelectedRequest(null);
        }}
        onStatusChange={(id, status) => handleStatusChange(id, status)}
      />

      {/* Create dialog */}
      <CreateMaintenanceDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={() => loadData()}
      />
    </section>
  );

  async function handleResolve(id: string) {
    await updateMaintenanceRequest(id, { status: "resolved" });
    loadData();
  }

  async function handleStatusChange(id: string, status: string) {
    await updateMaintenanceRequest(id, { status });
    loadData();
    setSelectedRequest(null);
  }
}

/* -------------------------------------------------------------------------- */
/* Page Header                                                                 */
/* -------------------------------------------------------------------------- */

function PageHeader({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="font-display text-xl font-semibold text-foreground">Pemeliharaan</h1>
      <Button iconLeft={Plus} onClick={onCreate}>
        Buat Permintaan
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Create Maintenance Dialog                                                   */
/* -------------------------------------------------------------------------- */

interface CreateMaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

function CreateMaintenanceDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateMaintenanceDialogProps) {
  const [roomId, setRoomId] = useState("");
  const [description, setDescription] = useState("");
  const [rooms, setRooms] = useState<{ id: string; number: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      // Load rooms from first property (simplified — in production, add property selector)
      listRooms("").then((r) =>
        setRooms(r.map((room) => ({ id: room.id, number: room.number }))),
      );
    }
  }, [open]);

  function reset() {
    setRoomId("");
    setDescription("");
    setSuccess(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleSubmit() {
    if (!description.trim()) return;
    setLoading(true);
    try {
      await createMaintenanceRequest({
        roomId: roomId || undefined!,
        description: description.trim(),
      });
      setSuccess(true);
      onCreated();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Buat Permintaan Pemeliharaan</DialogTitle>
          <DialogDescription>
            Deskripsikan masalah yang perlu diperbaiki. Pilih kamar jika relevan.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex items-center gap-3 rounded-input border border-success/20 bg-success/10 px-4 py-3">
            <CheckCircle2 className="lucide size-5 shrink-0 text-success" />
            <p className="text-sm font-medium text-foreground">
              Permintaan pemeliharaan berhasil dibuat.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {rooms.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="maint-room"
                  className="text-sm font-medium text-foreground"
                >
                  Kamar (opsional)
                </label>
                <select
                  id="maint-room"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="flex h-10 w-full rounded-input border border-line bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <option value="">Pilih kamar</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Kamar {r.number}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="maint-desc" className="text-sm font-medium text-foreground">
                Deskripsi Masalah
              </label>
              <textarea
                id="maint-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full rounded-input border border-line bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="Jelaskan masalah yang perlu diperbaiki…"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {success ? (
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
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !description.trim()}
              >
                {loading ? "Menyimpan…" : copy.aksi.simpan}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Maintenance Detail Dialog                                                    */
/* -------------------------------------------------------------------------- */

interface MaintenanceDetailDialogProps {
  item: MaintenanceItem | null;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (id: string, status: string) => void;
}

function MaintenanceDetailDialog({
  item,
  onOpenChange,
  onStatusChange,
}: MaintenanceDetailDialogProps) {
  return (
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Detail Pemeliharaan</DialogTitle>
        </DialogHeader>

        {item && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-secondary">
                <Wrench className="lucide size-5 text-brand-pandan-600" />
              </div>
              <div>
                <p className="font-medium text-foreground">{statusLabel(item.status)}</p>
                <p className="text-xs text-muted-foreground">
                  Dibuat{" "}
                  {formatTanggal(
                    item.createdAt instanceof Date
                      ? item.createdAt.toISOString().slice(0, 10)
                      : String(item.createdAt).slice(0, 10),
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Deskripsi
              </span>
              <p className="text-sm whitespace-pre-wrap">{item.description}</p>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Status
              </span>
              <StatusBadge status={item.status as EntityStatus} />
            </div>

            {item.status !== "resolved" && (
              <div className="flex gap-2">
                {item.status === "open" && (
                  <Button
                    variant="outline-ink"
                    size="sm"
                    onClick={() => onStatusChange(item.id, "in_progress")}
                  >
                    Mulai Kerjakan
                  </Button>
                )}
                <Button size="sm" onClick={() => onStatusChange(item.id, "resolved")}>
                  Tandai Selesai
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
