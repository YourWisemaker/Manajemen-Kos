/**
 * Contract (kontrak) date-range schema — Task 4.1
 * -----------------------------------------------
 * Validates a contract's rental period: the end date must be strictly after
 * the start date, with both dates interpreted on the Asia/Jakarta calendar
 * (WIB has no DST, so a civil-day comparison is stable regardless of the
 * machine timezone).
 *
 * Requirement: 18.7
 */

import { z } from "zod";
import { copy } from "@/lib/locale/copy/id";
import { isoDateSchema } from "./primitives";

const TIME_ZONE = "Asia/Jakarta";

/** Year/month/day of an instant as seen on the Asia/Jakarta calendar. */
const ymdFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * The Asia/Jakarta civil date of an ISO string as a UTC-midnight timestamp,
 * so two dates can be compared as whole calendar days free of timezone drift.
 */
export function jakartaDayStartUtc(iso: string): number {
  // en-CA renders "YYYY-MM-DD", which Date.parse reads as UTC midnight.
  return Date.parse(ymdFormatter.format(new Date(iso)));
}

/**
 * Contract date-range schema. The `.refine` attaches the error to the
 * `endDate` field so the inline message renders under the end-date input.
 *
 * Requirement: 18.7
 */
export const contractDateRangeSchema = z
  .object({
    startDate: isoDateSchema,
    endDate: isoDateSchema,
  })
  .refine(
    (data) => jakartaDayStartUtc(data.endDate) > jakartaDayStartUtc(data.startDate),
    {
      path: ["endDate"],
      message: copy.validasi.rentangTanggalTidakValid,
    },
  );

/** Raw input accepted by {@link contractDateRangeSchema}. */
export type ContractDateRangeInput = z.input<typeof contractDateRangeSchema>;
/** Parsed contract date-range values. */
export type ContractDateRangeValues = z.output<typeof contractDateRangeSchema>;

/**
 * Full "Buat Kontrak" form schema: links a resident to a room and captures the
 * period and deposit, reusing the date-range invariant above.
 *
 * Requirements: 18.7, 18.8
 */
export const contractFormSchema = contractDateRangeSchema;
