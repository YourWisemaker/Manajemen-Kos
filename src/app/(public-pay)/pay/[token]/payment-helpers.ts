/**
 * Public payment-page helpers — Task 18 (pure logic)
 * --------------------------------------------------
 * Framework-free, testable logic backing the public payment page
 * (`/pay/[token]`): grouping the invoice's payment channels by type into the
 * canonical display order with Bahasa Indonesia group headings, and deriving
 * SYNTHETIC, deterministic dummy values (VA numbers, retail payment codes, a
 * QR-like module matrix, manual-transfer account numbers) for the mocked
 * instruction panels.
 *
 * Every generated value is synthetic placeholder data — there is no real
 * payment information here. Values are derived deterministically from the
 * invoice token + channel code so a given page renders the same dummy numbers
 * across reloads (and is unit-testable) without any randomness.
 *
 * Keeping this logic out of the page component lets us unit-test the grouping
 * and the synthetic-value formatting without rendering, while the page stays a
 * thin view.
 *
 * Requirements: 13.3, 13.4
 */

import type { PaymentChannelView } from "@/lib/data";

/** The payment-channel type union (mirrors {@link PaymentChannelView.type}). */
export type ChannelType = PaymentChannelView["type"];

/**
 * Canonical display order for channel groups. QRIS leads (it is always present
 * in the mock data and is the most universal option), then bank Virtual
 * Account, e-wallets, retail outlets, and finally manual transfer.
 */
export const CHANNEL_GROUP_ORDER: ChannelType[] = [
  "qris",
  "va",
  "ewallet",
  "retail",
  "manual",
];

/** Bahasa Indonesia heading shown above each channel group. */
export const CHANNEL_GROUP_LABEL: Record<ChannelType, string> = {
  qris: "QRIS",
  va: "Virtual Account",
  ewallet: "E-Wallet",
  retail: "Retail",
  manual: "Transfer Manual",
};

/** A single rendered group: its type, heading, and the channels within it. */
export interface ChannelGroup {
  type: ChannelType;
  label: string;
  channels: PaymentChannelView[];
}

/**
 * Group payment channels by type into the {@link CHANNEL_GROUP_ORDER} display
 * order, attaching the Bahasa Indonesia heading. Groups with no channels are
 * omitted, and channel order within each group is preserved.
 *
 * @param channels - The invoice's payment channels.
 * @returns The non-empty groups in canonical order.
 */
export function groupChannels(channels: PaymentChannelView[]): ChannelGroup[] {
  return CHANNEL_GROUP_ORDER.map((type) => ({
    type,
    label: CHANNEL_GROUP_LABEL[type],
    channels: channels.filter((channel) => channel.type === type),
  })).filter((group) => group.channels.length > 0);
}

// ---------------------------------------------------------------------------
// Synthetic, deterministic dummy-value generation.
// ---------------------------------------------------------------------------

/** FNV-1a hash of a seed string → unsigned 32-bit integer. */
function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Produce `length` deterministic decimal digits from a seed using a Lehmer
 * PRNG stepped from the seed's hash. Pure: the same seed always yields the
 * same digits.
 */
function syntheticDigits(seed: string, length: number): string {
  // Lehmer PRNG (MINSTD). State stays in (0, 2^31) and 48271 * state stays well
  // under Number.MAX_SAFE_INTEGER, so plain multiplication keeps it unsigned —
  // `Math.imul` would wrap to a SIGNED 32-bit int and yield negative digits.
  let state = (hashSeed(seed) % 2147483646) + 1;
  let out = "";
  while (out.length < length) {
    state = (state * 48271) % 2147483647;
    out += (state % 10).toString();
  }
  return out.slice(0, length);
}

/** Group a digit string into space-separated blocks (default size 4). */
export function groupDigits(digits: string, size = 4): string {
  const groups: string[] = [];
  for (let i = 0; i < digits.length; i += size) {
    groups.push(digits.slice(i, i + size));
  }
  return groups.join(" ");
}

/**
 * A synthetic 16-digit Virtual Account number for the mocked VA panel,
 * formatted in space-separated blocks of four (e.g. `"8808 1234 5678 9012"`).
 * The leading `8808` mimics a real VA prefix; the remaining 12 digits are
 * derived deterministically from the token + channel code.
 */
export function dummyVaNumber(token: string, code: string): string {
  const digits = `8808${syntheticDigits(`${token}:${code}:va`, 12)}`;
  return groupDigits(digits, 4);
}

/**
 * A synthetic retail payment code for the mocked retail panel, formatted in
 * space-separated blocks of four (e.g. `"4471 0258 1193"`). Derived
 * deterministically from the token + channel code.
 */
export function dummyRetailCode(token: string, code: string): string {
  return groupDigits(syntheticDigits(`${token}:${code}:retail`, 12), 4);
}

/** Synthetic bank-transfer account details for the manual-transfer panel. */
export interface DummyBankAccount {
  /** Bank display name. */
  bank: string;
  /** Account number, formatted in space-separated blocks of four. */
  accountNumber: string;
  /** Account holder name (the tenant). */
  accountName: string;
}

/**
 * Synthetic manual-transfer bank account, with the account holder set to the
 * tenant name and a 10-digit account number derived from the token.
 */
export function dummyBankAccount(token: string, tenantName: string): DummyBankAccount {
  return {
    bank: "Bank BCA",
    accountNumber: groupDigits(syntheticDigits(`${token}:manual`, 10), 4),
    accountName: tenantName,
  };
}

/**
 * Build a deterministic, QR-like boolean module matrix for the QRIS placeholder
 * art. This is purely decorative synthetic data (NOT a scannable code): the
 * three corner finder patterns are always drawn, and the remaining modules are
 * filled from the seed's hash bits so the placeholder looks plausibly like a QR
 * code while staying stable per token.
 *
 * @param seed - Seed string (typically the invoice token).
 * @param size - Matrix dimension (modules per side). Defaults to 25.
 * @returns A `size`×`size` boolean matrix; `true` = filled module.
 */
export function qrPlaceholderMatrix(seed: string, size = 25): boolean[][] {
  const matrix: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false),
  );

  // Fill the data area from a stepped PRNG seeded by the input.
  let state = (hashSeed(`${seed}:qr`) % 2147483646) + 1;
  const nextBit = (): boolean => {
    // Plain multiplication keeps `state` unsigned (see syntheticDigits note).
    state = (state * 48271) % 2147483647;
    return state % 100 < 48; // ~48% fill density reads as a believable QR.
  };
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      matrix[row][col] = nextBit();
    }
  }

  // Stamp the three 7×7 finder patterns (top-left, top-right, bottom-left).
  const stampFinder = (top: number, left: number): void => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const onBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        matrix[top + r][left + c] = onBorder || inCore;
      }
    }
    // Quiet ring around the finder so it stays visually distinct.
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        if (r === -1 || r === 7 || c === -1 || c === 7) {
          const rr = top + r;
          const cc = left + c;
          if (rr >= 0 && rr < size && cc >= 0 && cc < size) {
            matrix[rr][cc] = false;
          }
        }
      }
    }
  };
  stampFinder(0, 0);
  stampFinder(0, size - 7);
  stampFinder(size - 7, 0);

  return matrix;
}
