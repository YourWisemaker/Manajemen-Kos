/**
 * Asia/Jakarta date & time formatting — Task 2.3
 * ----------------------------------------------
 * Pure, framework-free locale utilities. Every formatter is pinned to locale
 * `id-ID` and timezone `Asia/Jakarta` so dates render identically regardless of
 * the machine/browser timezone, and due-date math is computed in Jakarta
 * calendar terms (WIB, UTC+7, no DST).
 *
 *   formatTanggal("2025-02-14")            -> "14 Feb 2025"
 *   formatTanggalWaktu("2025-02-14T02:30Z") -> "14 Feb 2025, 09.30 WIB"
 *   relativeJatuhTempo(future)              -> "Jatuh tempo 3 hari lagi"
 *   relativeJatuhTempo(today)               -> "Jatuh tempo hari ini"
 *   relativeJatuhTempo(past)                -> "Terlambat 2 hari"
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

const LOCALE = "id-ID";
const TIME_ZONE = "Asia/Jakarta";

/** Short Indonesian date, e.g. "14 Feb 2025". */
const tanggalFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/** Indonesian datetime, e.g. "14 Feb 2025, 09.30" (WIB suffix appended manually). */
const tanggalWaktuFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Year/month/day parts of an instant as seen on the Asia/Jakarta calendar. */
const ymdFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const MS_PER_DAY = 86_400_000;

/** Parse an ISO string into a Date, throwing a clear error on invalid input. */
function toDate(iso: string): Date {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Tanggal ISO tidak valid: "${iso}"`);
  }
  return date;
}

/**
 * Format an ISO date as a short Indonesian date.
 *
 * @param iso - An ISO date or datetime string (e.g. `"2025-02-14"`).
 * @returns e.g. `"14 Feb 2025"`, interpreted in Asia/Jakarta.
 * @throws {Error} If `iso` is not a valid date string.
 */
export function formatTanggal(iso: string): string {
  return tanggalFormatter.format(toDate(iso));
}

/**
 * Format an ISO datetime as an Indonesian datetime with a `WIB` suffix.
 *
 * @param iso - An ISO datetime string (e.g. `"2025-02-14T02:30:00Z"`).
 * @returns e.g. `"14 Feb 2025, 09.30 WIB"`, interpreted in Asia/Jakarta.
 * @throws {Error} If `iso` is not a valid date string.
 */
export function formatTanggalWaktu(iso: string): string {
  return `${tanggalWaktuFormatter.format(toDate(iso))} WIB`;
}

/**
 * The Asia/Jakarta calendar day for an instant, expressed as a UTC midnight
 * timestamp of that civil date. This lets us subtract two civil dates to get a
 * whole-day difference free of timezone/DST drift (WIB has no DST).
 */
function jakartaDayStartUtc(date: Date): number {
  // en-CA renders as "YYYY-MM-DD", which Date.parse reads as UTC midnight.
  return Date.parse(ymdFormatter.format(date));
}

/**
 * Produce a relative due-date message in Bahasa Indonesia, comparing the due
 * date against "now" in Asia/Jakarta calendar terms (whole days).
 *
 * @param due - The due date as an ISO string.
 * @param now - Optional reference "now" (ISO string or Date) for deterministic
 *   tests; defaults to the current instant.
 * @returns
 *   - future: `"Jatuh tempo N hari lagi"`
 *   - same day: `"Jatuh tempo hari ini"`
 *   - past: `"Terlambat N hari"`
 * @throws {Error} If `due` or `now` is not a valid date string.
 */
export function relativeJatuhTempo(due: string, now: string | Date = new Date()): string {
  const dueDate = toDate(due);
  const nowDate = typeof now === "string" ? toDate(now) : now;

  const dueDay = jakartaDayStartUtc(dueDate);
  const nowDay = jakartaDayStartUtc(nowDate);
  const diffDays = Math.round((dueDay - nowDay) / MS_PER_DAY);

  if (diffDays > 0) {
    return `Jatuh tempo ${diffDays} hari lagi`;
  }
  if (diffDays < 0) {
    return `Terlambat ${Math.abs(diffDays)} hari`;
  }
  return "Jatuh tempo hari ini";
}
