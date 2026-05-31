/**
 * PayShell — Task 8.2
 * -------------------
 * Minimal, distraction-free, mobile-first wrapper for the PUBLIC payment page.
 * The payment page has no tenant provider / session, so branding is supplied
 * via PROPS (sourced from a `PublicInvoiceView`) rather than read from context.
 * When props are omitted it falls back to the KosKita brand defaults.
 *
 * Renders: a thin brand-color accent bar, a centered logo / tenant name header,
 * the {children} content column, and a trust footer.
 *
 * No hooks or interactivity → server component (no "use client").
 *
 * Requirement: 17.3
 */

import { Lock } from "lucide-react";

import { BrandMark } from "@/components/brand";
import { cn } from "@/lib/utils";

export interface PayShellProps {
  children: React.ReactNode;
  /** Tenant display name (used as logo alt / text fallback). */
  tenantName?: string;
  /** Optional tenant logo URL; falls back to the tenant name or BrandMark. */
  logoUrl?: string;
  /** Tenant brand-color accent (any CSS color). Falls back to the pandan token. */
  brandColor?: string;
}

export function PayShell({ children, tenantName, logoUrl, brandColor }: PayShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Thin brand-color accent bar (tenant color, else pandan token). */}
      <div
        className={cn("h-1 w-full", !brandColor && "bg-primary")}
        style={brandColor ? { backgroundColor: brandColor } : undefined}
        aria-hidden="true"
      />

      {/* Header — tenant logo, else tenant name, else KosKita BrandMark. */}
      <header className="flex items-center justify-center border-b border-line bg-card px-4 py-3">
        {logoUrl ? (
          // biome-ignore lint/performance/noImgElement: tenant logos are arbitrary external URLs not configured for next/image; a plain img keeps the public page dependency-free
          <img
            src={logoUrl}
            alt={tenantName ?? "Logo"}
            className="h-8 w-auto object-contain"
          />
        ) : tenantName ? (
          <span className="font-display text-lg font-semibold text-foreground">
            {tenantName}
          </span>
        ) : (
          <BrandMark size="sm" />
        )}
      </header>

      {/* Content */}
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6">
        {children}
      </main>

      {/* Trust footer */}
      <footer className="border-t border-line bg-card px-4 py-4">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Lock className="size-3.5" />
          <span>Pembayaran aman diproses oleh mitra pembayaran.</span>
        </div>
      </footer>
    </div>
  );
}
