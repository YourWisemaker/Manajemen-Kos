import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * WizardStepper — Task 7.4
 * ------------------------
 * The onboarding progress indicator. Renders every step with three visual
 * states derived from the position of `currentStepId` in the `steps` array:
 *
 *  - completed: steps before the current one — pandan fill + Lucide check.
 *  - current:   the active step — highlighted pandan ring + bold label, marked
 *               with `aria-current="step"` for assistive tech.
 *  - upcoming:  steps after the current one — muted/quiet.
 *
 * Mobile-first: on small screens labels are hidden and the indicators sit in a
 * compact row; from `sm` up the labels appear and connectors stretch between
 * steps. Server-safe pure component (no interactivity) — not "use client".
 *
 * Requirements: 2.7, 2.8
 */

/** A single wizard step descriptor. */
interface WizardStep {
  /** Stable identifier, matched against `currentStepId`. */
  id: string;
  /** Human-readable Bahasa Indonesia label. */
  label: string;
}

export interface WizardStepperProps {
  /** Ordered list of steps to display. */
  steps: WizardStep[];
  /** The `id` of the currently active step. */
  currentStepId: string;
  /** Optional extra classes merged onto the wrapper. */
  className?: string;
}

/** Visual state of a step relative to the current position. */
type StepState = "completed" | "current" | "upcoming";

export function WizardStepper({ steps, currentStepId, className }: WizardStepperProps) {
  // Resolve the active index; an unknown id falls back to the first step so the
  // component never renders an all-upcoming/all-completed ambiguous state.
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.id === currentStepId),
  );

  return (
    <ol
      className={cn("flex w-full items-center gap-1.5 sm:gap-2", className)}
      aria-label="Langkah onboarding"
    >
      {steps.map((step, index) => {
        const state: StepState =
          index < currentIndex
            ? "completed"
            : index === currentIndex
              ? "current"
              : "upcoming";
        const isLast = index === steps.length - 1;
        const stepNumber = index + 1;

        return (
          <li
            key={step.id}
            className="flex flex-1 items-center gap-1.5 sm:gap-2"
            aria-current={state === "current" ? "step" : undefined}
            data-state={state}
          >
            <span className="flex items-center gap-2">
              {/* Indicator: check when done, step number otherwise. */}
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                  state === "completed" &&
                    "border-brand-pandan-600 bg-brand-pandan-600 text-primary-foreground",
                  state === "current" &&
                    "border-brand-pandan-600 bg-brand-pandan-300 text-brand-pandan-900 ring-2 ring-brand-pandan-600 ring-offset-2 ring-offset-background",
                  state === "upcoming" && "border-line bg-muted text-muted-foreground",
                )}
              >
                {state === "completed" ? (
                  <Check className="lucide size-4" aria-hidden="true" />
                ) : (
                  <span className="tabular-figures">{stepNumber}</span>
                )}
              </span>
              {/* Label: hidden on the smallest screens to stay condensed. */}
              <span
                className={cn(
                  "hidden whitespace-nowrap text-sm sm:inline",
                  state === "current"
                    ? "font-semibold text-foreground"
                    : "font-medium text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </span>
            {/* Connector line to the next step (filled once passed). */}
            {!isLast ? (
              <span
                aria-hidden="true"
                className={cn(
                  "h-px flex-1 transition-colors",
                  state === "completed" ? "bg-brand-pandan-600" : "bg-line",
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
