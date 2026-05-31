"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useZodForm } from "@/lib/forms/use-zod-form";
import { copy } from "@/lib/locale/copy/id";
import { useOnboarding } from "@/lib/onboarding";
import { monthlyPriceSchema, nonEmptyTrimmed } from "@/lib/schemas/primitives";

/**
 * Step 3: Buat Properti — Task 11.1 / 11.2
 * ----------------------------------------
 * Form: property name, address, city, number of rooms, room type, and monthly
 * price. Uses RHF+Zod with inline Bahasa Indonesia error messages and blocks
 * advancement while the form is invalid. Entered values are persisted to the
 * onboarding draft (via a `watch` subscription) so back/forward navigation
 * keeps them.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

const c = copy.onboarding.properti;

const onboardingPropertySchema = z.object({
  name: nonEmptyTrimmed,
  address: nonEmptyTrimmed,
  city: nonEmptyTrimmed,
  totalRooms: z
    .string()
    .trim()
    .min(1, copy.validasi.tidakBolehKosong)
    .refine((v) => /^\d+$/.test(v) && Number.parseInt(v, 10) > 0, {
      message: c.jumlahKamarTidakValid,
    }),
  roomType: nonEmptyTrimmed,
  monthlyPrice: monthlyPriceSchema,
});

export default function BuatPropertiPage() {
  const router = useRouter();
  const { state, update } = useOnboarding();
  const {
    register,
    watch,
    makeSubmitHandler,
    formState: { errors, isSubmitting },
  } = useZodForm({
    schema: onboardingPropertySchema,
    defaultValues: state.properti,
  });

  // Persist every change into the onboarding draft so navigating back/forward
  // (or refreshing) keeps the entered values.
  useEffect(() => {
    const subscription = watch((values) => {
      update("properti", {
        name: values.name ?? "",
        address: values.address ?? "",
        city: values.city ?? "",
        totalRooms: values.totalRooms ?? "",
        roomType: values.roomType ?? "",
        monthlyPrice: (values.monthlyPrice as string | undefined) ?? "",
      });
    });
    return () => subscription.unsubscribe();
  }, [watch, update]);

  const onSubmit = makeSubmitHandler(() => {
    router.push("/onboarding/pembayaran");
  });

  return (
    <section className="flex flex-col gap-6">
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold">{c.judul}</h1>
        <p className="text-sm text-muted-foreground">{c.deskripsi}</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {/* Property Name */}
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium">
            {c.namaLabel}
          </label>
          <Input
            id="name"
            type="text"
            placeholder={c.namaPlaceholder}
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          {errors.name && (
            <p role="alert" className="text-xs text-danger">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Address */}
        <div className="space-y-1.5">
          <label htmlFor="address" className="text-sm font-medium">
            {c.alamatLabel}
          </label>
          <Input
            id="address"
            type="text"
            placeholder={c.alamatPlaceholder}
            aria-invalid={!!errors.address}
            {...register("address")}
          />
          {errors.address && (
            <p role="alert" className="text-xs text-danger">
              {errors.address.message}
            </p>
          )}
        </div>

        {/* City */}
        <div className="space-y-1.5">
          <label htmlFor="city" className="text-sm font-medium">
            {c.kotaLabel}
          </label>
          <Input
            id="city"
            type="text"
            placeholder={c.kotaPlaceholder}
            aria-invalid={!!errors.city}
            {...register("city")}
          />
          {errors.city && (
            <p role="alert" className="text-xs text-danger">
              {errors.city.message}
            </p>
          )}
        </div>

        {/* Number of Rooms */}
        <div className="space-y-1.5">
          <label htmlFor="totalRooms" className="text-sm font-medium">
            {c.jumlahKamarLabel}
          </label>
          <Input
            id="totalRooms"
            type="text"
            inputMode="numeric"
            placeholder={c.jumlahKamarPlaceholder}
            aria-invalid={!!errors.totalRooms}
            {...register("totalRooms")}
          />
          {errors.totalRooms && (
            <p role="alert" className="text-xs text-danger">
              {errors.totalRooms.message}
            </p>
          )}
        </div>

        {/* Room Type */}
        <div className="space-y-1.5">
          <label htmlFor="roomType" className="text-sm font-medium">
            {c.tipeLabel}
          </label>
          <Input
            id="roomType"
            type="text"
            placeholder={c.tipePlaceholder}
            aria-invalid={!!errors.roomType}
            {...register("roomType")}
          />
          {errors.roomType && (
            <p role="alert" className="text-xs text-danger">
              {errors.roomType.message}
            </p>
          )}
        </div>

        {/* Monthly Price */}
        <div className="space-y-1.5">
          <label htmlFor="monthlyPrice" className="text-sm font-medium">
            {c.hargaLabel}
          </label>
          <Input
            id="monthlyPrice"
            type="text"
            inputMode="numeric"
            placeholder={c.hargaPlaceholder}
            aria-invalid={!!errors.monthlyPrice}
            {...register("monthlyPrice")}
          />
          {errors.monthlyPrice && (
            <p role="alert" className="text-xs text-danger">
              {errors.monthlyPrice.message}
            </p>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/onboarding/paket")}
          >
            {copy.aksi.kembali}
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {copy.aksi.lanjut}
          </Button>
        </div>
      </form>
    </section>
  );
}
