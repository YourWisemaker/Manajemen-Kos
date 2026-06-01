import { expect, test } from "@playwright/test";

/**
 * Onboarding-completion smoke test — Task 11.3
 * --------------------------------------------
 * Walks the full five-step onboarding wizard on mock data and verifies the
 * owner lands on the dashboard with the trial banner visible:
 *   1. Daftar               (/onboarding)            — confirm name, Lanjut.
 *   2. Pilih Paket          (/onboarding/paket)      — select a plan, Lanjut.
 *   3. Buat Properti        (/onboarding/properti)   — fill the property form.
 *   4. Hubungkan Pembayaran (/onboarding/pembayaran) — gateway stub connect.
 *   5. Undang Staff         (/onboarding/tim)        — finish the wizard.
 *   6. Dashboard            (/dasbor?trial=baru)     — trial banner visible.
 *
 * Selectors prefer roles and accessible names (headings, button text, field
 * labels) so the test stays resilient to markup changes. Step copy mirrors the
 * Bahasa Indonesia dictionary (`lib/locale/copy/id.ts`).
 *
 * Requirements: 7.6
 */
test.describe("Onboarding: five-step wizard → dashboard", () => {
  test("completing all steps lands on the dashboard with the trial banner", async ({
    page,
    baseURL,
  }) => {
    // The dashboard route is gated by tenant-resolution middleware. In the real
    // product Better Auth sets a session/tenant cookie after registration; in
    // this frontend-only phase that is stubbed, so we seed the `tenant_id`
    // cookie to represent the authenticated owner before reaching `/dasbor`.
    await page.context().addCookies([
      {
        name: "tenant_id",
        value: "tenant-kosbunga",
        url: baseURL ?? "http://localhost:3000",
      },
    ]);

    // ── Step 1: Daftar ──────────────────────────────────────────────────────
    await page.goto("/onboarding");
    await expect(
      page.getByRole("heading", { name: "Selamat datang di KosKita" }),
    ).toBeVisible();

    await page.getByLabel("Nama Anda").fill("Budi Santoso");
    await page.getByRole("button", { name: "Lanjut" }).click();

    // ── Step 2: Pilih Paket ─────────────────────────────────────────────────
    await page.waitForURL("**/onboarding/paket");
    await expect(page.getByRole("heading", { name: "Pilih Paket" })).toBeVisible();

    // Selecting a plan enables the "Lanjut" button.
    await page.getByRole("button", { name: /Pro/ }).click();
    await page.getByRole("button", { name: "Lanjut" }).click();

    // ── Step 3: Buat Properti ───────────────────────────────────────────────
    await page.waitForURL("**/onboarding/properti");
    await expect(page.getByRole("heading", { name: "Buat Properti" })).toBeVisible();

    await page.getByLabel("Nama Properti").fill("Kos Bunga Melati");
    await page.getByLabel("Alamat").fill("Jl. Melati No. 12");
    await page.getByLabel("Kota").fill("Jakarta Selatan");
    await page.getByLabel("Jumlah Kamar").fill("10");
    await page.getByLabel("Tipe Kamar").fill("Standar");
    await page.getByLabel("Harga Sewa per Bulan").fill("1500000");
    await page.getByRole("button", { name: "Lanjut" }).click();

    // ── Step 4: Hubungkan Pembayaran (gateway stub) ─────────────────────────
    await page.waitForURL("**/onboarding/pembayaran");
    await expect(
      page.getByRole("heading", { name: "Hubungkan Pembayaran" }),
    ).toBeVisible();

    await page.getByRole("button", { name: /Xendit/ }).click();
    await page.getByRole("button", { name: "Hubungkan" }).click();

    // The stub simulates a brief connection, after which "Lanjut" appears.
    const lanjutAfterConnect = page.getByRole("button", { name: "Lanjut" });
    await expect(lanjutAfterConnect).toBeVisible();
    await lanjutAfterConnect.click();

    // ── Step 5: Undang Staff ────────────────────────────────────────────────
    await page.waitForURL("**/onboarding/tim");
    await expect(page.getByRole("heading", { name: "Undang Staff" })).toBeVisible();

    await page.getByRole("button", { name: "Selesai" }).click();

    // ── Dashboard with trial banner ─────────────────────────────────────────
    await page.waitForURL(/\/dasbor/);
    await expect(page).toHaveURL(/\/dasbor\?trial=baru/);

    // The trial banner states the free trial ends in 14 days (Req 7.6).
    const trialBanner = page.getByRole("status");
    await expect(trialBanner).toBeVisible();
    await expect(trialBanner).toContainText("Masa coba gratis berakhir dalam 14 hari");
  });
});
