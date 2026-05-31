"use client";

/**
 * PayShell — Task 8.2
 * -------------------
 * Minimal, distraction-free, mobile-first wrapper for the public payment page.
 * Shows tenant branding (BrandMark or tenant logo + brand color accent as a
 * thin top bar), wraps {children}, and renders a trust footer.
 *
 * No sidebar, no complex nav — just branded header + content + footer.
 *
 * Requirement: 17.3
 */

import { Lock } from "lucide-react";

import { BrandMark } from "@/components/brand";
import { useTenant } from "@/lib/tenant";
import { cn } from "@/lib/utils";

export interface PayShellProps {
  children: React.ReactNode;
}

export function PayShell({ children }: PayShellProps) {
  const { branding } = useTenant();

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Thin brand-color accent bar */}
      <div
        className="h-1 w-full"
        style={{ backgroundColor: branding.brandColor }}
        aria-hidden="true"
      />

      {/* Header */}
      <header className="flex items-center justify-center border-b border-line bg-card px-4 py-3">
        {branding.logoUrl ? (
          <img
            src={branding.logoUrl}
            alt={branding.name}
            className="h-8 w-auto object-contain"
          />
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
          <span>Pembayaran aman via KosKita</span>
        </div>
      </footer>
    </div>
  );
}
