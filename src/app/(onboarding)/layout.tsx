"use client";

import { usePathname } from "next/navigation";
import { WizardShell } from "@/components/shells/wizard-shell";
import { OnboardingProvider } from "@/lib/onboarding";
import { MockTenantProvider } from "@/lib/tenant";

/**
 * Onboarding route group layout — Task 11.1
 * ------------------------------------------
 * Wraps onboarding pages in MockTenantProvider + OnboardingProvider +
 * WizardShell. The current step is derived from the pathname (`usePathname`)
 * so the WizardStepper highlights the actual active step and marks earlier
 * steps complete. The OnboardingProvider persists entered values across the
 * step routes so back/forward navigation keeps the draft.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.7, 17.5, 17.6
 */

const ONBOARDING_STEPS = [
  { id: "daftar", label: "Daftar" },
  { id: "paket", label: "Pilih Paket" },
  { id: "properti", label: "Buat Properti" },
  { id: "pembayaran", label: "Hubungkan Pembayaran" },
  { id: "tim", label: "Undang Staff" },
];

/** Map pathname segments to step IDs. */
const PATHNAME_TO_STEP: Record<string, string> = {
  "/onboarding": "daftar",
  "/onboarding/daftar": "daftar",
  "/onboarding/paket": "paket",
  "/onboarding/properti": "properti",
  "/onboarding/pembayaran": "pembayaran",
  "/onboarding/tim": "tim",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Resolve the current step from the pathname; default to "daftar" for the
  // /onboarding root (Step 1 — account confirmation).
  const currentStepId = PATHNAME_TO_STEP[pathname] ?? "daftar";

  return (
    <MockTenantProvider>
      <OnboardingProvider>
        <WizardShell steps={ONBOARDING_STEPS} currentStepId={currentStepId}>
          {children}
        </WizardShell>
      </OnboardingProvider>
    </MockTenantProvider>
  );
}
