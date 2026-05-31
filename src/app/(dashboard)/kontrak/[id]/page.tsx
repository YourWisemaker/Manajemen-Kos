"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { RupiahText, StatusBadge } from "@/components/brand";
import { CardSkeleton, FadeIn, NotFound } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatTanggal } from "@/lib/locale/datetime";
import { type Contract, dataSource, PRIMARY_TENANT_ID } from "@/lib/mock";
import { useTenant } from "@/lib/tenant";
import { PrintableContract } from "../printable-contract";

/**
 * Contract detail — Task 16.1 / 16.2
 * ----------------------------------
 * Shows the full detail of a single contract: parties (resident), room, the
 * locked monthly price and deposit (both via {@link RupiahText}), the rental
 * period (Asia/Jakarta), and the status. A "Cetak" action reveals the
 * print-friendly contract document ({@link PrintableContract}) and triggers
 * `window.print()`. Unknown ids render the branded {@link NotFound} state.
 *
 * Requirements: 11.2, 11.5, 21.4
 */
export default function ContractDetailPage() {
  const params = useParams<{ id: string }>();
  const contractId = params.id;
  const { tenant } = useTenant();

  // `undefined` = loading, `null` = not found, otherwise the contract.
  const [contract, setContract] = useState<Contract | null | undefined>(undefined);

  useEffect(() => {
    const tenantId = tenant.id || PRIMARY_TENANT_ID;
    dataSource.listContracts(tenantId).then((contracts) => {
      setContract(contracts.find((c) => c.id === contractId) ?? null);
    });
  }, [tenant.id, contractId]);

  if (contract === undefined) {
    return (
      <section className="flex max-w-2xl flex-col gap-6">
        <div className="h-8 w-48 animate-shimmer rounded-sm bg-muted" />
        <CardSkeleton />
      </section>
    );
  }

  if (contract === null) {
    return <NotFound backHref="/kontrak" />;
  }

  return (
    <FadeIn>
      <section className="flex max-w-2xl flex-col gap-6">
        {/* Back link + heading */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div className="flex flex-col gap-2">
            <Button variant="ghost" size="sm" iconLeft={ArrowLeft} asChild>
              <Link href="/kontrak">Kembali ke daftar</Link>
            </Button>
            <h1 className="font-display text-xl font-semibold text-foreground">
              Detail Kontrak
            </h1>
          </div>
          <Button iconLeft={Printer} onClick={() => window.print()}>
            Cetak
          </Button>
        </div>

        {/* On-screen detail card (hidden when printing — the print layout
            below renders the formal document instead). */}
        <Card className="print:hidden">
          <CardHeader className="flex-row items-center justify-between">
            <span className="font-display text-base font-semibold text-foreground">
              {contract.residentName}
            </span>
            <StatusBadge status={contract.status} />
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <DetailSection title="Penghuni">
              <p className="text-sm font-medium">{contract.residentName}</p>
            </DetailSection>

            <DetailSection title="Kamar">
              <p className="text-sm">{contract.roomNumber}</p>
            </DetailSection>

            <DetailSection title="Harga Sewa per Bulan">
              <RupiahText amount={contract.monthlyPrice} size="md" />
            </DetailSection>

            <DetailSection title="Deposit">
              <RupiahText amount={contract.depositAmount} size="md" />
            </DetailSection>

            <DetailSection title="Periode Sewa">
              <p className="text-sm">
                {formatTanggal(contract.startDate)} – {formatTanggal(contract.endDate)}
              </p>
            </DetailSection>

            <DetailSection title="Status">
              <StatusBadge status={contract.status} />
            </DetailSection>
          </CardContent>
        </Card>

        {/* Print-only formal contract document. */}
        <PrintableContract contract={contract} tenantName={tenant.name} />
      </section>
    </FadeIn>
  );
}

/** A labelled detail field used on the on-screen detail card. */
function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </span>
      {children}
    </div>
  );
}
