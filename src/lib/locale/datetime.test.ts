import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { pbtConfig } from "@/test/pbt";
import { formatTanggal, formatTanggalWaktu, relativeJatuhTempo } from "./datetime";

/**
 * Asia/Jakarta datetime tests — Task 2.4
 * --------------------------------------
 * A property covers the universal "always id-ID short month, always
 * Asia/Jakarta" invariant; unit examples lock the documented WIB datetime
 * string and the future/overdue relative messages. Relative-date cases inject
 * a fixed reference "now" so they are fully deterministic.
 */

// The exact id-ID short-month set as rendered by Intl (Agu/Mei/Okt/Des differ
// from English). The 1-based index matters: position N is month N.
const ID_SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

/** Independently compute the Asia/Jakarta civil date parts for an instant. */
function jakartaParts(date: Date): { day: string; month: string; year: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { day: get("day"), month: get("month"), year: get("year") };
}

describe("formatTanggal (Req 4.2)", () => {
  it("renders a short Indonesian date", () => {
    expect(formatTanggal("2025-02-14")).toBe("14 Feb 2025");
  });

  it("uses the Indonesian month spelling (Mei/Agu/Okt/Des)", () => {
    expect(formatTanggal("2025-05-01")).toContain("Mei");
    expect(formatTanggal("2025-08-01")).toContain("Agu");
    expect(formatTanggal("2025-10-01")).toContain("Okt");
    expect(formatTanggal("2025-12-01")).toContain("Des");
  });
});

describe("formatTanggal property — id-ID short month, Asia/Jakarta (Req 4.2)", () => {
  it("always renders the Asia/Jakarta day, an id-ID short month, and the year", () => {
    // **Validates: Requirements 4.2**
    // Sample instants across ~1970..2100 and assert the formatted output equals
    // the day/short-month/year as seen on the Asia/Jakarta calendar.
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 4_102_444_800_000 }), (ms) => {
        const date = new Date(ms);
        const iso = date.toISOString();
        const out = formatTanggal(iso);
        const { day, month, year } = jakartaParts(date);
        const expectedMonth = ID_SHORT_MONTHS[Number(month) - 1];

        expect(ID_SHORT_MONTHS).toContain(expectedMonth);
        // The formatter renders a zero-padded 2-digit day ("01 Jan 1970").
        expect(out).toContain(expectedMonth);
        expect(out).toContain(year);
        expect(out).toBe(`${day} ${expectedMonth} ${year}`);
      }),
      pbtConfig,
    );
  });
});

describe("formatTanggalWaktu (Req 4.3)", () => {
  it("renders an Indonesian datetime with a WIB suffix", () => {
    // 02:30 UTC == 09.30 WIB (UTC+7).
    expect(formatTanggalWaktu("2025-02-14T02:30:00.000Z")).toBe("14 Feb 2025, 09.30 WIB");
  });

  it("rolls into the next Jakarta day for late-UTC instants", () => {
    // 18:00 UTC on the 14th is 01.00 WIB on the 15th.
    expect(formatTanggalWaktu("2025-02-14T18:00:00.000Z")).toBe("15 Feb 2025, 01.00 WIB");
  });
});

describe("relativeJatuhTempo (Req 4.4, 4.5)", () => {
  // Fixed reference "now": 14 Feb 2025, 09.30 WIB.
  const now = "2025-02-14T02:30:00.000Z";

  it("produces a future 'hari lagi' message (Req 4.4)", () => {
    expect(relativeJatuhTempo("2025-02-17T02:30:00.000Z", now)).toBe(
      "Jatuh tempo 3 hari lagi",
    );
  });

  it("produces an overdue 'Terlambat' message (Req 4.5)", () => {
    expect(relativeJatuhTempo("2025-02-12T02:30:00.000Z", now)).toBe("Terlambat 2 hari");
  });

  it("reads sensibly on the same Jakarta day", () => {
    // Different clock time, same civil date in Jakarta -> "hari ini".
    // 16.00 UTC on the 14th is 23.00 WIB, still the 14th in Jakarta.
    expect(relativeJatuhTempo("2025-02-14T16:00:00.000Z", now)).toBe(
      "Jatuh tempo hari ini",
    );
  });

  it("compares in Asia/Jakarta calendar terms, not raw UTC", () => {
    // now = 14 Feb 09.30 WIB. A due instant of 13 Feb 23:00 UTC is 14 Feb
    // 06.00 WIB — still the same Jakarta day, so it is not overdue.
    expect(relativeJatuhTempo("2025-02-13T23:00:00.000Z", now)).toBe(
      "Jatuh tempo hari ini",
    );
  });
});
