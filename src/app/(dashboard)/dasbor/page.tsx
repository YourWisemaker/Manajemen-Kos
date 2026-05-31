import { Suspense } from "react";
import { DashboardTrialBannerSlot } from "./trial-banner-slot";

/**
 * Dashboard page — Task 11.2
 * --------------------------
 * Shows the trial banner at the top after onboarding completion (or while the
 * active tenant is on a trial). The full multi-property dashboard KPIs,
 * charts, and lists are built in Task 12.
 *
 * The banner slot reads the `?trial=baru` query flag, so it is wrapped in a
 * Suspense boundary as required for `useSearchParams` in the App Router.
 *
 * Requirements: 7.6
 */
export default function DasborPage() {
  return (
    <section className="flex flex-col gap-6">
      <Suspense fallback={null}>
        <DashboardTrialBannerSlot />
      </Suspense>
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold">Dasbor</h1>
        <p className="text-muted-foreground">
          Ringkasan multi-properti akan tampil di sini.
        </p>
      </div>
    </section>
  );
}
