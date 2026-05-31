/**
 * Rupiah (IDR) formatting and parsing — Task 2.1
 * ----------------------------------------------
 * Pure, framework-free locale utilities for Indonesian currency. All display
 * of money in the app flows through {@link formatRupiah} (via the `RupiahText`
 * component) so formatting stays consistent and ad-hoc string building is
 * avoided.
 *
 * IDR has no sub-unit in everyday display, so amounts are treated as integer
 * rupiah with `id-ID` grouping (period thousands separators, no decimals):
 *   1250000 -> "Rp 1.250.000"  (showSymbol: true, default)
 *   1250000 -> "1.250.000"     (showSymbol: false)
 *
 * Requirements: 3.1, 3.2, 3.3, 3.5
 */

/** Options accepted by {@link formatRupiah}. */
export interface FormatRupiahOptions {
  /** When true (default) the result is prefixed with `"Rp "`. */
  showSymbol?: boolean;
}

// Reused formatter instance: id-ID grouping with no fractional digits.
const idrFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

/**
 * A valid Rupiah integer string is either a run of plain digits ("1250000")
 * or a properly grouped value where every separator splits exactly three
 * digits ("1.250.000"). Decimal-style periods ("1250.5"), comma fractions
 * ("1.250,50"), signs, and letters all fall outside this pattern and are
 * therefore rejected by {@link parseRupiah}.
 */
const INTEGER_OR_GROUPED = /^(?:\d+|\d{1,3}(?:\.\d{3})+)$/;

/**
 * Format an integer IDR amount as an `id-ID` grouped string.
 *
 * @param amount - Integer rupiah amount. Must be a finite number.
 * @param opts - Formatting options; `showSymbol` defaults to `true`.
 * @returns e.g. `"Rp 1.250.000"` or, with `showSymbol: false`, `"1.250.000"`.
 * @throws {TypeError} If `amount` is not a finite number.
 */
export function formatRupiah(amount: number, opts: FormatRupiahOptions = {}): string {
  const { showSymbol = true } = opts;
  if (!Number.isFinite(amount)) {
    throw new TypeError(
      `Jumlah rupiah harus berupa angka berhingga, diterima: ${amount}`,
    );
  }
  const grouped = idrFormatter.format(amount);
  return showSymbol ? `Rp ${grouped}` : grouped;
}

/**
 * Parse a Rupiah-formatted string back into an integer IDR value.
 *
 * Strips an optional leading `"Rp"`, all whitespace, and period thousands
 * separators. The cleaned value must represent a non-negative integer.
 *
 * @param input - A Rupiah string such as `"Rp 1.250.000"`, `"1.250.000"`, or `"1250000"`.
 * @returns The corresponding non-negative integer IDR value.
 * @throws {TypeError} If `input` is not a string.
 * @throws {Error} If the value is negative, fractional, or otherwise not a
 *   valid Rupiah integer (e.g. contains a decimal/comma fraction or letters).
 */
export function parseRupiah(input: string): number {
  if (typeof input !== "string") {
    throw new TypeError(`Input rupiah harus berupa string, diterima: ${typeof input}`);
  }

  // Drop an optional leading "Rp" symbol, then remove all whitespace.
  const cleaned = input.trim().replace(/^rp/i, "").replace(/\s+/g, "");

  if (cleaned === "" || !INTEGER_OR_GROUPED.test(cleaned)) {
    throw new Error(`Nilai rupiah tidak valid: "${input}"`);
  }

  // Periods here are confirmed thousands separators; strip them and parse.
  return Number.parseInt(cleaned.replace(/\./g, ""), 10);
}
