/**
 * Money (Rupiah → integer IDR) schema — Task 4.1
 * ----------------------------------------------
 * A reusable Zod schema for monetary form inputs. It accepts either a
 * Rupiah-formatted string (e.g. `"Rp 1.250.000"`, `"1.250.000"`, `"1250000"`)
 * or a raw `number`, and transforms the accepted value into an integer
 * {@link IDR} amount.
 *
 * Parsing of string inputs delegates to {@link parseRupiah}, which throws on
 * negative, fractional, or otherwise malformed values; the transform catches
 * that and converts it into a Zod issue using the Bahasa Indonesia messages
 * from the copy dictionary. Numeric inputs are validated directly.
 *
 * Requirements: 18.6
 */

import { z } from "zod";
import type { IDR } from "@/lib/data";
import { copy } from "@/lib/locale/copy/id";
import { parseRupiah } from "@/lib/locale/rupiah";

const { angkaTidakValid, nilaiNegatif } = copy.validasi;

/**
 * Detects whether a raw money string is expressing a negative value, so we can
 * surface the more specific "nilai negatif" message instead of the generic
 * "angka tidak valid". Handles an optional leading `Rp` before the sign.
 */
function looksNegative(input: string): boolean {
  return /^\s*(?:rp\s*)?-/i.test(input);
}

/**
 * `moneySchema` — parse a Rupiah string or number into a non-negative integer
 * IDR value, rejecting negative and non-integer inputs.
 *
 * Output type: `number` (integer IDR).
 */
export const moneySchema = z
  .union([z.string(), z.number()])
  .transform((value, ctx): IDR => {
    if (typeof value === "number") {
      if (!Number.isFinite(value) || !Number.isInteger(value)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: angkaTidakValid });
        return z.NEVER;
      }
      if (value < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: nilaiNegatif });
        return z.NEVER;
      }
      return value;
    }

    // String input — delegate to the shared Rupiah parser.
    try {
      return parseRupiah(value);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: looksNegative(value) ? nilaiNegatif : angkaTidakValid,
      });
      return z.NEVER;
    }
  });

/** Inferred output type for {@link moneySchema} (integer IDR). */
export type Money = z.infer<typeof moneySchema>;
