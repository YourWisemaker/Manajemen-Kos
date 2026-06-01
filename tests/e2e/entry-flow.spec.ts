import { expect, test } from "@playwright/test";

/**
 * Entry-flow smoke test — Task 10.3
 * ---------------------------------
 * Walks the public entry path on mock data:
 *   1. Load the marketing/landing page.
 *   2. Activate the primary "Coba Gratis 14 Hari" CTA.
 *   3. Assert navigation to the registration route (`/daftar`).
 *   4. Fill and submit the registration form.
 *   5. Assert navigation into the onboarding wizard (`/onboarding`).
 *
 * Selectors prefer roles and accessible names (labels/button text) so the
 * test stays resilient to markup changes.
 *
 * Requirements: 5.5, 6.4
 */
test.describe("Entry flow: landing → daftar → onboarding", () => {
  test("primary CTA leads to registration and onboarding", async ({ page }) => {
    // 1. Landing page
    await page.goto("/");

    // 2. Activate the primary "Coba Gratis 14 Hari" CTA. The label appears in
    //    both the sticky header and the hero; either navigates to /daftar.
    await page
      .getByRole("link", { name: "Coba Gratis 14 Hari" })
      .first()
      .click();

    // 3. Landed on the registration route.
    await page.waitForURL("**/daftar");
    await expect(page).toHaveURL(/\/daftar$/);
    await expect(
      page.getByRole("heading", { name: "Buat akun baru" }),
    ).toBeVisible();

    // 4. Fill the registration form using accessible labels.
    await page.getByLabel("Nama Lengkap").fill("Budi Santoso");
    await page.getByLabel("Email").fill("budi@example.com");
    await page.getByLabel("Kata Sandi", { exact: true }).fill("rahasia123");
    await page.getByLabel("Konfirmasi Kata Sandi").fill("rahasia123");

    // Submit the mock registration.
    await page.getByRole("button", { name: "Daftar Gratis" }).click();

    // 5. Navigated into the onboarding wizard (first step at /onboarding).
    await page.waitForURL("**/onboarding");
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(
      page.getByRole("heading", { name: "Selamat datang di KosKita" }),
    ).toBeVisible();
  });
});
