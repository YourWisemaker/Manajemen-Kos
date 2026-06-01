"use client";

import { Filter, Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { EmptyState, RupiahText, StatusBadge } from "@/components/brand";
import { CardSkeleton, FadeIn, NotFound } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Property, Room } from "@/lib/data";
import copy from "@/lib/locale/copy/id";
import { roomSchema, submitHandler, useZodForm } from "@/lib/schemas";
import { listProperties, listRooms } from "../actions";

/**
 * Property detail page — Task 13.1 + 13.2
 * ----------------------------------------
 * Shows the property heading and a responsive grid of room cards. Each card
 * displays room number, type, monthly price (RupiahText), and a StatusBadge.
 *
 * Task 13.2 adds:
 *   - "Tambah Kamar" button opening a Dialog with RHF+Zod form (roomSchema)
 *   - Status filter (Semua / Tersedia / Terisi / Perbaikan)
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 18.8, 21.1, 21.2, 21.3
 */

type RoomStatus = Room["status"];

const STATUS_FILTERS: { label: string; value: RoomStatus | "semua" }[] = [
  { label: "Semua", value: "semua" },
  { label: "Tersedia", value: "tersedia" },
  { label: "Terisi", value: "terisi" },
  { label: "Perbaikan", value: "perbaikan" },
];

export default function PropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const propertyId = params.id;

  const [property, setProperty] = useState<Property | null | undefined>(undefined);
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<RoomStatus | "semua">("semua");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.all([listProperties(), listRooms(propertyId)]).then(([props, roomList]) => {
      if (!active) return;
      const found = props.find((p) => p.id === propertyId);
      setProperty(found ?? null);
      setRooms(roomList);
    });

    return () => {
      active = false;
    };
  }, [propertyId]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    if (!rooms) return null;
    if (statusFilter === "semua") return rooms;
    return rooms.filter((r) => r.status === statusFilter);
  }, [rooms, statusFilter]);

  // Loading state
  if (property === undefined || rooms === null) {
    return (
      <section className="flex flex-col gap-6">
        <div className="h-8 w-48 animate-shimmer rounded-sm bg-muted" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </section>
    );
  }

  // Not found
  if (property === null) {
    return <NotFound />;
  }

  return (
    <section className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {property.name}
        </h1>
        <AddRoomDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </div>

      {/* Filters (Task 13.2) */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="lucide size-4 text-muted-foreground" aria-hidden="true" />
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={statusFilter === f.value ? "primary" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Room grid or empty state */}
      {rooms.length === 0 ? (
        <EmptyState
          illustration="kamar"
          title={copy.kosong.kamar.judul}
          description={copy.kosong.kamar.deskripsi}
          action={{ label: "Tambah Kamar", onClick: () => setDialogOpen(true) }}
        />
      ) : filteredRooms && filteredRooms.length === 0 ? (
        <FadeIn>
          <p className="py-12 text-center text-sm text-muted-foreground">
            Tidak ada kamar dengan status ini.
          </p>
        </FadeIn>
      ) : (
        <FadeIn>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredRooms?.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        </FadeIn>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Room card
// ---------------------------------------------------------------------------

function RoomCard({ room }: { room: Room }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between">
          <span className="font-display text-base font-semibold text-foreground">
            Kamar {room.number}
          </span>
          <StatusBadge status={room.status} />
        </div>
        <span className="text-xs text-muted-foreground">{room.type}</span>
        <RupiahText amount={room.monthlyPrice} size="md" tone="default" />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Add room dialog (Task 13.2)
// ---------------------------------------------------------------------------

function AddRoomDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const form = useZodForm(roomSchema, {
    defaultValues: { number: "", monthlyPrice: "" },
  });

  const onValid = () => {
    // Mock phase — no real persistence. Just close the dialog.
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button iconLeft={Plus} size="sm">
          Tambah Kamar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Kamar</DialogTitle>
        </DialogHeader>
        <form onSubmit={submitHandler(form, onValid)} className="flex flex-col gap-4">
          {/* Room number */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="room-number" className="text-sm font-medium text-foreground">
              Nomor Kamar
            </label>
            <Input
              id="room-number"
              placeholder="Contoh: A1"
              {...form.register("number")}
            />
            {form.formState.errors.number && (
              <p className="text-xs text-danger">
                {form.formState.errors.number.message}
              </p>
            )}
          </div>

          {/* Monthly price */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="room-price" className="text-sm font-medium text-foreground">
              Harga Sewa per Bulan (Rp)
            </label>
            <Input
              id="room-price"
              placeholder="Contoh: 1.500.000"
              {...form.register("monthlyPrice")}
            />
            {form.formState.errors.monthlyPrice && (
              <p className="text-xs text-danger">
                {form.formState.errors.monthlyPrice.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {copy.aksi.batal}
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              {copy.aksi.simpan}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
