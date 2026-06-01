import type { Contract } from "@/lib/data";
import { formatTanggal } from "@/lib/locale/datetime";
import { formatRupiah } from "@/lib/locale/rupiah";

/**
 * PrintableContract — Task 16.2
 * -----------------------------
 * A clean, print-friendly formal contract document (PERJANJIAN SEWA KAMAR
 * KOS) covering the parties, room, rental period, locked monthly price,
 * deposit, and signature lines — all in Bahasa Indonesia. Money is rendered
 * through {@link formatRupiah} in tabular mono figures.
 *
 * Print behaviour: on screen this block is hidden (`hidden`) and only the
 * caller's interactive detail card shows; when printing, the `print:block`
 * utilities reveal this document and the global `@media print` rules in
 * `globals.css` hide the app chrome so the page prints cleanly on its own.
 *
 * Server-safe pure component (no interactivity) — not marked "use client".
 *
 * Requirements: 11.5
 */

export interface PrintableContractProps {
  /** The contract to render as a formal document. */
  contract: Contract;
  /** The tenant (kos owner) name shown as the first party. */
  tenantName?: string;
}

export function PrintableContract({ contract, tenantName }: PrintableContractProps) {
  return (
    <article
      className="hidden print:block print:text-black"
      aria-label="Pratinjau cetak kontrak"
      data-testid="printable-contract"
    >
      {/* Document title */}
      <header className="mb-6 border-b border-ink-900/40 pb-4 text-center">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide">
          Perjanjian Sewa Kamar Kos
        </h2>
        <p className="mt-1 text-xs text-ink-600">
          Dokumen ini merupakan bukti perjanjian sewa yang sah antara kedua belah pihak.
        </p>
      </header>

      {/* Parties */}
      <section className="mb-5 text-sm leading-relaxed">
        <p className="mb-2">Perjanjian ini dibuat dan disepakati oleh:</p>
        <dl className="space-y-2">
          <div className="flex gap-2">
            <dt className="w-40 shrink-0 text-ink-600">Pihak Pertama (Pemilik)</dt>
            <dd className="font-medium">{tenantName ?? "Pemilik Kos"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-40 shrink-0 text-ink-600">Pihak Kedua (Penyewa)</dt>
            <dd className="font-medium">{contract.residentName}</dd>
          </div>
        </dl>
      </section>

      {/* Terms */}
      <section className="mb-6 text-sm">
        <h3 className="mb-2 font-semibold">Ketentuan Sewa</h3>
        <table className="w-full border-collapse">
          <tbody>
            <TermRow label="Kamar">{contract.roomNumber}</TermRow>
            <TermRow label="Tanggal Mulai">{formatTanggal(contract.startDate)}</TermRow>
            <TermRow label="Tanggal Berakhir">{formatTanggal(contract.endDate)}</TermRow>
            <TermRow label="Harga Sewa per Bulan">
              <span className="tabular-figures">
                {formatRupiah(contract.monthlyPrice)}
              </span>
            </TermRow>
            <TermRow label="Deposit">
              <span className="tabular-figures">
                {formatRupiah(contract.depositAmount)}
              </span>
            </TermRow>
          </tbody>
        </table>
      </section>

      {/* Signature lines */}
      <section className="mt-10 grid grid-cols-2 gap-8 text-center text-sm">
        <SignatureLine party="Pemilik Kos" name={tenantName ?? "Pemilik Kos"} />
        <SignatureLine party="Penyewa" name={contract.residentName} />
      </section>
    </article>
  );
}

/** A label/value row in the terms table. */
function TermRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="border-b border-ink-900/15">
      <th scope="row" className="w-1/2 py-2 text-left align-top font-normal text-ink-600">
        {label}
      </th>
      <td className="py-2 text-left font-medium">{children}</td>
    </tr>
  );
}

/** A signature block: space to sign above a printed name and party label. */
function SignatureLine({ party, name }: { party: string; name: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-ink-600">{party}</span>
      <div className="h-16" />
      <span className="w-full border-t border-ink-900/60 pt-1 font-medium">{name}</span>
    </div>
  );
}
