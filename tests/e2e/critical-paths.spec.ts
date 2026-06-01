import { expect, test } from "@playwright/test";

/**
 * Critical-paths smoke tests — Task 22.2
 * --------------------------------------
 * Covers the two remaining critical journeys on the rendered app with mock
 * data, complementing the existing entry-flow, onboarding, and payment specs:
 *
 *   1. Create-room flow (Req 9.3): on a property detail page under
 *      `/properti/[id]`, open the "Tambah Kamar" dialog, fill the RHF+Zod
 *      validated form (`roomSchema`) with valid input, submit, and assert the
 *      dialog closes.
 *
 *   2. Dashboard → invoice → payment-channel selection (Req 12.4, 13.4):
 *      start at the dashboard (`/dasbor`), follow the dashboard's
 *      "Lihat semua tagihan" link to the billing list, open an invoice detail,
 *      follow "Lihat Halaman Pembayaran" to `/pay/[token]`, select a payment
 *      channel, and assert the mocked instruction panel appears. The entry
 *      point (the dashboard) deliberately differs from `payment.spec.ts`, which
 *      starts directly at `/tagihan`, so this is the dashboard-originated path.
 *
 * Selectors prefer roles and accessible names (headings, button/link text,
 * field labels, radio names) so the tests stay resilient to markup changes.
 * Fixture values mirror `src/lib/mock/fixtures.ts`: the primary tenant id is
 * `tenant-kosbunga`, a fully-seeded property is `prop-melati` ("Kos Melati
 * Putih"), and the deep-linkable invoice token is `INV-2025-0142`.
 *
 * Tenant gating note: the protected dashboard routes (`/dasbor`, `/properti`,
 * `/tagihan`) and `/pay/[token]` pass through the tenant-resolution
 * middleware. In this frontend-only phase the real session and the payment
 * token→tenant lookup are stubbed, so — as in the existing specs — we seed the
 * `tenant_id` cookie to clear the gate before the surfaces render.
 *
 * Requirements: 9.3, 12.4, 13.4
 */
test.describe("Critical paths: create-room and dashboard → invoice → payment", () => {
  // A fully-seeded property for the primary tenant (six rooms, so the room
  // grid — not the empty state — renders, and the header "Tambah Kamar" trigger
  // is the only one present).
  const PROPERTY_ID = "prop-melati";
  const PROPERTY_NAME = "Kos Melati Putih";

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

  test("create-room dialog accepts valid input and closes on submit (Req 9.3)", async ({
    page,
  }) => {
    // ── Open the property detail page ───────────────────────────────────────
    await page.goto(`/properti/${PROPERTY_ID}`);
    await expect(
      page.getByRole("heading", { name: PROPERTY_NAME }),
    ).toBeVisible();

    // ── Open the add-room dialog via the header trigger ─────────────────────
    await page.getByRole("button", { name: "Tambah Kamar" }).click();

    // The dialog title is rendered as a heading (Radix Dialog.Title → h2),
    // distinct from the trigger button of the same label.
    const dialogTitle = page.getByRole("heading", { name: "Tambah Kamar" });
    await expect(dialogTitle).toBeVisible();

    // ── Fill the RHF + Zod validated form with valid input ──────────────────
    // `roomSchema`: a non-empty trimmed room number and a non-negative integer
    // IDR monthly price (a Rupiah-formatted string is parsed to an integer).
    await page.getByLabel("Nomor Kamar").fill("D9");
    await page.getByLabel("Harga Sewa per Bulan").fill("950000");

    // ── Submit → the dialog closes (mock phase: no persistence) ─────────────
    await page.getByRole("button", { name: "Simpan" }).click();

    await expect(dialogTitle).toBeHidden();
  });

  test("dashboard link → invoice detail → payment page → channel instructions (Req 12.4, 13.4)", async ({
    page,
  }) => {
    // ── Step 1: Dashboard ───────────────────────────────────────────────────
    await page.goto("/dasbor");
    await expect(page.getByRole("heading", { name: "Dasbor" })).toBeVisible();

    // ── Step 2: Follow the dashboard's link to the billing list ─────────────
    // The overdue-invoices card always exposes a "Lihat semua tagihan" link to
    // `/tagihan`; this is the dashboard-originated route into invoices.
    await page.getByRole("link", { name: "Lihat semua tagihan" }).click();

    await page.waitForURL("**/tagihan");
    await expect(page.getByRole("heading", { name: "Tagihan" })).toBeVisible();

    // ── Step 3: Open the invoice detail dialog (Req 12.4) ───────────────────
    await page.getByRole("row", { name: new RegExp(KNOWN_TOKEN) }).click();
    await expect(
      page.getByRole("heading", { name: "Detail Tagihan" }),
    ).toBeVisible();

    // ── Step 3b: Follow the payment-page link (Req 12.4) ────────────────────
    await page.getByRole("link", { name: "Lihat Halaman Pembayaran" }).click();

    await page.waitForURL(`**/pay/${KNOWN_TOKEN}`);
    await expect(page).toHaveURL(new RegExp(`/pay/${KNOWN_TOKEN}$`));
    await expect(
      page.getByRole("heading", { name: "Pilih metode pembayaran" }),
    ).toBeVisible();

    // ── Step 4: Select a channel → instruction panel visible (Req 13.4) ─────
    // The instruction panel header is the exact text "Instruksi pembayaran"
    // (exact match avoids the placeholder prompt that ends in lowercase
    // "…instruksi pembayaran."). No panel is shown until a channel is selected.
    const instructionHeader = page.getByText("Instruksi pembayaran", { exact: true });
    await expect(instructionHeader).toBeHidden();

    // QRIS is always present in the mock data; the channel card behaves as a
    // radio whose accessible name includes its display name and fee label.
    await page.getByRole("radio", { name: /QRIS/ }).click();

    // The mocked QRIS instruction panel for the selected channel appears.
    await expect(instructionHeader).toBeVisible();
    await expect(page.getByText("Scan dengan aplikasi apa pun")).toBeVisible();
  });
});
