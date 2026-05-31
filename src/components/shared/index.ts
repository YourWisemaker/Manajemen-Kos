/**
 * Shared primitives barrel — Task 8.5
 * ------------------------------------
 * Reusable error/empty/loading primitives used across all surfaces:
 *   - `Skeleton` / `CardSkeleton` / `ListSkeleton` — loading placeholders
 *   - `FadeIn` — fade-in-on-resolve wrapper (no layout shift)
 *   - `NotFound` — branded "Tidak ditemukan" state with a way back
 *   - `EmptyState` — re-exported from `@/components/brand` so the empty-state
 *     usage pattern (guidance copy + primary action) is available alongside
 *     the other feedback primitives.
 *
 * Requirements: 21.1, 21.2, 21.3, 21.4, 21.5
 */

export {
  type EmptyIllustration,
  EmptyState,
  type EmptyStateProps,
} from "@/components/brand";
export { FadeIn, type FadeInProps } from "./fade-in";
export { NotFound, type NotFoundProps } from "./not-found";
export {
  CardSkeleton,
  type CardSkeletonProps,
  ListSkeleton,
  type ListSkeletonProps,
  Skeleton,
  type SkeletonProps,
} from "./skeleton";
