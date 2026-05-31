/**
 * Contract (kontrak) schemas — Task 4.1 / 16.2
 * --------------------------------------------
 * Validates a contract's rental period: the end date must be strictly after
 * the start date, with both dates interpreted on the Asia/Jakarta calendar
 * (WIB has no DST, so a civil-day comparison is stable regardless of the
 * machine timezone).
 *
 * The same "end after start" invariant is reused by the full "Buat Kontrak"
 * form schema (resident + room + period + deposit + locked monthly price) so
 * the refine logic lives in exactly one place.
 *
 * Requirements: 18.7, 11.3, 11.4
 */

import { z } from "zod";
import { copy } from "@/lib/locale/copy/id";
import { isoDateSchema, moneySchema, nonEmptyTrimmed } from "./primitives";

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
 * The shared date-range fields, reused by both the standalone range schema and
 * the full form schema below so the field definitions stay in one place.
 */
const dateRangeShape = {
  startDate: isoDateSchema,
  endDate: isoDateSchema,
};

/** Predicate: the end date is strictly after the start date (Asia/Jakarta). */
function endsAfterStart(data: { startDate: string; endDate: string }): boolean {
  return jakartaDayStartUtc(data.endDate) > jakartaDayStartUtc(data.startDate);
}

/**
 * Shared refine config: attaches the error to the `endDate` field so the
 * inline message renders under the end-date input.
 */
const endsAfterStartRefinement = {
  path: ["endDate"] as (string | number)[],
  message: copy.validasi.rentangTanggalTidakValid,
};

/**
 * Contract date-range schema. The `.refine` attaches the error to the
 * `endDate` field so the inline message renders under the end-date input.
 *
 * Requirement: 18.7
 */
export const contractDateRangeSchema = z
  .object(dateRangeShape)
  .refine(endsAfterStart, endsAfterStartRefinement);

/** Raw input accepted by {@link contractDateRangeSchema}. */
export type ContractDateRangeInput = z.input<typeof contractDateRangeSchema>;
/** Parsed contract date-range values. */
export type ContractDateRangeValues = z.output<typeof contractDateRangeSchema>;

/**
 * Full "Buat Kontrak" form schema: links a resident to a room and captures the
 * period, deposit, and locked monthly price. It composes the date-range fields
 * and reuses the exact same "end after start" invariant via
 * {@link endsAfterStart} — the refine logic is never duplicated.
 *
 * Requirements: 11.3, 11.4, 18.7, 18.8
 */
export const contractFormSchema = z
  .object({
    residentName: nonEmptyTrimmed,
    roomNumber: nonEmptyTrimmed,
    ...dateRangeShape,
    depositAmount: moneySchema,
    monthlyPrice: moneySchema,
  })
  .refine(endsAfterStart, endsAfterStartRefinement);

/** Raw input accepted by {@link contractFormSchema} (money may be a string). */
export type ContractFormInput = z.input<typeof contractFormSchema>;
/** Parsed contract form values (money as integer IDR). */
export type ContractFormValues = z.output<typeof contractFormSchema>;
