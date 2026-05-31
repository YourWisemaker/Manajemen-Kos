/**
 * Reusable Zod field primitives — Task 4.1
 * ----------------------------------------
 * Shared, framework-free field schemas used to compose the per-entity form
 * schemas (resident, property/room, contract, tenant). Every rule mirrors the
 * design's "Validation rules (Zod, client-side)" section, and every message is
 * sourced from the typed Bahasa Indonesia copy dictionary so wording stays
 * consistent and reviewable in one place.
 *
 * Requirements: 18.3 (KTP), 18.4 (phone), 18.5 (subdomain), 18.6 (money),
 * 18.8 (property/room), 10.4 (KTP exactly 16 digits)
 */

import { z } from "zod";
import { copy } from "@/lib/locale/copy/id";
import { parseRupiah } from "@/lib/locale/rupiah";

const v = copy.validasi;

/* -------------------------------------------------------------------------- */
/* Text                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * A trimmed, non-empty string. The transform-free `.trim()` keeps it a
 * `ZodString` so callers can chain further checks if needed.
 *
 * Requirement: 18.8 (property name / room number non-empty after trim)
 */
export const nonEmptyTrimmed = z.string().trim().min(1, v.tidakBolehKosong);

/** Standard email address. Requirement: design "Email: standard email". */
export const emailSchema = z.string().trim().email(v.emailTidakValid);

/**
 * Optional email: accepts an empty string (treated as "not provided") or a
 * valid email. Used for resident records where email is optional.
 */
export const optionalEmailSchema = z.union([z.literal(""), emailSchema]).optional();

/* -------------------------------------------------------------------------- */
/* KTP (Indonesian national ID)                                               */
/* -------------------------------------------------------------------------- */

/** Exactly 16 ASCII digits. */
const KTP_PATTERN = /^\d{16}$/;

/**
 * KTP number: accepted only when it is exactly 16 digits.
 *
 * Requirements: 18.3, 10.4
 */
export const ktpSchema = z.string().trim().regex(KTP_PATTERN, v.ktpTidakValid);

/* -------------------------------------------------------------------------- */
/* Phone (Indonesian) — normalized to +62                                     */
/* -------------------------------------------------------------------------- */

/**
 * Indonesian mobile national number: starts with `8`, total 9–12 digits
 * (e.g. `81234567890`). This is the canonical part that follows the `+62`
 * country code once any local prefix (`0`) or country code (`62`/`+62`) is
 * stripped.
 */
const PHONE_NATIONAL = /^8\d{8,11}$/;

/**
 * Reduce any accepted Indonesian phone input to its national significant
 * number, or return `null` when the input is not a valid Indonesian mobile
 * number. Separators (spaces, hyphens, dots, parentheses) are ignored.
 */
function toNationalNumber(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-().]/g, "");

  let national: string;
  if (cleaned.startsWith("+62")) {
    national = cleaned.slice(3);
  } else if (cleaned.startsWith("62")) {
    national = cleaned.slice(2);
  } else if (cleaned.startsWith("0")) {
    national = cleaned.slice(1);
  } else {
    national = cleaned;
  }

  return PHONE_NATIONAL.test(national) ? national : null;
}

/**
 * Phone number: accepts Indonesian formats (including `08xxxx`, bare `8xxxx`,
 * `62xxxx`, and `+62xxxx`) and normalizes the accepted value to a `+62`
 * prefix via a Zod transform. Invalid numbers are rejected.
 *
 * Requirement: 18.4
 */
export const phoneSchema = z.string().transform((value, ctx) => {
  const national = toNationalNumber(value);
  if (national === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: v.teleponTidakValid });
    return z.NEVER;
  }
  return `+62${national}`;
});

/* -------------------------------------------------------------------------- */
/* Subdomain                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Lowercase letters, digits, and hyphens only, with no leading or trailing
 * hyphen. Length (3–30) is enforced separately so each violation maps to the
 * same descriptive message.
 */
const SUBDOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

/**
 * Subdomain: accepted only when lowercase, made of `a-z0-9-`, 3–30 characters
 * long, with no leading or trailing hyphen.
 *
 * Requirement: 18.5
 */
export const subdomainSchema = z
  .string()
  .trim()
  .min(3, v.subdomainTidakValid)
  .max(30, v.subdomainTidakValid)
  .regex(SUBDOMAIN_PATTERN, v.subdomainTidakValid);

/* -------------------------------------------------------------------------- */
/* Money (IDR)                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Money amount: accepts either a number or a Rupiah-formatted string and
 * produces a non-negative integer IDR value. A string is parsed via
 * {@link parseRupiah}; negative and non-integer values are rejected.
 *
 * Requirements: 18.6, 18.8 (`monthlyPrice >= 0`)
 */
export const moneySchema = z.union([z.number(), z.string()]).transform((value, ctx) => {
  const fail = (message: string): typeof z.NEVER => {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    return z.NEVER;
  };

  let amount: number;
  if (typeof value === "number") {
    amount = value;
  } else {
    try {
      // parseRupiah already rejects negatives, fractions, and junk strings.
      amount = parseRupiah(value);
    } catch {
      return fail(v.angkaTidakValid);
    }
  }

  if (!Number.isFinite(amount)) {
    return fail(v.angkaTidakValid);
  }
  if (!Number.isInteger(amount)) {
    return fail(v.nilaiTidakBulat);
  }
  if (amount < 0) {
    return fail(v.nilaiNegatif);
  }
  return amount;
});

/** Monthly price: a non-negative integer IDR amount. Requirement: 18.8. */
export const monthlyPriceSchema = moneySchema;

/* -------------------------------------------------------------------------- */
/* Dates (ISO, Asia/Jakarta)                                                  */
/* -------------------------------------------------------------------------- */

/** True when `iso` parses to a real calendar date. */
export function isValidIsoDate(iso: string): boolean {
  return !Number.isNaN(new Date(iso).getTime());
}

/**
 * A non-empty ISO date string that parses to a valid calendar date. Date
 * ordering (for ranges) is enforced by the composing object schema, not here.
 */
export const isoDateSchema = z
  .string()
  .trim()
  .min(1, v.tidakBolehKosong)
  .refine(isValidIsoDate, v.tanggalTidakValid);
