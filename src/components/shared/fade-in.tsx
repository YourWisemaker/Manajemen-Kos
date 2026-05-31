"use client";

/**
 * FadeIn — Task 8.5
 * -----------------
 * Fades content in on mount (opacity 0→1, translateY 8px→0, 200ms ease-out)
 * without layout shift. Respects prefers-reduced-motion by skipping the
 * animation entirely (renders immediately visible).
 *
 * Requirements: 21.2
 */

import { cn } from "@/lib/utils";

export interface FadeInProps {
  children: React.ReactNode;
  /** Optional extra classes merged onto the wrapper. */
  className?: string;
}

export function FadeIn({ children, className }: FadeInProps) {
  return (
    <div className={cn("animate-fade-up motion-reduce:animate-none", className)}>
      {children}
    </div>
  );
}
