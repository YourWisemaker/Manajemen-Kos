import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { PaymentChannelView } from "@/lib/mock";
import {
  CHANNEL_GROUP_ORDER,
  type ChannelType,
  dummyBankAccount,
  dummyRetailCode,
  dummyVaNumber,
  groupChannels,
  groupDigits,
  qrPlaceholderMatrix,
} from "./payment-helpers";

/**
 * Public payment-page helpers unit + property tests — Task 18
 * -----------------------------------------------------------
 * Verify the pure channel-grouping and synthetic dummy-value logic backing the
 * `/pay/[token]` instruction panels: canonical group ordering with Bahasa
 * Indonesia headings, omission of empty groups, deterministic synthetic VA /
 * retail / bank values, digit grouping, and the QR placeholder matrix shape.
 *
 * Requirements: 13.3, 13.4
 */

function channel(
  code: string,
  type: ChannelType,
  overrides: Partial<PaymentChannelView> = {},
): PaymentChannelView {
  return {
    code,
    type,
    displayName: code,
    enabled: true,
    ...overrides,
  };
}

// The seeded set mirrors the mock fixtures (QRIS + VA + e-wallet + retail + manual).
const FIXTURE_CHANNELS: PaymentChannelView[] = [
  channel("QRIS", "qris"),
  channel("BCA_VA", "va"),
  channel("GOPAY", "ewallet"),
  channel("ALFAMART", "retail"),
  channel("MANUAL", "manual"),
];

describe("groupChannels (Req 13.3)", () => {
  it("groups channels into the canonical display order with Indonesian headings", () => {
    const groups = groupChannels(FIXTURE_CHANNELS);
    expect(groups.map((g) => g.type)).toEqual([
      "qris",
      "va",
      "ewallet",
      "retail",
      "manual",
    ]);
    expect(groups.map((g) => g.label)).toEqual([
      "QRIS",
      "Virtual Account",
      "E-Wallet",
      "Retail",
      "Transfer Manual",
    ]);
  });

  it("places QRIS first whenever a QRIS channel is present", () => {
    const groups = groupChannels(FIXTURE_CHANNELS);
    expect(groups[0]?.type).toBe("qris");
  });

  it("omits groups that have no channels", () => {
    const groups = groupChannels([channel("QRIS", "qris"), channel("BCA_VA", "va")]);
    expect(groups.map((g) => g.type)).toEqual(["qris", "va"]);
  });

  it("keeps multiple channels of the same type within one group, preserving order", () => {
    const groups = groupChannels([
      channel("BCA_VA", "va"),
      channel("BNI_VA", "va"),
      channel("QRIS", "qris"),
    ]);
    const va = groups.find((g) => g.type === "va");
    expect(va?.channels.map((c) => c.code)).toEqual(["BCA_VA", "BNI_VA"]);
    // QRIS still leads despite being last in the input.
    expect(groups[0]?.type).toBe("qris");
  });

  it("returns no groups for an empty channel list", () => {
    expect(groupChannels([])).toEqual([]);
  });

  it("property: emitted group types are always a subset of the canonical order, in order", () => {
    const types: ChannelType[] = ["qris", "va", "ewallet", "retail", "manual"];
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...types), { maxLength: 20 }),
        (chosenTypes) => {
          const channels = chosenTypes.map((t, i) => channel(`C${i}`, t));
          const groups = groupChannels(channels);
          const emitted = groups.map((g) => g.type);

          // Emitted order is a subsequence of the canonical order.
          const canonicalIdx = emitted.map((t) => CHANNEL_GROUP_ORDER.indexOf(t));
          const sorted = [...canonicalIdx].sort((a, b) => a - b);
          expect(canonicalIdx).toEqual(sorted);

          // Every present type appears exactly once; absent types are omitted.
          for (const t of types) {
            const present = chosenTypes.includes(t);
            expect(emitted.filter((e) => e === t).length).toBe(present ? 1 : 0);
          }
          // No channel is lost.
          const total = groups.reduce((sum, g) => sum + g.channels.length, 0);
          expect(total).toBe(channels.length);
        },
      ),
    );
  });
});

describe("groupDigits", () => {
  it("splits digits into space-separated blocks of four by default", () => {
    expect(groupDigits("8808123456789012")).toBe("8808 1234 5678 9012");
  });

  it("handles a trailing partial block", () => {
    expect(groupDigits("123456789")).toBe("1234 5678 9");
  });

  it("supports a custom block size", () => {
    expect(groupDigits("123456", 3)).toBe("123 456");
  });
});

describe("dummyVaNumber (Req 13.4)", () => {
  it("is deterministic for the same token + code", () => {
    expect(dummyVaNumber("INV-1", "BCA_VA")).toBe(dummyVaNumber("INV-1", "BCA_VA"));
  });

  it("produces a 16-digit number formatted in blocks of four with a VA prefix", () => {
    const va = dummyVaNumber("INV-2025-0142", "BCA_VA");
    expect(va).toMatch(/^\d{4}( \d{4}){3}$/);
    expect(va.replace(/\s/g, "")).toHaveLength(16);
    expect(va.startsWith("8808")).toBe(true);
  });

  it("varies with the channel code", () => {
    expect(dummyVaNumber("INV-1", "BCA_VA")).not.toBe(dummyVaNumber("INV-1", "BNI_VA"));
  });

  it("property: always 16 numeric digits regardless of inputs", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (token, code) => {
        const digits = dummyVaNumber(token, code).replace(/\s/g, "");
        expect(digits).toMatch(/^\d{16}$/);
      }),
    );
  });
});

describe("dummyRetailCode (Req 13.4)", () => {
  it("is deterministic and 12 numeric digits in blocks of four", () => {
    const code = dummyRetailCode("INV-2025-0142", "ALFAMART");
    expect(code).toBe(dummyRetailCode("INV-2025-0142", "ALFAMART"));
    expect(code).toMatch(/^\d{4} \d{4} \d{4}$/);
    expect(code.replace(/\s/g, "")).toHaveLength(12);
  });
});

describe("dummyBankAccount (Req 13.4)", () => {
  it("uses the tenant name as the account holder and a grouped account number", () => {
    const account = dummyBankAccount("INV-2025-0142", "Kos Bunga Melati");
    expect(account.accountName).toBe("Kos Bunga Melati");
    expect(account.bank).toBe("Bank BCA");
    expect(account.accountNumber.replace(/\s/g, "")).toMatch(/^\d{10}$/);
  });

  it("is deterministic for the same token", () => {
    expect(dummyBankAccount("INV-1", "Kos A")).toEqual(
      dummyBankAccount("INV-1", "Kos A"),
    );
  });
});

describe("qrPlaceholderMatrix (Req 13.4)", () => {
  it("returns a square matrix of the requested size", () => {
    const matrix = qrPlaceholderMatrix("INV-1");
    expect(matrix).toHaveLength(25);
    for (const row of matrix) {
      expect(row).toHaveLength(25);
    }
  });

  it("is deterministic for the same seed", () => {
    expect(qrPlaceholderMatrix("INV-1")).toEqual(qrPlaceholderMatrix("INV-1"));
  });

  it("stamps the three finder patterns (filled corners with a quiet ring)", () => {
    const size = 25;
    const matrix = qrPlaceholderMatrix("INV-1", size);
    // Finder corners are filled (border modules).
    expect(matrix[0][0]).toBe(true);
    expect(matrix[0][size - 1]).toBe(true);
    expect(matrix[size - 1][0]).toBe(true);
    // The bottom-right corner has no finder pattern.
    // (cannot assert a single module, but the finder ring at row 7 is cleared)
    expect(matrix[7][3]).toBe(false);
  });
});
