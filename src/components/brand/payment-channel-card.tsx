"use client";

import {
  Banknote,
  CreditCard,
  type LucideIcon,
  QrCode,
  Store,
  Wallet,
} from "lucide-react";
import type { PaymentChannelView } from "@/lib/data";
import { cn } from "@/lib/utils";

/**
 * PaymentChannelCard — Task 7.4
 * -----------------------------
 * A selectable payment-channel option on the public payment page. It behaves
 * like a radio button: `role="radio"` + `aria-checked`, keyboard activatable
 * (Enter/Space), and calls `onSelect(channel.code)` on activation. The selected
 * state draws a pandan ring; a disabled channel (`enabled === false`) is dimmed
 * and non-interactive.
 *
 * Interactive, so it is marked "use client".
 *
 * Requirements: 2.7, 2.8
 */

export interface PaymentChannelCardProps {
  /** The channel to render. */
  channel: PaymentChannelView;
  /** Whether this channel is the currently selected one. */
  selected: boolean;
  /** Called with the channel `code` when the card is activated. */
  onSelect: (code: string) => void;
}

// Channel type -> Lucide icon (1.5px stroke enforced globally via svg.lucide).
const TYPE_ICON: Record<PaymentChannelView["type"], LucideIcon> = {
  qris: QrCode,
  va: CreditCard,
  ewallet: Wallet,
  retail: Store,
  manual: Banknote,
};

export function PaymentChannelCard({
  channel,
  selected,
  onSelect,
}: PaymentChannelCardProps) {
  const Icon = TYPE_ICON[channel.type];
  const disabled = !channel.enabled;

  const handleSelect = () => {
    if (!disabled) onSelect(channel.code);
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: a rich card (icon + name + fee) acts as a custom radio; keyboard activation and aria-checked are handled.
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      data-channel={channel.code}
      data-selected={selected || undefined}
      onClick={handleSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-card border bg-card p-4 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        selected
          ? "border-brand-pandan-600 ring-2 ring-brand-pandan-600"
          : "border-line hover:bg-brand-pandan-300/30",
        disabled && "cursor-not-allowed opacity-50 hover:bg-card",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-button",
          selected
            ? "bg-brand-pandan-600 text-primary-foreground"
            : "bg-muted text-brand-pandan-600",
        )}
      >
        <Icon className="lucide size-5" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium text-foreground">
          {channel.displayName}
        </span>
        {channel.feeLabel ? (
          <span className="truncate text-xs text-muted-foreground">
            {channel.feeLabel}
          </span>
        ) : null}
      </span>
    </button>
  );
}
