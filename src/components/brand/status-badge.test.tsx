import { render, screen } from "@testing-library/react";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { pbtConfig } from "@/test/pbt";
import {
  ENTITY_STATUSES,
  type EntityStatus,
  getStatusStyle,
  StatusBadge,
  type StatusTone,
} from "./status-badge";

/**
 * StatusBadge tests — Task 7.5
 * ----------------------------
 * Property: the status->tone mapping is total — every `EntityStatus` resolves
 * to a defined `StatusTone` and renders a non-empty label.
 *
 * Validates: Requirements 2.5
 */

// The closed set of allowed tone families.
const ALLOWED_TONES: StatusTone[] = ["success", "warning", "danger", "info", "neutral"];

describe("StatusBadge total mapping (Req 2.5)", () => {
  it("maps every ENTITY_STATUS to an allowed tone with a non-empty label", () => {
    // Exhaustive check over the exported status list.
    for (const status of ENTITY_STATUSES) {
      const { tone, label } = getStatusStyle(status);
      expect(ALLOWED_TONES).toContain(tone);
      expect(label.trim().length).toBeGreaterThan(0);
    }
  });

  it("maps any generated EntityStatus to an allowed tone (property)", () => {
    // **Validates: Requirements 2.5**
    fc.assert(
      fc.property(fc.constantFrom(...ENTITY_STATUSES), (status: EntityStatus) => {
        const { tone, label } = getStatusStyle(status);
        expect(ALLOWED_TONES).toContain(tone);
        expect(label.trim().length).toBeGreaterThan(0);
      }),
      pbtConfig,
    );
  });

  it("renders a non-empty label and tags the status for every status", () => {
    for (const status of ENTITY_STATUSES) {
      const { unmount } = render(<StatusBadge status={status} />);
      const badge = screen.getByText(getStatusStyle(status).label);
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute("data-status", status);
      unmount();
    }
  });
});
