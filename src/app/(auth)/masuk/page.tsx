"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useZodForm } from "@/lib/forms/use-zod-form";
import { copy } from "@/lib/locale/copy/id";
import { emailSchema } from "@/lib/schemas/primitives";

/**
 * Login Page — Task 10.2
 * ----------------------
 * Split layout: warm-paper form panel (left) + anyaman reassurance sidebar
 * (right, hidden on mobile). Email/password + "Lanjut dengan Google" visual
 * stub. RHF+Zod inline Bahasa Indonesia validation. On successful mock login
 * (any non-empty email + password >= 8 chars), navigate to /dasbor.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.5
 */

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, copy.validasi.passwordMinimal),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function MasukPage() {
  const router = useRouter();
  const {
    register,
    makeSubmitHandler,
    formState: { errors, isSubmitting },
  } = useZodForm({
    schema: loginSchema,
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = makeSubmitHandler((_values: LoginValues) => {
    // Mock login: any valid email + password >= 8 chars → navigate to dashboard
    router.push("/dasbor");
  });

  return (
    <div className="flex min-h-dvh w-full">
      {/* Left panel: form */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <BrandMark size="md" />
            <h1 className="mt-6 text-2xl font-bold">Masuk ke akun Anda</h1>
            <p className="text-sm text-muted-foreground">
              Masukkan email dan kata sandi untuk melanjutkan.
            </p>
          </div>

          <form onSubmit={onSubmit} noValidate className="space-y-4">
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
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              {errors.password && (
                <p role="alert" className="text-xs text-danger">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              loading={isSubmitting}
            >
              Masuk
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

          {/* Link to register */}
          <p className="text-center text-sm text-muted-foreground">
            Belum punya akun?{" "}
            <Link href="/daftar" className="font-medium text-primary hover:underline">
              Daftar gratis
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
            Selamat datang kembali
          </h2>
          <p className="mt-3 max-w-xs text-sm text-ink-600">
            Kelola kos Anda dengan lebih efisien. Semua data aman dan selalu tersedia
            kapan saja.
          </p>
        </div>
      </div>
    </div>
  );
}
