import type * as React from "react";
import { formatRupiah } from "@/lib/locale/rupiah";
import { cn } from "@/lib/utils";

/**
 * RupiahText — Task 7.1
 * ---------------------
 * The single, canonical way to render a monetary amount in the app. It formats
 * an integer IDR value through {@link formatRupiah} and renders it in JetBrains
 * Mono with tabular figures (the `.tabular-figures` utility) so amounts align
 * in columns. All money display flows through this component rather than ad-hoc
 * string building.
 *
 * Server-safe: this is a pure presentational component with no interactivity,
 * so it is intentionally NOT marked "use client".
 *
 * Requirements: 2.4, 3.6
 */

/** Font-size step for the rendered amount. */
type RupiahSize = "sm" | "md" | "lg" | "xl";

/** Color tone; `success`/`danger` map to the named status tokens. */
type RupiahTone = "default" | "muted" | "success" | "danger";

export interface RupiahTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Integer rupiah amount (no decimals in IDR display). */
  amount: number;
  /** Font-size step. Defaults to `md`. */
  size?: RupiahSize;
  /** Color tone. Defaults to `default` (inherits current text color). */
  tone?: RupiahTone;
  /** When true (default), prefixes the amount with `Rp `. */
  showSymbol?: boolean;
}

// Size step -> Tailwind text-size utilities.
const SIZE_CLASS: Record<RupiahSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-xl font-semibold",
};

// Tone -> semantic color utilities (success/danger use the status tokens).
const TONE_CLASS: Record<RupiahTone, string> = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  success: "text-success",
  danger: "text-danger",
};

export function RupiahText({
  amount,
  size = "md",
  tone = "default",
  showSymbol = true,
  className,
  ...props
}: RupiahTextProps) {
  return (
    <span
      className={cn("tabular-figures", SIZE_CLASS[size], TONE_CLASS[tone], className)}
      {...props}
    >
      {formatRupiah(amount, { showSymbol })}
    </span>
  );
}
