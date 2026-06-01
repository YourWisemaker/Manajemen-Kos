"use client";

import { Building2, MapPin } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { EmptyState, OccupancyMeter } from "@/components/brand";
import { CardSkeleton, FadeIn } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { type Property } from "@/lib/data";
import copy from "@/lib/locale/copy/id";
import { listProperties } from "./actions";

/**
 * Property list page — Task 13.1
 * ------------------------------
 * Displays all properties for the current tenant as a responsive grid of
 * cards. Each card shows name, address, city, and occupancy (occupied/total).
 * Clicking a card navigates to the property detail view with its rooms.
 *
 * Requirements: 9.1, 21.1, 21.2, 21.3
 */
export default function PropertiPage() {
  const [properties, setProperties] = useState<Property[] | null>(null);

  useEffect(() => {
    listProperties().then(setProperties);
  }, []);

  // Loading state
  if (properties === null) {
    return (
      <section className="flex flex-col gap-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Properti</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </section>
    );
  }

  // Empty state
  if (properties.length === 0) {
    return (
      <section className="flex flex-col gap-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Properti</h1>
        <EmptyState
          illustration="kamar"
          title={copy.kosong.kamar.judul}
          description="Tambahkan properti pertama untuk mulai mengelola kos Anda."
          action={{ label: "Tambah Properti", href: "/properti" }}
        />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Properti</h1>
      <FadeIn>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <Link
              key={property.id}
              href={`/properti/${property.id}`}
              className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-card"
            >
              <Card className="h-full transition-shadow group-hover:shadow-warm-md">
                <CardContent className="flex flex-col gap-3 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-badge bg-secondary">
                      <Building2 className="lucide size-5 text-brand-pandan-600" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <h2 className="font-display text-base font-semibold leading-tight text-foreground">
                        {property.name}
                      </h2>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="lucide size-3" aria-hidden="true" />
                        {property.city}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {property.address}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">
                      {property.occupiedRooms}/{property.totalRooms} kamar terisi
                    </span>
                    <OccupancyMeter
                      occupied={property.occupiedRooms}
                      total={property.totalRooms}
                    />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </FadeIn>
    </section>
  );
}
