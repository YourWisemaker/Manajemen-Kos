"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { EmptyState, RupiahText, StatusBadge } from "@/components/brand";
import { FadeIn, ListSkeleton } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type Contract } from "@/lib/data";
import { formatTanggal } from "@/lib/locale/datetime";
import { listContracts } from "./actions";

/**
 * Digital Contracts list — Task 16.1
 * ----------------------------------
 * Lists every contract for the active tenant with the resident name, room
 * number, rental period (date range formatted in Asia/Jakarta via
 * {@link formatTanggal}), and a {@link StatusBadge} for the contract status
 * (aktif / berakhir / diputus). Loading shows skeletons; content fades in on
 * resolve; an {@link EmptyState} guides creating the first contract when there
 * are none. Each row links to the contract detail route `/kontrak/[id]`.
 *
 * Requirements: 11.1, 21.1, 21.2, 21.3
 */
export default function KontrakPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[] | null>(null);

  useEffect(() => {
    listContracts().then(setContracts);
  }, []);

  const isLoading = contracts === null;

  // Empty state: no contracts at all.
  if (!isLoading && contracts.length === 0) {
    return (
      <section className="flex flex-col gap-6">
        <PageHeader />
        <EmptyState
          illustration="umum"
          title="Belum ada kontrak"
          description="Buat kontrak pertama untuk mencatat perjanjian sewa dengan penghuni."
          action={{ label: "Buat Kontrak", href: "/kontrak/baru" }}
        />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader />

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : (
        <FadeIn>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Penghuni</TableHead>
                      <TableHead>Kamar</TableHead>
                      <TableHead className="hidden sm:table-cell">Periode</TableHead>
                      <TableHead className="hidden md:table-cell">Deposit</TableHead>
                      <TableHead className="hidden lg:table-cell">Harga/bln</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.map((contract) => (
                      <TableRow
                        key={contract.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/kontrak/${contract.id}`)}
                      >
                        <TableCell className="font-medium">
                          {contract.residentName}
                        </TableCell>
                        <TableCell>{contract.roomNumber}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {formatTanggal(contract.startDate)} –{" "}
                            {formatTanggal(contract.endDate)}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <RupiahText amount={contract.depositAmount} size="sm" />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <RupiahText amount={contract.monthlyPrice} size="sm" />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={contract.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}
    </section>
  );
}

/** Page title + the "Buat Kontrak" primary action linking to the form route. */
function PageHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="font-display text-xl font-semibold text-foreground">Kontrak</h1>
      <Button iconLeft={Plus} asChild>
        <Link href="/kontrak/baru">Buat Kontrak</Link>
      </Button>
    </div>
  );
}
