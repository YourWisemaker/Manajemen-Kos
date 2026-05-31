import { Suspense } from "react";
import { DashboardContent } from "./dashboard-content";
import { DashboardTrialBannerSlot } from "./trial-banner-slot";

/**
 * Dashboard page — Task 12 (Requirements 8.1–8.6, 21.1, 21.2, 21.3)
 * -----------------------------------------------------------------
 * The multi-property dashboard at `/dasbor`. This page is a thin shell that:
 *  1. Keeps the conditional trial-banner slot at the top (Task 11.2). The slot
 *     reads the `?trial=baru` query flag and the active tenant's trial status,
 *     so it is wrapped in a Suspense boundary as required for
 *     `useSearchParams` in the App Router.
 *  2. Renders {@link DashboardContent}, the client component that owns the
 *     KPIs, revenue trend chart, recent payments, and overdue invoices, plus
 *     the multi-property aggregate/per-property toggle and the empty state.
 *
 * Requirements: 7.6, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 21.1, 21.2, 21.3
 */
export default function DasborPage() {
  return (
    <section className="flex flex-col gap-6">
      <Suspense fallback={null}>
        <DashboardTrialBannerSlot />
      </Suspense>
      <DashboardContent />
    </section>
  );
}
