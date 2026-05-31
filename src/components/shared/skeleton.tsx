import { cn } from "@/lib/utils";

/**
 * Skeleton — Task 8.5
 * -------------------
 * A shimmer placeholder that matches eventual layout shapes. Uses a warm
 * shimmer animation (not cold gray) via the brand paper/muted tokens.
 * Supports rectangle, circle, and text-line variants.
 *
 * `CardSkeleton` and `ListSkeleton` are composed placeholders that mirror the
 * common card / list layouts used across surfaces, so loading states preserve
 * the eventual layout and avoid shift.
 *
 * Respects prefers-reduced-motion by falling back to a static muted fill.
 *
 * Requirements: 21.1, 21.2
 */

export interface SkeletonProps {
  /** Shape variant. Defaults to "rectangle". */
  variant?: "rectangle" | "circle" | "text";
  /** Optional width (CSS value). Defaults to "100%". */
  width?: string;
  /** Optional height (CSS value). Defaults to "1rem" for text, "100%" otherwise. */
  height?: string;
  /** Optional extra classes. */
  className?: string;
}

export function Skeleton({
  variant = "rectangle",
  width,
  height,
  className,
}: SkeletonProps) {
  const defaultHeight = variant === "text" ? "0.875rem" : undefined;

  return (
    <div
      className={cn(
        "animate-shimmer bg-gradient-to-r from-muted via-paper-100 to-muted bg-[length:200%_100%]",
        "motion-reduce:animate-none motion-reduce:bg-muted",
        variant === "circle" && "rounded-full",
        variant === "rectangle" && "rounded-card",
        variant === "text" && "rounded-sm",
        className,
      )}
      style={{
        width: width ?? (variant === "circle" ? "2.5rem" : "100%"),
        height: height ?? defaultHeight ?? (variant === "circle" ? "2.5rem" : "3rem"),
      }}
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------------
// Composed skeletons
// ---------------------------------------------------------------------------

export interface CardSkeletonProps {
  /** Optional extra classes merged onto the card wrapper. */
  className?: string;
}

/**
 * A card-shaped placeholder: a title line, two body lines, and a footer chip —
 * matching the eventual `Card` content layout.
 */
export function CardSkeleton({ className }: CardSkeletonProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-card border border-line bg-card p-4",
        className,
      )}
    >
      <Skeleton variant="text" width="55%" height="1rem" />
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="80%" />
      <Skeleton variant="rectangle" width="40%" height="1.5rem" />
    </div>
  );
}

export interface ListSkeletonProps {
  /** Number of placeholder rows. Defaults to 5. */
  rows?: number;
  /** Optional extra classes merged onto the list wrapper. */
  className?: string;
}

/**
 * A list placeholder: rows of an avatar + two stacked text lines + a trailing
 * value — matching the eventual list / table-row layout.
 */
export function ListSkeleton({ rows = 5, className }: ListSkeletonProps) {
  return (
    <div
      className={cn(
        "divide-y divide-line rounded-card border border-line bg-card",
        className,
      )}
    >
      {Array.from({ length: rows }).map((_, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows
          key={index}
          className="flex items-center gap-3 p-4"
        >
          <Skeleton variant="circle" width="2.5rem" height="2.5rem" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="60%" />
          </div>
          <Skeleton variant="text" width="3.5rem" />
        </div>
      ))}
    </div>
  );
}
