"use client";

import { useSearchParams } from "next/navigation";
import { TrialBanner } from "@/components/brand";
import { relativeJatuhTempo } from "@/lib/locale/datetime";
import { useTenant } from "@/lib/tenant";

/**
 * Dashboard trial-banner slot — Task 11.2
 * ---------------------------------------
 * Decides whether to surface the {@link TrialBanner} on the dashboard. The
 * onboarding wizard finishes to `/dasbor?trial=baru`, so the banner appears
 * right after completion (Req 7.6). It also appears whenever the active mock
 * tenant is itself on a trial, deriving the remaining days from `trialEndsAt`
 * when available (falling back to a fresh 14-day trial otherwise).
 *
 * Client-only: reads the query flag (`useSearchParams`) and tenant context
 * (`useTenant`). Wrapped in a Suspense boundary by the page.
 *
 * Requirements: 7.6
 */

/** Whole days from now until the given ISO date (clamped at 0). */
function daysUntil(iso: string): number {
  const message = relativeJatuhTempo(iso);
  const match = message.match(/(\d+)\s+hari lagi/);
  if (match) return Number.parseInt(match[1], 10);
  // "hari ini" or already past — no days remaining.
  return 0;
}

export function DashboardTrialBannerSlot() {
  const searchParams = useSearchParams();
  const { tenant } = useTenant();

  const justOnboarded = searchParams.get("trial") === "baru";
  const tenantOnTrial = tenant.status === "trial";

  if (!justOnboarded && !tenantOnTrial) return null;

  // A freshly-onboarded tenant starts a 14-day trial; an existing trial tenant
  // shows its real remaining days when a trial end date is known.
  const daysRemaining =
    !justOnboarded && tenant.trialEndsAt ? daysUntil(tenant.trialEndsAt) : 14;

  return <TrialBanner daysRemaining={daysRemaining} />;
}
