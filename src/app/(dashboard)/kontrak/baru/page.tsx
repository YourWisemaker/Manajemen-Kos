"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { FadeIn } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  dataSource,
  PRIMARY_TENANT_ID,
  type Property,
  type Resident,
  type Room,
} from "@/lib/data";
import copy from "@/lib/locale/copy/id";
import { contractFormSchema, submitHandler, useZodForm } from "@/lib/schemas";
import { useTenant } from "@/lib/tenant";
import { cn } from "@/lib/utils";

/**
 * Buat Kontrak form — Task 16.2
 * -----------------------------
 * Links a resident to a room and captures the rental period, deposit, and
 * locked monthly price. Resident and room selects are populated from the
 * `DataSource` (residents + rooms across the tenant's properties). Validation
 * uses {@link contractFormSchema} (RHF + Zod), which reuses the shared
 * "end date after start date" invariant (Asia/Jakarta): when the end date is
 * not after the start date, submission is blocked and an inline Bahasa
 * Indonesia message renders under the end-date field.
 *
 * On a valid submit (mock phase — no persistence) the user is routed back to
 * the contract list.
 *
 * Requirements: 11.3, 11.4, 18.7
 */
export default function BuatKontrakPage() {
  const { tenant } = useTenant();
  const router = useRouter();

  const [residents, setResidents] = useState<Resident[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    const tenantId = tenant.id || PRIMARY_TENANT_ID;

    dataSource.listResidents(tenantId).then(setResidents);

    // Rooms are listed per-property, so fetch every property's rooms and merge.
    dataSource.listProperties(tenantId).then((properties: Property[]) => {
      Promise.all(
        properties.map((property) => dataSource.listRooms(tenantId, property.id)),
      ).then((roomsByProperty) => setRooms(roomsByProperty.flat()));
    });
  }, [tenant.id]);

  const form = useZodForm(contractFormSchema, {
    defaultValues: {
      residentName: "",
      roomNumber: "",
      startDate: "",
      endDate: "",
      depositAmount: "",
      monthlyPrice: "",
    },
  });

  const {
    register,
    formState: { errors, isSubmitting },
  } = form;

  // Room options sorted by number so the select reads cleanly.
  const roomOptions = useMemo(
    () => [...rooms].sort((a, b) => a.number.localeCompare(b.number)),
    [rooms],
  );

  const onSubmit = submitHandler(form, () => {
    // Mock phase — no real persistence. Return to the list on success.
    router.push("/kontrak");
  });

  return (
    <FadeIn>
      <section className="flex max-w-xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Button variant="ghost" size="sm" iconLeft={ArrowLeft} asChild>
            <Link href="/kontrak">Kembali ke daftar</Link>
          </Button>
          <h1 className="font-display text-xl font-semibold text-foreground">
            Buat Kontrak
          </h1>
          <p className="text-sm text-muted-foreground">
            Hubungkan penghuni dengan kamar, lalu tentukan periode sewa, deposit, dan
            harga sewa per bulan. Tanggal selesai harus setelah tanggal mulai.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-0" />
          <CardContent>
            <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
              {/* Resident */}
              <FormField
                label="Penghuni"
                error={errors.residentName?.message}
                name="residentName"
              >
                <Select id="residentName" {...register("residentName")}>
                  <option value="">Pilih penghuni…</option>
                  {residents.map((resident) => (
                    <option key={resident.id} value={resident.fullName}>
                      {resident.fullName}
                    </option>
                  ))}
                </Select>
              </FormField>

              {/* Room */}
              <FormField
                label="Kamar"
                error={errors.roomNumber?.message}
                name="roomNumber"
              >
                <Select id="roomNumber" {...register("roomNumber")}>
                  <option value="">Pilih kamar…</option>
                  {roomOptions.map((room) => (
                    <option key={room.id} value={room.number}>
                      Kamar {room.number} — {room.type}
                    </option>
                  ))}
                </Select>
              </FormField>

              {/* Period */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              </div>

              {/* Money */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  label="Deposit (Rp)"
                  error={errors.depositAmount?.message}
                  name="depositAmount"
                >
                  <Input
                    id="depositAmount"
                    inputMode="numeric"
                    placeholder="Contoh: 1.500.000"
                    {...register("depositAmount")}
                  />
                </FormField>

                <FormField
                  label="Harga Sewa per Bulan (Rp)"
                  error={errors.monthlyPrice?.message}
                  name="monthlyPrice"
                >
                  <Input
                    id="monthlyPrice"
                    inputMode="numeric"
                    placeholder="Contoh: 1.500.000"
                    {...register("monthlyPrice")}
                  />
                </FormField>
              </div>

              <div className="mt-2 flex justify-end gap-3">
                <Button type="button" variant="ghost" asChild>
                  <Link href="/kontrak">{copy.aksi.batal}</Link>
                </Button>
                <Button type="submit" loading={isSubmitting}>
                  {copy.aksi.simpan}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </FadeIn>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                      */
/* -------------------------------------------------------------------------- */

/** A native select styled to match the themed {@link Input}. */
function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-input border border-line bg-card px-3 py-2 text-sm text-foreground transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

/** A labelled form field with an inline Bahasa Indonesia error message. */
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
