"use client";

import { Clock, X } from "lucide-react";
import { useState } from "react";
import { copy } from "@/lib/locale/copy/id";
import { cn } from "@/lib/utils";

/**
 * TrialBanner — Task 11.2
 * -----------------------
 * A slim, dismissible banner shown at the top of the dashboard after
 * onboarding completion, informing the owner their free trial ends in N days
 * (14 by default). Uses the kunyit accent for warmth and gentle urgency. Copy
 * is sourced from the typed dictionary.
 *
 * Requirements: 7.6
 */

export interface TrialBannerProps {
  /** Days remaining in the trial. Defaults to 14 (a freshly-started trial). */
  daysRemaining?: number;
  /** Optional extra classes merged onto the wrapper. */
  className?: string;
}

export function TrialBanner({ daysRemaining = 14, className }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const c = copy.onboarding.trial;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-card border border-accent/30 bg-accent/10 px-4 py-2.5",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Clock className="lucide size-4 shrink-0 text-accent" aria-hidden="true" />
      <p className="text-sm font-medium text-foreground">
        {c.prefix} {daysRemaining} {c.hari}
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label={c.tutup}
        className="ml-auto flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent/20 hover:text-foreground"
      >
        <X className="lucide size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
