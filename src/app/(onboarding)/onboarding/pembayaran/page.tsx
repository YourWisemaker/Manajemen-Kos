"use client";

import { Check, Loader2, QrCode } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { copy } from "@/lib/locale/copy/id";
import { useOnboarding } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

/**
 * Step 4: Hubungkan Pembayaran — Task 11.1 / 11.2
 * -----------------------------------------------
 * Visual gateway-connection stub. Shows Xendit and Midtrans as selectable
 * cards and a QRIS-default-on note. The "Hubungkan" button simulates a
 * connection (a brief loading state, then a success state with a check) with
 * no real integration. The selected gateway + connection result are persisted
 * to the onboarding draft.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.5
 */

const c = copy.onboarding.pembayaran;

interface GatewayOption {
  id: string;
  name: string;
  description: string;
}

const GATEWAYS: GatewayOption[] = [
  {
    id: "xendit",
    name: "Xendit",
    description: "Terima pembayaran via VA, QRIS, e-wallet, dan kartu kredit.",
  },
  {
    id: "midtrans",
    name: "Midtrans",
    description: "Gateway pembayaran populer dengan dukungan banyak metode.",
  },
];

type ConnectionState = "idle" | "connecting" | "connected";

export default function HubungkanPembayaranPage() {
  const router = useRouter();
  const { state, update } = useOnboarding();
  const selectedGateway = state.pembayaran.gateway;
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    state.pembayaran.connected ? "connected" : "idle",
  );

  const handleConnect = useCallback(() => {
    setConnectionState("connecting");
    // Simulate a brief connection delay, then mark connected (visual stub).
    setTimeout(() => {
      setConnectionState("connected");
      update("pembayaran", { connected: true });
    }, 1200);
  }, [update]);

  return (
    <section className="flex flex-col gap-6">
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold">{c.judul}</h1>
        <p className="text-sm text-muted-foreground">{c.deskripsi}</p>
      </div>

      {/* QRIS is enabled by default for every tenant. */}
      <div className="flex items-center gap-2 rounded-card border border-line bg-muted/40 px-4 py-3">
        <QrCode
          className="lucide size-4 shrink-0 text-brand-pandan-600"
          aria-hidden="true"
        />
        <span className="text-sm text-muted-foreground">{c.qrisAktif}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {GATEWAYS.map((gateway) => {
          const isSelected = selectedGateway === gateway.id;
          return (
            <Card
              key={gateway.id}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onClick={() => {
                if (connectionState === "idle") {
                  update("pembayaran", { gateway: gateway.id });
                }
              }}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && connectionState === "idle") {
                  e.preventDefault();
                  update("pembayaran", { gateway: gateway.id });
                }
              }}
              className={cn(
                "cursor-pointer transition-all duration-150",
                isSelected
                  ? "border-brand-pandan-600 ring-2 ring-brand-pandan-600 ring-offset-2 ring-offset-background"
                  : "hover:border-brand-pandan-300",
                connectionState !== "idle" && "pointer-events-none opacity-80",
              )}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{gateway.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{gateway.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Connection status */}
      {connectionState === "connected" && (
        <div className="flex items-center gap-2 rounded-card border border-success/30 bg-success/10 px-4 py-3">
          <span className="flex size-6 items-center justify-center rounded-full bg-success text-white">
            <Check className="lucide size-4" />
          </span>
          <span className="text-sm font-medium text-success">
            {GATEWAYS.find((g) => g.id === selectedGateway)?.name} {c.terhubungSuffix}
          </span>
        </div>
      )}

      {connectionState === "connecting" && (
        <div className="flex items-center gap-2 px-4 py-3">
          <Loader2 className="lucide size-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{c.menghubungkan}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/onboarding/properti")}
        >
          {copy.aksi.kembali}
        </Button>
        <div className="flex gap-2">
          {connectionState !== "connected" && (
            <Button
              type="button"
              onClick={handleConnect}
              loading={connectionState === "connecting"}
            >
              {c.hubungkan}
            </Button>
          )}
          {connectionState === "connected" && (
            <Button onClick={() => router.push("/onboarding/tim")}>
              {copy.aksi.lanjut}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
