"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * EmptyState — Task 7.4
 * ---------------------
 * A branded empty/zero-data state: a simple line + flat-fill spot illustration
 * (drawn from the brand palette via semantic `fill-*`/`stroke-*` tokens — no
 * stocky 3D, no emoji), a title, a description, and an optional primary action
 * rendered as a {@link Button} (a link when `href` is provided).
 *
 * Illustrations are inline SVGs keyed by surface so empty states feel
 * intentional and crafted. The anyaman weave is hinted subtly in the
 * background of each mark.
 *
 * Requirements: 2.7, 2.8, 21.3
 */

/** Which spot illustration to render. */
export type EmptyIllustration = "kamar" | "penghuni" | "tagihan" | "laporan" | "umum";

export interface EmptyStateProps {
  /** Selects the spot illustration. */
  illustration: EmptyIllustration;
  /** Short heading. */
  title: string;
  /** Supporting guidance copy. */
  description: string;
  /** Optional primary action; renders a link when `href` is set. */
  action?: { label: string; href?: string; onClick?: () => void };
  /** Optional extra classes merged onto the wrapper. */
  className?: string;
}

/**
 * Shared illustration frame: a soft pandan-tinted rounded square with a subtle
 * anyaman (diagonal weave) hint, hosting the per-surface line art.
 */
function IllustrationFrame({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="96"
      height="96"
      viewBox="0 0 96 96"
      fill="none"
      role="img"
      aria-hidden="true"
      className="text-brand-pandan-600"
    >
      <title>Ilustrasi</title>
      {/* Backing tile in the pandan tint. */}
      <rect
        x="4"
        y="4"
        width="88"
        height="88"
        rx="18"
        className="fill-secondary stroke-line"
        strokeWidth="1.5"
      />
      {/* Subtle anyaman weave hint. */}
      <g className="stroke-brand-pandan-600" strokeWidth="1" opacity="0.18">
        <path d="M14 34 L34 14 M22 42 L42 22 M30 50 L50 30" />
        <path d="M82 62 L62 82 M74 54 L54 74 M66 46 L46 66" />
      </g>
      {children}
    </svg>
  );
}

// Per-surface line + flat-fill marks. Each uses brand-palette tokens.
const ILLUSTRATIONS: Record<EmptyIllustration, React.ReactNode> = {
  // Kamar: an open door / room frame.
  kamar: (
    <g strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
      <rect
        x="34"
        y="30"
        width="28"
        height="40"
        rx="2"
        className="fill-card stroke-brand-pandan-600"
      />
      <path d="M34 70 H62" className="stroke-brand-pandan-900" />
      <circle cx="56" cy="50" r="2" className="fill-brand-kunyit stroke-none" />
    </g>
  ),
  // Penghuni: a person bust.
  penghuni: (
    <g strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
      <circle cx="48" cy="42" r="9" className="fill-card stroke-brand-pandan-600" />
      <path
        d="M32 68 C32 56 64 56 64 68"
        className="fill-card stroke-brand-pandan-600"
      />
    </g>
  ),
  // Tagihan: a document with lines.
  tagihan: (
    <g strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
      <path
        d="M36 28 H54 L62 36 V68 H36 Z"
        className="fill-card stroke-brand-pandan-600"
      />
      <path d="M54 28 V36 H62" className="stroke-brand-pandan-900" />
      <path d="M42 46 H56 M42 54 H56 M42 62 H50" className="stroke-brand-kunyit" />
    </g>
  ),
  // Laporan: a bar chart.
  laporan: (
    <g strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M32 66 H66" className="stroke-brand-pandan-900" />
      <rect x="38" y="50" width="7" height="16" className="fill-brand-pandan-300 stroke-brand-pandan-600" />
      <rect x="50" y="42" width="7" height="24" className="fill-brand-kunyit stroke-brand-pandan-600" />
      <rect x="62" y="34" width="7" height="32" className="fill-brand-pandan-600 stroke-brand-pandan-600" />
    </g>
  ),
  // Umum: a generic folder/box.
  umum: (
    <g strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
      <path
        d="M30 38 H44 L48 44 H66 V66 H30 Z"
        className="fill-card stroke-brand-pandan-600"
      />
    </g>
  ),
};

export function EmptyState({
  illustration,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      <IllustrationFrame>{ILLUSTRATIONS[illustration]}</IllustrationFrame>
      <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ? (
        action.href ? (
          <Button asChild className="mt-1">
            <a href={action.href}>{action.label}</a>
          </Button>
        ) : (
          <Button className="mt-1" onClick={action.onClick}>
            {action.label}
          </Button>
        )
      ) : null}
    </div>
  );
}
