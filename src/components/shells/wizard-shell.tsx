"use client";

/**
 * WizardShell — Task 8.3
 * ----------------------
 * Onboarding layout: a left sidebar (desktop) / top panel (mobile) with the
 * anyaman motif, reassuring copy, and the WizardStepper component. The right /
 * center area is a single-column form focus zone wrapping {children}.
 *
 * The stepper's `steps` and `currentStepId` are passed as props.
 *
 * Requirements: 17.4, 7.7, 16.1
 */

import { BrandMark, WizardStepper } from "@/components/brand";
import { cn } from "@/lib/utils";

export interface WizardShellProps {
  children: React.ReactNode;
  /** Ordered list of wizard steps. */
  steps: { id: string; label: string }[];
  /** The id of the currently active step. */
  currentStepId: string;
}

export function WizardShell({ children, steps, currentStepId }: WizardShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background md:flex-row">
      {/* Reassurance panel — sidebar on desktop, top panel on mobile */}
      <aside
        className={cn(
          "flex flex-col items-center justify-center gap-6 bg-brand-pandan-300/40 px-6 py-8",
          "bg-anyaman md:w-80 md:py-12 lg:w-96",
        )}
      >
        <BrandMark size="md" />
        <p className="max-w-xs text-center font-display text-lg font-semibold text-foreground md:text-xl">
          Siapkan kos Anda dalam 5 menit
        </p>
        <p className="max-w-xs text-center text-sm text-muted-foreground">
          Ikuti langkah-langkah berikut untuk mulai mengelola properti kos Anda dengan
          mudah.
        </p>
        {/* Stepper — visible on desktop sidebar */}
        <div className="hidden w-full max-w-xs md:block">
          <WizardStepper steps={steps} currentStepId={currentStepId} />
        </div>
      </aside>

      {/* Main form area */}
      <div className="flex flex-1 flex-col">
        {/* Mobile stepper — visible below md */}
        <div className="border-b border-line bg-card px-4 py-3 md:hidden">
          <WizardStepper steps={steps} currentStepId={currentStepId} />
        </div>

        {/* Form content */}
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8 md:px-6 md:py-12">
          {children}
        </main>
      </div>
    </div>
  );
}
