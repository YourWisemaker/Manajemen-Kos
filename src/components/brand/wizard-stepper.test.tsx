import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WizardStepper } from "./wizard-stepper";

/**
 * WizardStepper smoke tests — Task 7.5
 * ------------------------------------
 * Light render checks: every step label renders and the current step is
 * marked via `aria-current="step"`.
 *
 * Validates: Requirements 2.7
 */

const STEPS = [
  { id: "daftar", label: "Daftar" },
  { id: "paket", label: "Pilih Paket" },
  { id: "properti", label: "Buat Properti" },
  { id: "pembayaran", label: "Hubungkan Pembayaran" },
  { id: "tim", label: "Undang Staff" },
];

describe("WizardStepper (Req 2.7)", () => {
  it("renders every step label", () => {
    render(<WizardStepper steps={STEPS} currentStepId="properti" />);
    for (const step of STEPS) {
      expect(screen.getByText(step.label)).toBeInTheDocument();
    }
  });

  it("marks the current step with aria-current=step", () => {
    render(<WizardStepper steps={STEPS} currentStepId="properti" />);
    const current = screen.getByText("Buat Properti").closest("li");
    expect(current).toHaveAttribute("aria-current", "step");
  });

  it("marks only one step as current", () => {
    const { container } = render(
      <WizardStepper steps={STEPS} currentStepId="properti" />,
    );
    expect(container.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
  });
});
