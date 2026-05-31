import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Themed Input — Task 6.2 (Req 2.8)
 * ---------------------------------
 * shadcn's Input re-skinned to the KosKita tokens: the 10px input radius, a
 * 1px warm hairline border (`--line`), the warm `--card` surface, and a
 * `--ring` focus ring. Keeps the native input prop contract unchanged.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-input border border-line bg-card px-3 py-2 text-sm text-foreground transition-colors",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
