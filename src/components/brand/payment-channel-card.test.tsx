import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { PaymentChannelView } from "@/lib/mock/types";
import { PaymentChannelCard } from "./payment-channel-card";

/**
 * PaymentChannelCard smoke tests — Task 7.5
 * -----------------------------------------
 * Light interaction checks: selecting the row calls `onSelect` with the
 * channel code, and a disabled channel does not.
 *
 * Validates: Requirements 2.7
 */

const QRIS: PaymentChannelView = {
  code: "QRIS",
  type: "qris",
  displayName: "QRIS",
  feeLabel: "Gratis biaya admin",
  enabled: true,
};

describe("PaymentChannelCard (Req 2.7)", () => {
  it("renders the channel name and fee label", () => {
    render(<PaymentChannelCard channel={QRIS} selected={false} onSelect={vi.fn()} />);
    expect(screen.getByText("QRIS")).toBeInTheDocument();
    expect(screen.getByText("Gratis biaya admin")).toBeInTheDocument();
  });

  it("calls onSelect with the channel code on click", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<PaymentChannelCard channel={QRIS} selected={false} onSelect={onSelect} />);
    await user.click(screen.getByRole("radio"));
    expect(onSelect).toHaveBeenCalledWith("QRIS");
  });

  it("reflects the selected state via aria-checked", () => {
    render(<PaymentChannelCard channel={QRIS} selected onSelect={vi.fn()} />);
    expect(screen.getByRole("radio")).toHaveAttribute("aria-checked", "true");
  });

  it("does not fire onSelect when disabled", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const disabled: PaymentChannelView = { ...QRIS, enabled: false };
    render(
      <PaymentChannelCard channel={disabled} selected={false} onSelect={onSelect} />,
    );
    await user.click(screen.getByRole("radio"));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
