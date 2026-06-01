"use client";

import { Check, Copy, ExternalLink, ScanLine, Upload } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { PaymentChannelCard, RupiahText, StatusBadge } from "@/components/brand";
import { FadeIn, NotFound } from "@/components/shared";
import { Skeleton } from "@/components/shared/skeleton";
import { PayShell } from "@/components/shells/pay-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { dataSource, type PaymentChannelView, type PublicInvoiceView } from "@/lib/data";
import { formatTanggal, relativeJatuhTempo } from "@/lib/locale/datetime";
import { cn } from "@/lib/utils";
import {
  type ChannelGroup,
  dummyBankAccount,
  dummyRetailCode,
  dummyVaNumber,
  groupChannels,
  qrPlaceholderMatrix,
} from "./payment-helpers";

/**
 * Public payment page (`/pay/[token]`) — Task 18
 * ----------------------------------------------
 * 18.1 — Mobile-first invoice view rendered inside `PayShell` with the tenant's
 * branding (logo + brand color) sourced from the `PublicInvoiceView`. Shows the
 * invoice summary: resident name, room label, line items + total via
 * `RupiahText`, and the due date with relative urgency. No authentication: this
 * route is in the `(public-pay)` group with no tenant provider/session.
 *
 * 18.2 — Payment channels grouped by type (QRIS / Virtual Account / E-Wallet /
 * Retail / Transfer Manual) via `PaymentChannelCard`. Selecting a channel
 * reveals a mocked instruction panel: a QR placeholder (QRIS), a VA number in
 * JetBrains Mono tabular figures with a copy affordance (VA), a "Lanjutkan ke
 * aplikasi" button (e-wallet), a payment code in tabular figures (retail), or
 * an upload-bukti stub + bank details (manual). Unknown tokens render the
 * branded `Tidak ditemukan` state with a way back rather than a raw error.
 *
 * This is the most performance- and polish-sensitive screen: it is kept light
 * (no charts, minimal client state) per the design's performance note.
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 21.4
 */
export default function PaymentPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  // `undefined` = loading; `null` = unknown token; otherwise the invoice view.
  const [invoice, setInvoice] = useState<PublicInvoiceView | null | undefined>(undefined);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setInvoice(undefined);
    setSelectedCode(null);
    dataSource.getInvoiceByToken(token).then((result) => {
      if (active) setInvoice(result);
    });
    return () => {
      active = false;
    };
  }, [token]);

  // Loading skeleton (no tenant branding yet — neutral PayShell).
  if (invoice === undefined) {
    return (
      <PayShell>
        <PaymentSkeleton />
      </PayShell>
    );
  }

  // Unknown token → branded "Tidak ditemukan" with a way back (Req 13.6, 21.4).
  if (invoice === null) {
    return (
      <PayShell>
        <NotFound />
      </PayShell>
    );
  }

  return (
    <PayShell
      tenantName={invoice.tenantName}
      logoUrl={invoice.tenantLogoUrl}
      brandColor={invoice.tenantBrandColor}
    >
      <FadeIn className="flex flex-col gap-6">
        <InvoiceSummary invoice={invoice} />
        <PaymentChannels
          token={token}
          invoice={invoice}
          selectedCode={selectedCode}
          onSelect={setSelectedCode}
        />
      </FadeIn>
    </PayShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Invoice summary (Req 13.2)                                                   */
/* -------------------------------------------------------------------------- */

function InvoiceSummary({ invoice }: { invoice: PublicInvoiceView }) {
  const relative = relativeJatuhTempo(invoice.dueDate);
  const isOverdue = relative.startsWith("Terlambat");
  const isToday = relative.includes("hari ini");

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 p-5">
        {/* Header: invoice number + status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Tagihan</span>
            <span className="font-mono text-sm font-medium text-foreground">
              {invoice.invoiceNumber}
            </span>
          </div>
          <StatusBadge status={invoice.status} />
        </div>

        {/* Resident + room */}
        <div className="flex flex-col gap-3 border-t border-line pt-4">
          <SummaryRow label="Penghuni" value={invoice.residentName} />
          <SummaryRow label="Kamar" value={invoice.roomLabel} />
        </div>

        {/* Line items */}
        <div className="flex flex-col gap-1 border-t border-line pt-4">
          <span className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Rincian
          </span>
          {invoice.lines.map((line) => (
            <div
              key={`${line.description}-${line.amount}`}
              className="flex items-center justify-between gap-3 py-1.5"
            >
              <span className="text-sm text-foreground">{line.description}</span>
              <RupiahText amount={line.amount} size="sm" tone="muted" />
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="flex items-center justify-between border-t border-line pt-4">
          <span className="text-sm font-semibold text-foreground">Total</span>
          <RupiahText amount={invoice.total} size="xl" />
        </div>

        {/* Due date with urgency */}
        <div className="flex items-center justify-between rounded-input bg-muted/40 px-4 py-3">
          <span className="text-sm text-muted-foreground">Jatuh tempo</span>
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium text-foreground">
              {formatTanggal(invoice.dueDate)}
            </span>
            <span
              className={cn(
                "text-xs",
                isOverdue
                  ? "font-medium text-danger"
                  : isToday
                    ? "font-medium text-warning-foreground"
                    : "text-muted-foreground",
              )}
            >
              {relative}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Payment channels grouped by type (Req 13.3)                                  */
/* -------------------------------------------------------------------------- */

interface PaymentChannelsProps {
  token: string;
  invoice: PublicInvoiceView;
  selectedCode: string | null;
  onSelect: (code: string) => void;
}

function PaymentChannels({
  token,
  invoice,
  selectedCode,
  onSelect,
}: PaymentChannelsProps) {
  const groups = useMemo(() => groupChannels(invoice.channels), [invoice.channels]);
  const selectedChannel = useMemo(
    () => invoice.channels.find((channel) => channel.code === selectedCode) ?? null,
    [invoice.channels, selectedCode],
  );

  return (
    <section className="flex flex-col gap-5">
      <h2 className="font-display text-lg font-semibold text-foreground">
        Pilih metode pembayaran
      </h2>

      {groups.map((group) => (
        <ChannelGroupBlock
          key={group.type}
          group={group}
          selectedCode={selectedCode}
          onSelect={onSelect}
        />
      ))}

      {/* Mocked instruction panel for the selected channel (Req 13.4). */}
      {selectedChannel ? (
        <ChannelInstructions
          token={token}
          channel={selectedChannel}
          tenantName={invoice.tenantName}
          total={invoice.total}
        />
      ) : (
        <p className="rounded-input border border-dashed border-line px-4 py-3 text-center text-sm text-muted-foreground">
          Pilih salah satu metode di atas untuk melihat instruksi pembayaran.
        </p>
      )}
    </section>
  );
}

function ChannelGroupBlock({
  group,
  selectedCode,
  onSelect,
}: {
  group: ChannelGroup;
  selectedCode: string | null;
  onSelect: (code: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {group.label}
      </h3>
      <div role="radiogroup" aria-label={group.label} className="flex flex-col gap-2">
        {group.channels.map((channel) => (
          <PaymentChannelCard
            key={channel.code}
            channel={channel}
            selected={selectedCode === channel.code}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Mocked instruction panels per channel type (Req 13.4)                        */
/* -------------------------------------------------------------------------- */

interface ChannelInstructionsProps {
  token: string;
  channel: PaymentChannelView;
  tenantName: string;
  total: number;
}

function ChannelInstructions({
  token,
  channel,
  tenantName,
  total,
}: ChannelInstructionsProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Instruksi pembayaran
          </span>
          <span className="font-display text-base font-semibold text-foreground">
            {channel.displayName}
          </span>
        </div>

        {channel.type === "qris" && <QrisPanel token={token} />}
        {channel.type === "va" && (
          <VaPanel value={dummyVaNumber(token, channel.code)} total={total} />
        )}
        {channel.type === "ewallet" && <EwalletPanel name={channel.displayName} />}
        {channel.type === "retail" && (
          <RetailPanel value={dummyRetailCode(token, channel.code)} />
        )}
        {channel.type === "manual" && (
          <ManualPanel account={dummyBankAccount(token, tenantName)} total={total} />
        )}
      </CardContent>
    </Card>
  );
}

/** QRIS — a synthetic, non-scannable QR-like placeholder. */
function QrisPanel({ token }: { token: string }) {
  const matrix = useMemo(() => qrPlaceholderMatrix(token), [token]);
  const size = matrix.length;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-card border border-line bg-white p-3">
        <svg
          width="200"
          height="200"
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label="Placeholder kode QRIS (contoh)"
          shapeRendering="crispEdges"
        >
          <title>Placeholder kode QRIS (contoh)</title>
          <rect width={size} height={size} fill="#ffffff" />
          {matrix.flatMap((row, r) =>
            row.map((filled, c) =>
              filled ? (
                <rect
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed-size decorative matrix
                  key={`${r}-${c}`}
                  x={c}
                  y={r}
                  width="1"
                  height="1"
                  fill="#1a1a1a"
                />
              ) : null,
            ),
          )}
        </svg>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ScanLine className="lucide size-4" aria-hidden="true" />
        <span>Scan dengan aplikasi apa pun</span>
      </div>
    </div>
  );
}

/** Virtual Account — a dummy VA number in tabular mono + copy affordance. */
function VaPanel({ value, total }: { value: string; total: number }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-muted-foreground">Nomor Virtual Account</span>
        <CopyableCode value={value} />
      </div>
      <div className="flex items-center justify-between rounded-input bg-muted/40 px-4 py-3">
        <span className="text-sm text-muted-foreground">Jumlah transfer</span>
        <RupiahText amount={total} size="md" />
      </div>
      <p className="text-xs text-muted-foreground">
        Buka aplikasi m-banking, pilih Transfer Virtual Account, lalu masukkan nomor di
        atas.
      </p>
    </div>
  );
}

/** E-wallet — a "Lanjutkan ke aplikasi" mocked button. */
function EwalletPanel({ name }: { name: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Anda akan diarahkan ke aplikasi {name} untuk menyelesaikan pembayaran.
      </p>
      <Button type="button" variant="accent" iconRight={ExternalLink} className="w-full">
        Lanjutkan ke aplikasi
      </Button>
    </div>
  );
}

/** Retail — a dummy payment code in tabular mono. */
function RetailPanel({ value }: { value: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-muted-foreground">Kode pembayaran</span>
        <CopyableCode value={value} />
      </div>
      <p className="text-xs text-muted-foreground">
        Tunjukkan kode ini di kasir gerai retail terdekat untuk menyelesaikan pembayaran.
      </p>
    </div>
  );
}

/** Manual transfer — bank account info + an upload-bukti stub. */
function ManualPanel({
  account,
  total,
}: {
  account: { bank: string; accountNumber: string; accountName: string };
  total: number;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-input border border-line p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Bank</span>
          <span className="text-sm font-medium text-foreground">{account.bank}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Nomor rekening</span>
          <CopyableCode value={account.accountNumber} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Atas nama</span>
          <span className="text-sm font-medium text-foreground">
            {account.accountName}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-line pt-3">
          <span className="text-sm text-muted-foreground">Jumlah transfer</span>
          <RupiahText amount={total} size="md" />
        </div>
      </div>

      {/* Upload-bukti stub (visual only). */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">Unggah bukti transfer</span>
        <label
          htmlFor="bukti-transfer"
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-input border border-dashed border-line bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground transition-colors hover:bg-muted/50"
        >
          <Upload className="lucide size-5" aria-hidden="true" />
          <span>Ketuk untuk memilih foto bukti transfer</span>
          <input id="bukti-transfer" type="file" accept="image/*" className="sr-only" />
        </label>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Copyable code (tabular mono + copy affordance — Req 13.4)                    */
/* -------------------------------------------------------------------------- */

function CopyableCode({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(value.replace(/\s/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable (e.g. insecure context) — fail silently.
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-input border border-line bg-card px-4 py-3">
      <span className="tabular-figures text-base font-semibold text-foreground">
        {value}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        iconLeft={copied ? Check : Copy}
        onClick={handleCopy}
        aria-label={copied ? "Disalin" : "Salin"}
      >
        {copied ? "Disalin" : "Salin"}
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Loading skeleton (Req 21.1)                                                  */
/* -------------------------------------------------------------------------- */

function PaymentSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <div className="flex flex-col gap-3 rounded-card border border-line bg-card p-5">
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="text" width="70%" />
        <Skeleton variant="text" width="55%" />
        <Skeleton variant="rectangle" width="100%" height="3rem" />
      </div>
      <Skeleton variant="text" width="50%" height="1.25rem" />
      <div className="flex flex-col gap-2">
        <Skeleton variant="rectangle" width="100%" height="4rem" />
        <Skeleton variant="rectangle" width="100%" height="4rem" />
        <Skeleton variant="rectangle" width="100%" height="4rem" />
      </div>
    </div>
  );
}
