import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Themed Badge — Task 6.2
 * -----------------------
 * A small, generic label primitive at the design's 8px badge radius
 * (`rounded-badge`). Deliberately kept generic here: Task 7's `StatusBadge`
 * builds on top of this base to map entity statuses to the named status
 * tokens. Colors come from the semantic design tokens.
 *
 * Requirements: 2.8, 1.6
 */
const badgeVariants = cva(
  cn(
    "inline-flex items-center gap-1 rounded-badge border px-2.5 py-0.5",
    "font-sans text-xs font-medium transition-colors",
    "[&_svg]:size-3 [&_svg]:shrink-0",
  ),
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/10 text-primary",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        destructive: "border-transparent bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
