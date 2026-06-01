/**
 * Notification Service — Task 10.1
 *
 * Sends WhatsApp and email notifications per-tenant with customizable templates.
 * Fire-and-forget: delivery failures are logged but never block the caller.
 *
 * Requirements: 9.1, 9.2, 9.5, 9.6, 9.7
 */

import { eq } from "drizzle-orm";

import { getDb } from "@/lib/server/db";
import { tenantSaas } from "@/lib/server/db/schema";

import { EmailProvider } from "./email";
import { WhatsAppProvider } from "./whatsapp";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationType =
  | "invoice_issued"
  | "payment_success"
  | "payment_reminder"
  | "contract_expiring"
  | "trial_ending"
  | "subscription_past_due";

export interface NotificationPayload {
  type: NotificationType;
  tenantId: string;
  recipientPhone?: string;
  recipientEmail?: string;
  variables: Record<string, string>;
}

export interface SendBatchResult {
  sent: number;
  failed: number;
  errors: { recipient: string; error: string }[];
}

/** Per-tenant WA template stored in settings.waTemplates */
interface WaTemplates {
  invoice_issued?: string;
  payment_success?: string;
  payment_reminder?: string;
  contract_expiring?: string;
  trial_ending?: string;
  subscription_past_due?: string;
}

/** Tenant settings shape (partial — only what we need) */
interface TenantSettings {
  waTemplates?: WaTemplates;
  brandName?: string;
}

// ---------------------------------------------------------------------------
// Default templates (used when tenant has no custom template)
// ---------------------------------------------------------------------------

const DEFAULT_TEMPLATES: Record<NotificationType, string> = {
  invoice_issued:
    "Halo {nama}, tagihan Anda sebesar Rp {jumlah} telah diterbitkan. " +
    "Jatuh tempo: {jatuh_tempo}. Bayar di: {link}",
  payment_success:
    "Halo {nama}, pembayaran Anda sebesar Rp {jumlah} telah berhasil diterima. Terima kasih!",
  payment_reminder:
    "Halo {nama}, tagihan Anda sebesar Rp {jumlah} akan jatuh tempo pada {jatuh_tempo}. " +
    "Segera bayar di: {link}",
  contract_expiring:
    "Halo {nama}, kontrak kos Anda akan berakhir pada {jatuh_tempo}. " +
    "Silakan hubungi pengelola untuk perpanjangan.",
  trial_ending:
    "Halo {nama}, masa trial KosKita Anda akan berakhir pada {jatuh_tempo}. " +
    "Upgrade sekarang untuk melanjutkan layanan.",
  subscription_past_due:
    "Halo {nama}, pembayaran langganan KosKita Anda sebesar Rp {jumlah} sudah jatuh tempo. " +
    "Segera lakukan pembayaran untuk menghindari penangguhan.",
};

// ---------------------------------------------------------------------------
// Rate limiting — simple in-memory per-tenant token bucket
// ---------------------------------------------------------------------------

interface RateBucket {
  tokens: number;
  lastRefill: number;
}

/** Max messages per tenant per minute */
const RATE_LIMIT_PER_MINUTE = 30;
/** Refill interval in ms */
const REFILL_INTERVAL_MS = 60_000;

const rateBuckets = new Map<string, RateBucket>();

function checkAndConsumeRateLimit(tenantId: string): boolean {
  const now = Date.now();
  let bucket = rateBuckets.get(tenantId);

  if (!bucket) {
    bucket = { tokens: RATE_LIMIT_PER_MINUTE, lastRefill: now };
    rateBuckets.set(tenantId, bucket);
  }

  // Refill tokens based on elapsed time
  const elapsed = now - bucket.lastRefill;
  if (elapsed >= REFILL_INTERVAL_MS) {
    bucket.tokens = RATE_LIMIT_PER_MINUTE;
    bucket.lastRefill = now;
  }

  if (bucket.tokens <= 0) {
    return false;
  }

  bucket.tokens--;
  return true;
}

// ---------------------------------------------------------------------------
// NotificationService
// ---------------------------------------------------------------------------

export class NotificationService {
  private whatsapp: WhatsAppProvider;
  private email: EmailProvider;

  constructor() {
    this.whatsapp = new WhatsAppProvider();
    this.email = new EmailProvider();
  }

  // -------------------------------------------------------------------------
  // send — Req 9.1, 9.3, 9.4, 9.6
  // -------------------------------------------------------------------------

  /**
   * Send notification via configured channels (WA + email).
   * Fire-and-forget: logs failures but never throws.
   */
  async send(payload: NotificationPayload): Promise<void> {
    try {
      // Rate limit check — Req 9.5
      if (!checkAndConsumeRateLimit(payload.tenantId)) {
        console.warn(
          `[notifications] Rate limit exceeded for tenant ${payload.tenantId}. Skipping.`,
        );
        return;
      }

      const rendered = await this.renderTemplate(
        payload.tenantId,
        payload.type,
        payload.variables,
      );

      // Send WhatsApp if phone provided — Req 9.3
      if (payload.recipientPhone) {
        try {
          const buttons =
            payload.variables.link
              ? [{ text: "Bayar Sekarang", url: payload.variables.link }]
              : undefined;

          await this.whatsapp.sendMessage(
            payload.recipientPhone,
            rendered.body,
            buttons,
          );
        } catch (err) {
          // Fire-and-forget — Req 9.6
          console.error(
            `[notifications] WhatsApp send failed for ${payload.recipientPhone}:`,
            err instanceof Error ? err.message : err,
          );
        }
      }

      // Send email if email provided — Req 9.4
      if (payload.recipientEmail && rendered.subject) {
        try {
          const html = this.email.buildHtml(payload.type, payload.variables, rendered.body);
          await this.email.sendTransactional(
            payload.recipientEmail,
            rendered.subject,
            html,
          );
        } catch (err) {
          // Fire-and-forget — Req 9.6
          console.error(
            `[notifications] Email send failed for ${payload.recipientEmail}:`,
            err instanceof Error ? err.message : err,
          );
        }
      }
    } catch (err) {
      // Top-level catch — never throw from send()
      console.error(
        "[notifications] Unexpected error in send():",
        err instanceof Error ? err.message : err,
      );
    }
  }

  // -------------------------------------------------------------------------
  // renderTemplate — Req 9.1, 9.2
  // -------------------------------------------------------------------------

  /**
   * Render template with variables for a specific tenant.
   * Loads per-tenant templates from settings.waTemplates, falls back to defaults.
   */
  async renderTemplate(
    tenantId: string,
    type: NotificationType,
    variables: Record<string, string>,
  ): Promise<{ subject?: string; body: string }> {
    // Load tenant settings for custom templates — Req 9.1
    const template = await this.loadTenantTemplate(tenantId, type);

    // Interpolate variables — Req 9.2
    const body = interpolateVariables(template, variables);

    // Generate email subject based on type
    const subject = getEmailSubject(type, variables);

    return { subject, body };
  }

  // -------------------------------------------------------------------------
  // sendBatch — Req 9.7
  // -------------------------------------------------------------------------

  /**
   * Send bulk notifications with rate limiting.
   * Used by billing cron for batch invoice notifications.
   */
  async sendBatch(payloads: NotificationPayload[]): Promise<SendBatchResult> {
    const result: SendBatchResult = { sent: 0, failed: 0, errors: [] };

    for (const payload of payloads) {
      try {
        // Rate limit check per message — Req 9.5, 9.7
        if (!checkAndConsumeRateLimit(payload.tenantId)) {
          result.failed++;
          result.errors.push({
            recipient: payload.recipientPhone ?? payload.recipientEmail ?? "unknown",
            error: "Rate limit exceeded",
          });
          continue;
        }

        await this.send(payload);
        result.sent++;
      } catch (err) {
        result.failed++;
        result.errors.push({
          recipient: payload.recipientPhone ?? payload.recipientEmail ?? "unknown",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return result;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Load per-tenant template from settings.waTemplates.
   * Falls back to default template if not configured.
   */
  private async loadTenantTemplate(
    tenantId: string,
    type: NotificationType,
  ): Promise<string> {
    try {
      const db = getDb();
      const [tenant] = await db
        .select({ settings: tenantSaas.settings })
        .from(tenantSaas)
        .where(eq(tenantSaas.id, tenantId))
        .limit(1);

      if (tenant?.settings) {
        const settings = tenant.settings as TenantSettings;
        const customTemplate = settings.waTemplates?.[type];
        if (customTemplate) {
          return customTemplate;
        }
      }
    } catch (err) {
      console.warn(
        `[notifications] Failed to load tenant template for ${tenantId}:`,
        err instanceof Error ? err.message : err,
      );
    }

    return DEFAULT_TEMPLATES[type];
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Interpolate template variables: replace {key} with value.
 * Unmatched placeholders are left as-is.
 */
function interpolateVariables(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    return variables[key] ?? match;
  });
}

/** Generate email subject line based on notification type */
function getEmailSubject(
  type: NotificationType,
  variables: Record<string, string>,
): string {
  const nama = variables.nama ?? "Penghuni";

  switch (type) {
    case "invoice_issued":
      return `Tagihan Baru - ${variables.jumlah ?? ""}`;
    case "payment_success":
      return `Pembayaran Berhasil - Terima Kasih, ${nama}`;
    case "payment_reminder":
      return `Pengingat Pembayaran - Jatuh Tempo ${variables.jatuh_tempo ?? ""}`;
    case "contract_expiring":
      return `Kontrak Akan Berakhir - ${nama}`;
    case "trial_ending":
      return "Masa Trial KosKita Akan Berakhir";
    case "subscription_past_due":
      return "Pembayaran Langganan KosKita Jatuh Tempo";
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const notificationService = new NotificationService();
