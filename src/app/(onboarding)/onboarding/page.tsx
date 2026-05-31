"use client";

import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { copy } from "@/lib/locale/copy/id";
import { useOnboarding } from "@/lib/onboarding";

/**
 * Step 1: Daftar — Task 11.1
 * --------------------------
 * The wizard's first step: a light account-confirmation screen. The real
 * registration happens on the `/daftar` auth page; here the owner simply
 * confirms the name their workspace will use before continuing. The value is
 * persisted to the onboarding draft so it survives back/forward navigation.
 *
 * Requirements: 7.1, 7.2, 7.7
 */

export default function DaftarStepPage() {
  const router = useRouter();
  const { state, update } = useOnboarding();
  const c = copy.onboarding.daftar;

  return (
    <section className="flex flex-col gap-6">
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold">{c.judul}</h1>
        <p className="text-sm text-muted-foreground">{c.deskripsi}</p>
      </div>

      <div className="flex items-start gap-3 rounded-card border border-success/30 bg-success/10 px-4 py-3">
        <CheckCircle2
          className="lucide size-5 shrink-0 text-success"
          aria-hidden="true"
        />
        <p className="text-sm text-foreground">
          Akun Anda berhasil dibuat. Mari siapkan ruang kerja kos Anda.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="ownerName" className="text-sm font-medium">
          {c.namaLabel}
        </label>
        <Input
          id="ownerName"
          type="text"
          placeholder={c.namaPlaceholder}
          autoComplete="name"
          value={state.daftar.name}
          onChange={(e) => update("daftar", { name: e.target.value })}
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={() => router.push("/onboarding/paket")}>
          {copy.aksi.lanjut}
        </Button>
      </div>
    </section>
  );
}
