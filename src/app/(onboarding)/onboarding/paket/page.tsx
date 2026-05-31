"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { RupiahText } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { copy } from "@/lib/locale/copy/id";
import { useOnboarding } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

/**
 * Step 2: Pilih Paket — Task 11.1 / 11.2
 * --------------------------------------
 * Displays three plan cards (Starter, Pro, Enterprise) with prices in Rupiah.
 * The user selects one plan (selection is required to advance) and clicks
 * "Lanjut" to proceed. The choice is persisted to the onboarding draft so it
 * survives back/forward navigation.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

interface PlanOption {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  popular?: boolean;
}

const PLANS: PlanOption[] = [
  {
    id: "starter",
    name: "Starter",
    price: 99000,
    description: "Untuk pemilik kos dengan 1 properti kecil.",
    features: [
      "Hingga 10 kamar",
      "Manajemen penghuni",
      "Tagihan & pembayaran",
      "Laporan dasar",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 249000,
    description: "Untuk pemilik kos dengan beberapa properti.",
    features: [
      "Hingga 50 kamar",
      "Multi-properti",
      "Template WhatsApp",
      "Laporan lengkap",
      "Undang 3 staff",
    ],
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 599000,
    description: "Untuk pengelola kos skala besar.",
    features: [
      "Kamar tak terbatas",
      "Multi-properti tak terbatas",
      "API & integrasi",
      "Dukungan prioritas",
      "Staff tak terbatas",
    ],
  },
];

export default function PilihPaketPage() {
  const router = useRouter();
  const { state, update } = useOnboarding();
  const c = copy.onboarding.paket;
  const selectedPlan = state.paket.selectedPlan;

  return (
    <section className="flex flex-col gap-6">
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold">{c.judul}</h1>
        <p className="text-sm text-muted-foreground">{c.deskripsi}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          return (
            <Card
              key={plan.id}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onClick={() => update("paket", { selectedPlan: plan.id })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  update("paket", { selectedPlan: plan.id });
                }
              }}
              className={cn(
                "relative cursor-pointer transition-all duration-150",
                isSelected
                  ? "border-brand-pandan-600 ring-2 ring-brand-pandan-600 ring-offset-2 ring-offset-background"
                  : "hover:border-brand-pandan-300",
              )}
            >
              {plan.popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-badge bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
                  {c.populer}
                </span>
              )}
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{plan.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{plan.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-1">
                  <RupiahText amount={plan.price} size="xl" showSymbol />
                  <span className="text-xs text-muted-foreground">{c.perBulan}</span>
                </div>
                <ul className="space-y-1.5">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <Check className="lucide size-3.5 shrink-0 text-success" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="ghost" onClick={() => router.push("/onboarding")}>
          {copy.aksi.kembali}
        </Button>
        <Button
          onClick={() => router.push("/onboarding/properti")}
          disabled={!selectedPlan}
        >
          {copy.aksi.lanjut}
        </Button>
      </div>
    </section>
  );
}
