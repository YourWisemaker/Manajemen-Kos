import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import fc from "fast-check";
import { describe, expect, it, vi } from "vitest";
import type { PaymentChannelView } from "@/lib/mock/types";
import { pbtConfig } from "@/test/pbt";
import { computeOccupancyPct, OccupancyMeter } from "./occupancy-meter";
import { PaymentChannelCard } from "./payment-channel-card";
import { RupiahText } from "./rupiah-text";
import {
  ENTITY_STATUSES,
  type EntityStatus,
  getStatusStyle,
  StatusBadge,
} from "./status-badge";
import { WizardStepper } from "./wizard-stepper";

/**
 * Brand component tests — Task 7.5
 * --------------------------------
 * Property tests for the pure mapping/math logic (StatusBadge tone mapping,
 * OccupancyMeter percentage), plus focused unit tests for RupiahText output
 * and the interactive WizardStepper / PaymentChannelCard.
 *
 * Validates: Requirements 2.4, 2.5, 2.6
 */

// The named status tones StatusBadge is allowed to resolve to.
const KNOWN_TONES = ["success", "warning", "danger", "info", "neutral"] as const;

describe("StatusBadge maps every EntityStatus to a defined tone (Req 2.5)", () => {
  // Property: getStatusStyle is a total mapping — every entity status resolves
  // to a known tone and a non-empty label, and rendering surfaces both the
  // `data-status` attribute and the label text.
  // Validates: Requirements 2.5
  it("resolves every status to a known tone + non-empty label, and renders it", () => {
    fc.assert(
      fc.property(fc.constantFrom(...ENTITY_STATUSES), (status: EntityStatus) => {
        const style = getStatusStyle(status);

        // Tone is one of the named status families.
        expect(KNOWN_TONES).toContain(style.tone);
        // Label is a non-empty human-readable string.
        expect(typeof style.label).toBe("string");
        expect(style.label.trim().length).toBeGreaterThan(0);

        // Rendering exposes the raw status (for styling hooks) and the label.
        const { unmount } = render(<StatusBadge status={status} />);
        const badge = screen.getByText(style.label);
        expect(badge).toHaveAttribute("data-status", status);
        unmount();
      }),
      pbtConfig,
    );
  });

  it("covers all 13 declared statuses without gaps", () => {
    // Guards that the iterable used by the property matches the union size.
    expect(ENTITY_STATUSES).toHaveLength(13);
    for (const status of ENTITY_STATUSES) {
      expect(getStatusStyle(status)).toBeDefined();
    }
  });
});

describe("OccupancyMeter percentage is round+clamped (Req 2.6)", () => {
  // Property: computeOccupancyPct === round(occupied/total*100) clamped 0–100
  // for all valid inputs, with total=0 -> 0 and occupied>total -> 100.
  // Validates: Requirements 2.6
  it("equals round(occupied/total*100) clamped to 0–100 for all valid inputs", () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 100_000 }),
        fc.nat({ max: 100_000 }),
        (occupied, total) => {
          const pct = computeOccupancyPct(occupied, total);

          // Always within the clamped range.
          expect(pct).toBeGreaterThanOrEqual(0);
          expect(pct).toBeLessThanOrEqual(100);

          if (total <= 0) {
            // Divide-by-zero is defined as 0%.
            expect(pct).toBe(0);
          } else {
            const expected = Math.min(
              100,
              Math.max(0, Math.round((occupied / total) * 100)),
            );
            expect(pct).toBe(expected);
          }
        },
      ),
      pbtConfig,
    );
  });

  it("returns 0% when total is 0 (no divide-by-zero)", () => {
    expect(computeOccupancyPct(0, 0)).toBe(0);
    expect(computeOccupancyPct(5, 0)).toBe(0);
  });

  it("clamps to 100% when occupied exceeds total", () => {
    expect(computeOccupancyPct(12, 10)).toBe(100);
  });

  it("renders the ratio label and an accessible progressbar value", () => {
    render(<OccupancyMeter occupied={3} total={4} />);
    expect(screen.getByText("3/4 kamar")).toBeInTheDocument();
    const bar = screen.getByRole("progressbar", { name: "Tingkat okupansi" });
    expect(bar).toHaveAttribute("aria-valuenow", "75");
  });
});

describe("RupiahText renders formatRupiah output in tabular mono (Req 2.4)", () => {
  it("renders the formatted Rupiah string with the tabular-figures class", () => {
    render(<RupiahText amount={1250000} />);
    const el = screen.getByText("Rp 1.250.000");
    expect(el).toHaveClass("tabular-figures");
  });

  it("omits the symbol when showSymbol is false", () => {
    render(<RupiahText amount={1250000} showSymbol={false} />);
    const el = screen.getByText("1.250.000");
    expect(el).toHaveClass("tabular-figures");
  });
});

describe("WizardStepper marks current and completed steps", () => {
  const steps = [
    { id: "daftar", label: "Daftar" },
    { id: "paket", label: "Pilih Paket" },
    { id: "properti", label: "Buat Properti" },
  ];

  it("marks the active step with aria-current and earlier steps completed", () => {
    render(<WizardStepper steps={steps} currentStepId="paket" />);

    // Only the current step carries aria-current="step".
    const current = screen.getByText("Pilih Paket").closest("li");
    expect(current).toHaveAttribute("aria-current", "step");
    expect(current).toHaveAttribute("data-state", "current");

    // The earlier step is completed; the later step is upcoming.
    expect(screen.getByText("Daftar").closest("li")).toHaveAttribute(
      "data-state",
      "completed",
    );
    expect(screen.getByText("Buat Properti").closest("li")).toHaveAttribute(
      "data-state",
      "upcoming",
    );
  });
});

describe("PaymentChannelCard selection", () => {
  const channel: PaymentChannelView = {
    code: "QRIS",
    type: "qris",
    displayName: "QRIS",
    feeLabel: "Gratis biaya admin",
    enabled: true,
  };

  it("calls onSelect with the channel code when activated", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<PaymentChannelCard channel={channel} selected={false} onSelect={onSelect} />);

    await user.click(screen.getByRole("radio", { name: /QRIS/ }));
    expect(onSelect).toHaveBeenCalledWith("QRIS");
  });

  it("reflects the selected state via aria-checked and selected styling", () => {
    render(<PaymentChannelCard channel={channel} selected onSelect={() => {}} />);
    const radio = screen.getByRole("radio", { name: /QRIS/ });
    expect(radio).toHaveAttribute("aria-checked", "true");
    expect(radio).toHaveClass("border-brand-pandan-600");
  });

  it("does not call onSelect when the channel is disabled", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <PaymentChannelCard
        channel={{ ...channel, enabled: false }}
        selected={false}
        onSelect={onSelect}
      />,
    );
    await user.click(screen.getByRole("radio", { name: /QRIS/ }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
