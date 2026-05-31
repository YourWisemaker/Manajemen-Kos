import { render, screen } from "@testing-library/react";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { pbtConfig } from "@/test/pbt";
import { computeOccupancyPct, OccupancyMeter } from "./occupancy-meter";

/**
 * OccupancyMeter tests — Task 7.5
 * -------------------------------
 * Property: `computeOccupancyPct` equals `round(occupied/total*100)` clamped to
 * 0–100 for all valid inputs, and total <= 0 yields 0.
 *
 * Validates: Requirements 2.6
 */

describe("computeOccupancyPct math (Req 2.6)", () => {
  it("equals round(occupied/total*100) clamped to 0-100 (property)", () => {
    // **Validates: Requirements 2.6**
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100_000 }),
        fc.integer({ min: 1, max: 100_000 }),
        (occupied, total) => {
          const expected = Math.min(
            100,
            Math.max(0, Math.round((occupied / total) * 100)),
          );
          expect(computeOccupancyPct(occupied, total)).toBe(expected);
        },
      ),
      pbtConfig,
    );
  });

  it("returns 0 when total <= 0 (property)", () => {
    // **Validates: Requirements 2.6**
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100_000 }),
        fc.integer({ min: -100_000, max: 0 }),
        (occupied, total) => {
          expect(computeOccupancyPct(occupied, total)).toBe(0);
        },
      ),
      pbtConfig,
    );
  });

  it("always returns a value within the 0-100 range (property)", () => {
    // **Validates: Requirements 2.6**
    fc.assert(
      fc.property(
        fc.integer({ min: -100_000, max: 200_000 }),
        fc.integer({ min: -100_000, max: 100_000 }),
        (occupied, total) => {
          const pct = computeOccupancyPct(occupied, total);
          expect(pct).toBeGreaterThanOrEqual(0);
          expect(pct).toBeLessThanOrEqual(100);
        },
      ),
      pbtConfig,
    );
  });

  it("clamps occupied > total to 100%", () => {
    expect(computeOccupancyPct(12, 10)).toBe(100);
  });
});

describe("OccupancyMeter render (Req 2.6)", () => {
  it("exposes the computed percentage via the progressbar role", () => {
    render(<OccupancyMeter occupied={5} total={10} />);
    const meter = screen.getByRole("progressbar");
    expect(meter).toHaveAttribute("aria-valuenow", "50");
    expect(meter).toHaveAttribute("aria-valuemin", "0");
    expect(meter).toHaveAttribute("aria-valuemax", "100");
  });

  it("shows the occupied/total label", () => {
    render(<OccupancyMeter occupied={5} total={10} />);
    expect(screen.getByText("5/10 kamar")).toBeInTheDocument();
  });
});
