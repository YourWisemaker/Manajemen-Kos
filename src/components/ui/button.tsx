"use client";

import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2, type LucideIcon } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Themed Button — Task 6.1
 * ------------------------
 * shadcn/ui's primitive re-skinned to the KosKita identity: pandan-green
 * primary, kunyit accent, warm ink outline, and the design's 10px button
 * radius (`rounded-button`). Variants and sizes are defined with
 * class-variance-authority; all colors come from the semantic design tokens
 * (`bg-primary`, `bg-accent`, `bg-destructive`, ...) — never hardcoded hex.
 *
 * Brand variants (Req 2.1): primary (default), accent, outline-ink, ghost,
 * danger. Sizes (Req 2.1): sm, md (default), lg.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.8
 */
const buttonVariants = cva(
  // Base: inline layout, smooth 150–200ms transitions, accessible focus ring,
  // disabled handling, and a consistent Lucide icon size (stroke is enforced
  // globally at 1.5px via `svg.lucide` in globals.css).
  cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-button",
    "font-sans font-medium transition-colors duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-[1.125em]",
  ),
  {
    variants: {
      variant: {
        // Signature pandan green — the default action.
        primary: "bg-primary text-primary-foreground shadow-warm-sm hover:bg-primary/90",
        // Kunyit accent — reserved for the single most important CTA.
        accent: "bg-accent text-accent-foreground shadow-warm-sm hover:bg-accent/90",
        // Transparent with a warm ink hairline; fills softly on hover.
        "outline-ink":
          "border border-ink-900/30 bg-transparent text-ink-900 hover:bg-ink-900/5",
        // Quiet — no border or fill until hover.
        ghost: "bg-transparent text-ink-900 hover:bg-ink-900/5",
        // Destructive (clay-red), for irreversible actions.
        danger:
          "bg-destructive text-destructive-foreground shadow-warm-sm hover:bg-destructive/90",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-11 px-6 text-base",
      },
    },
    defaultVariants: {
      // Req 2.2: omitting the variant applies the pandan-green primary.
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render the child element as the button (Radix Slot composition). */
  asChild?: boolean;
  /** Show a spinner and prevent activation while a task is in flight. */
  loading?: boolean;
  /** Lucide icon rendered before the label. */
  iconLeft?: LucideIcon;
  /** Lucide icon rendered after the label. */
  iconRight?: LucideIcon;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      iconLeft: IconLeft,
      iconRight: IconRight,
      disabled,
      type,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    // Req 2.3: a loading button is disabled so activation is prevented.
    const isDisabled = disabled || loading;

    return (
      <Comp
        ref={ref}
        // Only set the native type when rendering a real <button>; Slot forwards
        // to whatever element the consumer provides (e.g. an <a>).
        type={asChild ? undefined : (type ?? "button")}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={asChild ? undefined : isDisabled}
        aria-busy={loading || undefined}
        aria-disabled={asChild && isDisabled ? true : undefined}
        data-loading={loading || undefined}
        {...props}
      >
        {loading ? (
          <Loader2 className="lucide animate-spin" aria-hidden="true" />
        ) : (
          IconLeft && <IconLeft className="lucide" aria-hidden="true" />
        )}
        <Slottable>{children}</Slottable>
        {IconRight && !loading && <IconRight className="lucide" aria-hidden="true" />}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
