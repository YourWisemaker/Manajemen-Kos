import { WizardShell } from "@/components/shells/wizard-shell";
import { MockTenantProvider } from "@/lib/tenant";

/**
 * Onboarding route group layout — Task 8.4
 * -----------------------------------------
 * Wraps onboarding pages in MockTenantProvider + WizardShell with a
 * placeholder stepper config. The actual step routing and dynamic
 * currentStepId will be wired in Task 11.
 *
 * Requirements: 17.5, 17.6
 */

const ONBOARDING_STEPS = [
  { id: "daftar", label: "Daftar" },
  { id: "paket", label: "Pilih Paket" },
  { id: "properti", label: "Buat Properti" },
  { id: "pembayaran", label: "Hubungkan Pembayaran" },
  { id: "tim", label: "Undang Staff" },
];

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <MockTenantProvider>
      <WizardShell steps={ONBOARDING_STEPS} currentStepId="daftar">
        {children}
      </WizardShell>
    </MockTenantProvider>
  );
}
