import { EmptyState } from "@/components/brand";
import { copy } from "@/lib/locale/copy/id";

/**
 * NotFound — Task 8.5
 * -------------------
 * Branded "Tidak ditemukan" state using the copy dictionary with the "umum"
 * EmptyState illustration and a "Kembali ke beranda" link.
 *
 * Server-safe — no "use client" needed.
 *
 * Requirements: 21.4, 21.5
 */

export interface NotFoundProps {
  /** Optional override for the back link href. Defaults to "/". */
  backHref?: string;
}

export function NotFound({ backHref = "/" }: NotFoundProps) {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center px-4">
      <EmptyState
        illustration="umum"
        title={copy.error.tidakDitemukanJudul}
        description={copy.error.tidakDitemukanDeskripsi}
        action={{
          label: copy.error.tidakDitemukanKembali,
          href: backHref,
        }}
      />
    </div>
  );
}
