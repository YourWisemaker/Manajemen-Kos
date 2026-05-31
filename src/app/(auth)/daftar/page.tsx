"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useZodForm } from "@/lib/forms/use-zod-form";
import { copy } from "@/lib/locale/copy/id";
import { emailSchema, nonEmptyTrimmed } from "@/lib/schemas/primitives";

/**
 * Registration Page — Task 10.2
 * -----------------------------
 * Split layout: warm-paper form panel (left) + anyaman reassurance sidebar
 * (right, hidden on mobile). Full name, email, password, confirm password.
 * RHF+Zod validation. On successful mock registration, navigate to the
 * onboarding wizard (which begins at the Daftar step at /onboarding).
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

const registerSchema = z
  .object({
    fullName: nonEmptyTrimmed,
    email: emailSchema,
    password: z.string().min(8, copy.validasi.passwordMinimal),
    confirmPassword: z.string().min(1, copy.validasi.wajibDiisi),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi kata sandi tidak cocok.",
    path: ["confirmPassword"],
  });

type RegisterValues = z.infer<typeof registerSchema>;

export default function DaftarPage() {
  const router = useRouter();
  const {
    register,
    makeSubmitHandler,
    formState: { errors, isSubmitting },
  } = useZodForm({
    schema: registerSchema,
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = makeSubmitHandler((_values: RegisterValues) => {
    // Mock registration: enter the onboarding wizard at its first step (Daftar).
    router.push("/onboarding");
  });

  return (
    <div className="flex min-h-dvh w-full">
      {/* Left panel: form */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <BrandMark size="md" />
            <h1 className="mt-6 text-2xl font-bold">Buat akun baru</h1>
            <p className="text-sm text-muted-foreground">
              Mulai kelola kos Anda secara digital dalam 5 menit.
            </p>
          </div>

          <form onSubmit={onSubmit} noValidate className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="text-sm font-medium">
                Nama Lengkap
              </label>
              <Input
                id="fullName"
                type="text"
                placeholder="Nama lengkap Anda"
                autoComplete="name"
                aria-invalid={!!errors.fullName}
                {...register("fullName")}
              />
              {errors.fullName && (
                <p role="alert" className="text-xs text-danger">
                  {errors.fullName.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                autoComplete="email"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              {errors.email && (
                <p role="alert" className="text-xs text-danger">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Kata Sandi
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Minimal 8 karakter"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              {errors.password && (
                <p role="alert" className="text-xs text-danger">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Konfirmasi Kata Sandi
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Ulangi kata sandi"
                autoComplete="new-password"
                aria-invalid={!!errors.confirmPassword}
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p role="alert" className="text-xs text-danger">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              variant="accent"
              size="md"
              className="w-full"
              loading={isSubmitting}
            >
              Daftar Gratis
            </Button>
          </form>

          {/* Google stub */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-line" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">atau</span>
            </div>
          </div>

          <Button variant="outline-ink" size="md" className="w-full" type="button">
            Lanjut dengan Google
          </Button>

          {/* Link to login */}
          <p className="text-center text-sm text-muted-foreground">
            Sudah punya akun?{" "}
            <Link href="/masuk" className="font-medium text-primary hover:underline">
              Masuk
            </Link>
          </p>
        </div>
      </div>

      {/* Right panel: anyaman reassurance sidebar (hidden on mobile) */}
      <div className="relative hidden w-[45%] max-w-md lg:block">
        <div className="absolute inset-0 bg-gradient-pandan opacity-[0.06]" />
        <div className="absolute inset-0 bg-anyaman opacity-[0.05]" />
        <div className="relative flex h-full flex-col items-center justify-center p-10 text-center">
          <h2 className="text-2xl font-bold text-brand-pandan-900">
            Mulai perjalanan digital Anda
          </h2>
          <p className="mt-3 max-w-xs text-sm text-ink-600">
            Bergabung dengan ratusan pemilik kos yang sudah beralih ke manajemen modern.
            Trial gratis 14 hari, tanpa kartu kredit.
          </p>
        </div>
      </div>
    </div>
  );
}
