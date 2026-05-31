import { cn } from "@/lib/utils";

/**
 * OccupancyMeter — Task 7.3
 * -------------------------
 * Renders the ratio of occupied rooms to total rooms as a labeled bar with a
 * percentage. The computed percentage is exposed accessibly via an ARIA
 * `progressbar` role with `aria-valuenow/min/max`.
 *
 * Math is defensive:
 *  - `total = 0` yields 0% (no divide-by-zero).
 *  - the percentage is rounded and clamped to the 0–100 range, so an
 *    `occupied` greater than `total` still reports 100%.
 *
 * Server-safe pure component — not marked "use client".
 *
 * Requirements: 2.6, 2.8
 */

export interface OccupancyMeterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of occupied rooms. */
  occupied: number;
  /** Total number of rooms. */
  total: number;
}

/**
 * Compute the occupancy percentage: `round(occupied / total * 100)` clamped to
 * 0–100, with `total <= 0` defined as 0%. Pure and exported for testing.
 */
export function computeOccupancyPct(occupied: number, total: number): number {
  if (total <= 0) return 0;
  const pct = Math.round((occupied / total) * 100);
  return Math.min(100, Math.max(0, pct));
}

export function OccupancyMeter({
  occupied,
  total,
  className,
  ...props
}: OccupancyMeterProps) {
  const pct = computeOccupancyPct(occupied, total);

  return (
    <div className={cn("flex flex-col gap-1.5", className)} {...props}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="tabular-figures text-sm text-foreground">
          {occupied}/{total} kamar
        </span>
        <span className="tabular-figures text-sm font-semibold text-foreground">
          {pct}%
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Tingkat okupansi"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
