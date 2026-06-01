/**
 * Email Provider — Task 10.3
 *
 * Integrates with Resend for transactional emails.
 * Provides HTML email templates for invoice_issued, payment_success, and reminder.
 *
 * Requirements: 9.4
 */

import type { NotificationType } from "./service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ResendEmailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
}

// ---------------------------------------------------------------------------
// EmailProvider
// ---------------------------------------------------------------------------

export class EmailProvider {
  private readonly fromAddress: string;

  constructor() {
    this.fromAddress =
      process.env.EMAIL_FROM ?? "KosKita <noreply@koskita.id>";
  }

  /**
   * Send a transactional email via Resend SDK.
   *
   * @param to - Recipient email address
   * @param subject - Email subject line
   * @param html - HTML email body
   */
  async sendTransactional(to: string, subject: string, html: string): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn(
        "[email] RESEND_API_KEY not set. Skipping email delivery.",
      );
      return;
    }

    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    const options: ResendEmailOptions = {
      from: this.fromAddress,
      to,
      subject,
      html,
    };

    const { error } = await resend.emails.send(options);

    if (error) {
      throw new Error(
        `Resend delivery failed: ${error.message ?? "Unknown error"}`,
      );
    }
  }

  /**
   * Build HTML email content from notification type and variables.
   * Uses inline-styled HTML templates for maximum email client compatibility.
   */
  buildHtml(
    type: NotificationType,
    variables: Record<string, string>,
    bodyText: string,
  ): string {
    switch (type) {
      case "invoice_issued":
        return buildInvoiceIssuedHtml(variables, bodyText);
      case "payment_success":
        return buildPaymentSuccessHtml(variables, bodyText);
      case "payment_reminder":
        return buildReminderHtml(variables, bodyText);
      default:
        return buildGenericHtml(variables, bodyText);
    }
  }
}

// ---------------------------------------------------------------------------
// HTML Email Templates
// ---------------------------------------------------------------------------

/** Shared email wrapper with inline styles */
function wrapHtml(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color:#1e40af;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">KosKita</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#6b7280;text-align:center;">
                Email ini dikirim otomatis oleh KosKita. Jangan membalas email ini.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Invoice issued email template */
function buildInvoiceIssuedHtml(
  variables: Record<string, string>,
  bodyText: string,
): string {
  const nama = escapeHtml(variables.nama ?? "Penghuni");
  const jumlah = escapeHtml(variables.jumlah ?? "-");
  const jatuhTempo = escapeHtml(variables.jatuh_tempo ?? "-");
  const link = variables.link ?? "#";

  const content = `
    <h2 style="margin:0 0 16px;font-size:18px;color:#111827;">Tagihan Baru</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
      Halo <strong>${nama}</strong>,
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
      ${escapeHtml(bodyText)}
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background-color:#f9fafb;border-radius:6px;padding:16px;">
      <tr>
        <td style="padding:12px 16px;">
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Total Tagihan</p>
          <p style="margin:0;font-size:24px;font-weight:700;color:#1e40af;">Rp ${jumlah}</p>
          <p style="margin:8px 0 0;font-size:13px;color:#6b7280;">Jatuh tempo: ${jatuhTempo}</p>
        </td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td style="background-color:#1e40af;border-radius:6px;">
          <a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;" target="_blank">
            Bayar Sekarang
          </a>
        </td>
      </tr>
    </table>`;

  return wrapHtml("Tagihan Baru", content);
}

/** Payment success email template */
function buildPaymentSuccessHtml(
  variables: Record<string, string>,
  bodyText: string,
): string {
  const nama = escapeHtml(variables.nama ?? "Penghuni");
  const jumlah = escapeHtml(variables.jumlah ?? "-");

  const content = `
    <h2 style="margin:0 0 16px;font-size:18px;color:#111827;">Pembayaran Berhasil ✓</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
      Halo <strong>${nama}</strong>,
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
      ${escapeHtml(bodyText)}
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background-color:#ecfdf5;border-radius:6px;">
      <tr>
        <td style="padding:16px;">
          <p style="margin:0 0 8px;font-size:13px;color:#065f46;">Jumlah Dibayar</p>
          <p style="margin:0;font-size:24px;font-weight:700;color:#059669;">Rp ${jumlah}</p>
          <p style="margin:8px 0 0;font-size:13px;color:#065f46;">Status: Lunas</p>
        </td>
      </tr>
    </table>
    <p style="margin:16px 0 0;font-size:14px;color:#374151;line-height:1.6;">
      Terima kasih atas pembayaran Anda. Bukti pembayaran ini dapat digunakan sebagai referensi.
    </p>`;

  return wrapHtml("Pembayaran Berhasil", content);
}

/** Payment reminder email template */
function buildReminderHtml(
  variables: Record<string, string>,
  bodyText: string,
): string {
  const nama = escapeHtml(variables.nama ?? "Penghuni");
  const jumlah = escapeHtml(variables.jumlah ?? "-");
  const jatuhTempo = escapeHtml(variables.jatuh_tempo ?? "-");
  const link = variables.link ?? "#";

  const content = `
    <h2 style="margin:0 0 16px;font-size:18px;color:#111827;">Pengingat Pembayaran</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
      Halo <strong>${nama}</strong>,
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
      ${escapeHtml(bodyText)}
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background-color:#fffbeb;border-radius:6px;">
      <tr>
        <td style="padding:16px;">
          <p style="margin:0 0 8px;font-size:13px;color:#92400e;">Tagihan Belum Dibayar</p>
          <p style="margin:0;font-size:24px;font-weight:700;color:#d97706;">Rp ${jumlah}</p>
          <p style="margin:8px 0 0;font-size:13px;color:#92400e;">Jatuh tempo: ${jatuhTempo}</p>
        </td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td style="background-color:#d97706;border-radius:6px;">
          <a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;" target="_blank">
            Bayar Sekarang
          </a>
        </td>
      </tr>
    </table>`;

  return wrapHtml("Pengingat Pembayaran", content);
}

/** Generic email template for other notification types */
function buildGenericHtml(
  variables: Record<string, string>,
  bodyText: string,
): string {
  const nama = escapeHtml(variables.nama ?? "Pengguna");

  const content = `
    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
      Halo <strong>${nama}</strong>,
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
      ${escapeHtml(bodyText)}
    </p>`;

  return wrapHtml("Notifikasi KosKita", content);
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/** Escape HTML special characters to prevent XSS in email templates */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
