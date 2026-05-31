import { ArrowDownRight, ArrowUpRight, type LucideIcon, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * StatCard — Task 7.4
 * -------------------
 * A KPI card for dashboards (okupansi, pendapatan, tunggakan, properti). Built
 * on the themed {@link Card}. Shows a label, a pre-formatted value, an optional
 * trend delta (up/down/flat with a tinted Lucide icon), and an optional accent
 * strip + icon tint drawn from the brand palette.
 *
 * The `value` is pre-formatted by the caller (e.g. a `RupiahText` output string
 * or "87%") so this component stays presentation-only and server-safe.
 *
 * Requirements: 2.7, 2.8
 */

/** Trend direction for the optional delta indicator. */
type DeltaDirection = "up" | "down" | "flat";

/** Brand accent applied to the strip + icon tint. */
type StatAccent = "pandan" | "kunyit" | "terracotta";

export interface StatCardProps {
  /** Short metric label, e.g. "Okupansi". */
  label: string;
  /** Pre-formatted metric value, e.g. "87%" or "Rp 12.500.000". */
  value: string;
  /** Optional period-over-period change indicator. */
  delta?: { direction: DeltaDirection; label: string };
  /** Optional Lucide icon shown top-right, tinted by `accent`. */
  icon?: LucideIcon;
  /** Optional brand accent for the left strip + icon tint. */
  accent?: StatAccent;
  /** Optional extra classes merged onto the card. */
  className?: string;
}

// Delta direction -> Lucide icon + tone color (success up, danger down, muted flat).
const DELTA_ICON: Record<DeltaDirection, LucideIcon> = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: Minus,
};

const DELTA_TONE: Record<DeltaDirection, string> = {
  up: "text-success",
  down: "text-danger",
  flat: "text-muted-foreground",
};

// Accent -> left strip background + icon tint (brand palette tokens).
const ACCENT_STRIP: Record<StatAccent, string> = {
  pandan: "bg-brand-pandan-600",
  kunyit: "bg-brand-kunyit",
  terracotta: "bg-brand-terracotta",
};

const ACCENT_ICON: Record<StatAccent, string> = {
  pandan: "text-brand-pandan-600",
  kunyit: "text-brand-kunyit",
  terracotta: "text-brand-terracotta",
};

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  accent,
  className,
}: StatCardProps) {
  const DeltaIcon = delta ? DELTA_ICON[delta.direction] : null;

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      {/* Optional accent strip down the left edge. */}
      {accent ? (
        <span
          aria-hidden="true"
          className={cn("absolute inset-y-0 left-0 w-1", ACCENT_STRIP[accent])}
        />
      ) : null}
      <CardContent className="flex flex-col gap-2 p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          {Icon ? (
            <Icon
              className={cn(
                "lucide size-5",
                accent ? ACCENT_ICON[accent] : "text-muted-foreground",
              )}
              aria-hidden="true"
            />
          ) : null}
        </div>
        <span className="font-display text-2xl font-semibold leading-tight tracking-tight text-foreground">
          {value}
        </span>
        {delta && DeltaIcon ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-sm font-medium",
              DELTA_TONE[delta.direction],
            )}
          >
            <DeltaIcon className="lucide size-4" aria-hidden="true" />
            {delta.label}
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}
