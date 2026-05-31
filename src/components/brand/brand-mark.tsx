import { cn } from "@/lib/utils";

/**
 * BrandMark — Task 7.4
 * --------------------
 * The KosKita logo: a small crafted inline SVG mark (a pitched roof / house
 * silhouette in pandan with a subtle kunyit anyaman-weave hint under the eave —
 * a quiet nod to Indonesian craft, never an emoji or stock 3D render) paired
 * with the "KosKita" wordmark set in the display typeface.
 *
 * Server-safe pure component — not marked "use client".
 *
 * Requirements: 2.7, 2.8
 */

/** Size step for the mark + wordmark. */
type BrandMarkSize = "sm" | "md" | "lg";

export interface BrandMarkProps {
  /** Visual size step. Defaults to `md`. */
  size?: BrandMarkSize;
  /** When true (default) the "KosKita" wordmark is shown beside the mark. */
  showWordmark?: boolean;
  /** Optional extra classes merged onto the wrapper. */
  className?: string;
}

// Size step -> mark px size + wordmark text utility.
const MARK_SIZE: Record<BrandMarkSize, number> = {
  sm: 24,
  md: 32,
  lg: 44,
};

const WORDMARK_CLASS: Record<BrandMarkSize, string> = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
};

export function BrandMark({
  size = "md",
  showWordmark = true,
  className,
}: BrandMarkProps) {
  const px = MARK_SIZE[size];

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        width={px}
        height={px}
        viewBox="0 0 48 48"
        fill="none"
        role="img"
        aria-label="KosKita"
        className="shrink-0"
      >
        <title>KosKita</title>
        {/* Rounded backing tile in the pandan tint. */}
        <rect
          x="2"
          y="2"
          width="44"
          height="44"
          rx="12"
          className="fill-brand-pandan-300"
        />
        {/* Pitched roof — the "rumah" silhouette in signature pandan. */}
        <path
          d="M24 11 L38 22 V23 H10 V22 Z"
          className="fill-brand-pandan-600"
          strokeLinejoin="round"
        />
        {/* House body. */}
        <path d="M13 23 H35 V37 H13 Z" className="fill-brand-pandan-900" />
        {/* Doorway, carved out to read as a home. */}
        <path d="M21 37 V29 H27 V37 Z" className="fill-brand-pandan-300" />
        {/* Anyaman-weave hint under the eave in warm kunyit. */}
        <g
          className="stroke-brand-kunyit"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.9"
        >
          <path d="M15 26 L19 30 M19 26 L15 30 M29 26 L33 30 M33 26 L29 30" />
        </g>
      </svg>
      {showWordmark ? (
        <span
          className={cn(
            "font-display font-semibold leading-none tracking-tight text-foreground",
            WORDMARK_CLASS[size],
          )}
        >
          KosKita
        </span>
      ) : null}
    </span>
  );
}
