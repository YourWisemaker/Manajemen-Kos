import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { formatRupiah } from "@/lib/locale/rupiah";
import { RupiahText } from "./rupiah-text";

/**
 * RupiahText tests — Task 7.5
 * ---------------------------
 * Unit: `RupiahText` renders the `formatRupiah` output and carries the
 * tabular/mono figures class so amounts align in columns.
 *
 * Validates: Requirements 2.4
 */

describe("RupiahText render (Req 2.4)", () => {
  it("renders the formatRupiah output with the symbol by default", () => {
    render(<RupiahText amount={1250000} />);
    const el = screen.getByText(formatRupiah(1250000));
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent("Rp 1.250.000");
  });

  it("carries the tabular-figures (mono/tabular) class", () => {
    render(<RupiahText amount={1250000} />);
    expect(screen.getByText(formatRupiah(1250000))).toHaveClass("tabular-figures");
  });

  it("omits the symbol when showSymbol is false", () => {
    render(<RupiahText amount={1250000} showSymbol={false} />);
    expect(
      screen.getByText(formatRupiah(1250000, { showSymbol: false })),
    ).toHaveTextContent("1.250.000");
  });

  it("applies the success tone class", () => {
    render(<RupiahText amount={500000} tone="success" />);
    expect(screen.getByText(formatRupiah(500000))).toHaveClass("text-success");
  });
});
