import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { copy } from "@/lib/locale/copy/id";
import { TrialBanner } from "./trial-banner";

/**
 * TrialBanner tests — Task 11.2
 * -----------------------------
 * Verifies the post-onboarding trial banner: it states the trial ends in 14
 * days by default, honours a custom `daysRemaining`, and can be dismissed.
 *
 * Validates: Requirements 7.6
 */

describe("TrialBanner (Req 7.6)", () => {
  it("states the trial ends in 14 days by default", () => {
    render(<TrialBanner />);
    const { prefix, hari } = copy.onboarding.trial;
    expect(screen.getByText(`${prefix} 14 ${hari}`)).toBeInTheDocument();
  });

  it("renders a custom number of remaining days", () => {
    render(<TrialBanner daysRemaining={3} />);
    const { prefix, hari } = copy.onboarding.trial;
    expect(screen.getByText(`${prefix} 3 ${hari}`)).toBeInTheDocument();
  });

  it("can be dismissed", () => {
    render(<TrialBanner />);
    const dismiss = screen.getByRole("button", { name: copy.onboarding.trial.tutup });
    fireEvent.click(dismiss);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
