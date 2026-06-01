import { expect, test } from "@playwright/test";

/**
 * Payment-flow smoke test — Task 18.3
 * -----------------------------------
 * Walks the public payment path on mock data, from the tenant-facing invoice
 * detail through to the resident's payment page, then verifies the not-found
 * fallback:
 *   1. Open the billing list (/tagihan), open an invoice detail dialog, and
 *      follow the `Lihat Halaman Pembayaran` link to `/pay/[token]`. (Req 12.4)
 *   2. On the payment page, select a payment channel and assert the mocked
 *      instruction panel becomes visible. (Req 13.4)
 *   3. Visit `/pay/<unknown-token>` and assert the branded `Tidak ditemukan`
 *      not-found state appears. (Req 13.6)
 *
 * Selectors prefer roles and accessible names (table rows, link/radio text,
 * headings) so the test stays resilient to markup changes. Fixture values
 * mirror `src/lib/mock/fixtures.ts`: the known token is `INV-2025-0142` and the
 * primary tenant id is `tenant-kosbunga`.
 *
 * Tenant gating note: both `/tagihan` (dashboard group) and `/pay/[token]` pass
 * through the tenant-resolution middleware. In this frontend-only phase the
 * real session and the payment-token→tenant DB lookup are stubbed, so — as in
 * onboarding.spec.ts — we seed the `tenant_id` cookie to clear the gate before
 * the surfaces render against mock data.
 *
 * Requirements: 12.4, 13.4, 13.6
 */
test.describe("Payment flow: invoice detail → payment page → not-found", () => {
  // The known, deep-linkable token wired into a PublicInvoiceView fixture.
  const KNOWN_TOKEN = "INV-2025-0142";

  test.beforeEach(async ({ page, baseURL }) => {
    await page.context().addCookies([
      {
        name: "tenant_id",
        value: "tenant-kosbunga",
        url: baseURL ?? "http://localhost:3000",
      },
    ]);
  });

  test("invoice detail links to the payment page and a channel reveals instructions", async ({
    page,
  }) => {
    // ── Step 1: Billing list → invoice detail dialog ────────────────────────
    await page.goto("/tagihan");
    await expect(page.getByRole("heading", { name: "Tagihan" })).toBeVisible();

    // Open the detail dialog by clicking the invoice row (rows are clickable).
    await page.getByRole("row", { name: new RegExp(KNOWN_TOKEN) }).click();
    await expect(page.getByRole("heading", { name: "Detail Tagihan" })).toBeVisible();

    // ── Step 1b: Follow the payment-page link (Req 12.4) ────────────────────
    await page.getByRole("link", { name: "Lihat Halaman Pembayaran" }).click();

    await page.waitForURL(`**/pay/${KNOWN_TOKEN}`);
    await expect(page).toHaveURL(new RegExp(`/pay/${KNOWN_TOKEN}$`));
    await expect(
      page.getByRole("heading", { name: "Pilih metode pembayaran" }),
    ).toBeVisible();

    // ── Step 2: Select a channel → instruction panel visible (Req 13.4) ─────
    // The instruction panel header is the exact text "Instruksi pembayaran"
    // (exact match avoids the placeholder prompt that ends in "…instruksi
    // pembayaran."). No panel is shown until a channel is selected.
    const instructionHeader = page.getByText("Instruksi pembayaran", { exact: true });
    await expect(instructionHeader).toBeHidden();

    // Select the Virtual Account channel (role="radio" with its display name).
    await page.getByRole("radio", { name: "Virtual Account BCA" }).click();

    // The mocked instruction panel for the selected channel becomes visible,
    // including the VA number block rendered in tabular mono figures.
    await expect(instructionHeader).toBeVisible();
    await expect(page.getByText("Nomor Virtual Account")).toBeVisible();
  });

  test("an unknown token renders the branded not-found state (Req 13.6)", async ({
    page,
  }) => {
    // An unknown token must resolve to the branded `Tidak ditemukan` state with
    // a way back rather than a raw error.
    await page.goto("/pay/token-tidak-dikenal");

    await expect(
      page.getByRole("heading", { name: "Tidak ditemukan" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Kembali ke beranda" }),
    ).toBeVisible();
  });
});
