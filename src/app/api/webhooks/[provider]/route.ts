/**
 * Webhook Handler — Task 8.2
 *
 * Receives payment gateway callbacks (Xendit), verifies signatures,
 * processes payment events idempotently, and updates invoice/payment records.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8
 */

import crypto from "node:crypto";

import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { formatRupiah } from "@/lib/locale/rupiah";
import { getDb } from "@/lib/server/db";
import {
  contract,
  gatewayConfig,
  invoice,
  kosTenant,
  payment,
} from "@/lib/server/db/schema";
import { notificationService } from "@/lib/server/notifications";
import { decrypt } from "@/lib/server/payments/gateway";

// ---------------------------------------------------------------------------
// POST /api/webhooks/[provider]
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
): Promise<NextResponse> {
  const { provider } = await params;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const signature = request.headers.get("x-callback-token") ?? "";

    // Step 1: Identify tenant from callback token. Req 7.1
    const callbackToken = extractCallbackToken(provider, body, signature);
    const db = getDb();

    const [config] = await db
      .select()
      .from(gatewayConfig)
      .where(eq(gatewayConfig.callbackToken, callbackToken))
      .limit(1);

    if (!config) {
      return NextResponse.json({ error: "Unknown callback token" }, { status: 401 });
    }

    const tenantId = config.tenantId;

    // Step 2: Verify webhook signature. Req 7.2, 7.3
    const webhookSecret = decrypt(config.webhookTokenEncrypted);
    const isValid = verifyWebhookSignature(provider, signature, webhookSecret);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    // Step 3: Extract payment reference and check idempotency. Req 7.6
    const paymentRef = extractPaymentReference(provider, body);

    const [existingPayment] = await db
      .select()
      .from(payment)
      .where(eq(payment.paymentReference, paymentRef))
      .limit(1);

    if (existingPayment?.status === "success") {
      // Already processed — return 200 OK (idempotent)
      return NextResponse.json({ status: "already_processed" });
    }

    // Step 4: Process based on event type. Req 7.4, 7.5
    const eventType = extractEventType(provider, body);

    if (eventType === "payment.success") {
      const invoiceId = existingPayment?.invoiceId ?? resolveInvoiceId(body);

      if (!invoiceId) {
        return NextResponse.json({ error: "Cannot resolve invoice" }, { status: 400 });
      }

      // Update or create payment record + update invoice in transaction
      await db.transaction(async (tx) => {
        if (existingPayment) {
          // Update existing pending payment to success
          await tx
            .update(payment)
            .set({
              status: "success",
              paidAt: new Date(),
              externalPaymentId: extractExternalId(provider, body),
              rawWebhook: body, // Req 7.8
            })
            .where(eq(payment.paymentReference, paymentRef));
        } else {
          // Create new payment record
          await tx.insert(payment).values({
            tenantId,
            invoiceId,
            paymentReference: paymentRef,
            externalPaymentId: extractExternalId(provider, body),
            channelCode: extractChannelCode(provider, body),
            method: extractMethod(provider, body),
            amountPaid: extractAmount(provider, body).toString(),
            paidAt: new Date(),
            status: "success",
            rawWebhook: body, // Req 7.8
          });
        }

        // Update invoice status to "lunas". Req 7.4
        await tx
          .update(invoice)
          .set({ status: "lunas", updatedAt: new Date() })
          .where(and(eq(invoice.id, invoiceId), eq(invoice.tenantId, tenantId)));
      });

      // Trigger notification to resident + tenant owner — Req 7.7
      try {
        const [invData] = await db
          .select({
            invoiceNumber: invoice.invoiceNumber,
            contractId: invoice.contractId,
            total: invoice.total,
          })
          .from(invoice)
          .where(eq(invoice.id, invoiceId))
          .limit(1);

        if (invData?.contractId) {
          const [contractData] = await db
            .select({
              residentName: kosTenant.fullName,
              residentPhone: kosTenant.phone,
              residentEmail: kosTenant.email,
            })
            .from(contract)
            .innerJoin(kosTenant, eq(contract.kosTenantId, kosTenant.id))
            .where(eq(contract.id, invData.contractId))
            .limit(1);

          const amountFormatted = formatRupiah(
            Number(invData.total ?? extractAmount(provider, body)),
            { showSymbol: false },
          );

          if (contractData) {
            await notificationService.send({
              type: "payment_success",
              tenantId,
              recipientPhone: contractData.residentPhone ?? undefined,
              recipientEmail: contractData.residentEmail ?? undefined,
              variables: {
                nama: contractData.residentName,
                jumlah: amountFormatted,
                invoice_number: invData.invoiceNumber,
              },
            });
          }
        }
      } catch (notifErr) {
        console.error("[webhook] Notification failed (non-blocking):", notifErr);
      }
    } else if (eventType === "payment.expired") {
      // Update payment status to "expired". Req 7.5
      if (existingPayment) {
        await db
          .update(payment)
          .set({ status: "expired", rawWebhook: body })
          .where(eq(payment.paymentReference, paymentRef));
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[webhook] Processing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Provider-specific extraction helpers
// ---------------------------------------------------------------------------

/**
 * Extract callback token from the webhook.
 * Xendit sends the callback token in the X-Callback-Token header.
 */
function extractCallbackToken(
  _provider: string,
  _body: Record<string, unknown>,
  headerToken: string,
): string {
  // Xendit uses X-Callback-Token header as the callback token
  return headerToken;
}

/**
 * Verify webhook signature.
 * Xendit: X-Callback-Token header must match the stored webhook token.
 * Req 7.2
 */
function verifyWebhookSignature(
  _provider: string,
  signature: string,
  webhookSecret: string,
): boolean {
  // Xendit verification: callback token must match stored secret
  if (!signature || !webhookSecret) return false;
  // Constant-time comparison to prevent timing attacks
  const sigBuf = Buffer.from(signature);
  const secretBuf = Buffer.from(webhookSecret);
  if (sigBuf.length !== secretBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, secretBuf);
}

/**
 * Extract payment reference from webhook body.
 * Xendit sends it as `data.reference_id` or `reference_id`.
 */
function extractPaymentReference(
  _provider: string,
  body: Record<string, unknown>,
): string {
  const data = body.data as Record<string, unknown> | undefined;
  return (
    (data?.reference_id as string) ??
    (body.reference_id as string) ??
    (body.external_id as string) ??
    ""
  );
}

/**
 * Extract event type from webhook body.
 * Xendit sends `event` field (e.g. "payment.succeeded").
 */
function extractEventType(_provider: string, body: Record<string, unknown>): string {
  const event = (body.event as string) ?? "";
  // Normalize Xendit event names
  if (event.includes("succeeded") || event.includes("paid")) {
    return "payment.success";
  }
  if (event.includes("expired") || event.includes("failed")) {
    return "payment.expired";
  }
  // Fallback: check status field
  const data = body.data as Record<string, unknown> | undefined;
  const status = (data?.status as string) ?? (body.status as string) ?? "";
  if (status === "SUCCEEDED" || status === "PAID") {
    return "payment.success";
  }
  if (status === "EXPIRED" || status === "FAILED") {
    return "payment.expired";
  }
  return event;
}

/** Extract external payment ID from webhook body. */
function extractExternalId(_provider: string, body: Record<string, unknown>): string {
  const data = body.data as Record<string, unknown> | undefined;
  return (data?.id as string) ?? (body.id as string) ?? "";
}

/** Extract channel code from webhook body. */
function extractChannelCode(_provider: string, body: Record<string, unknown>): string {
  const data = body.data as Record<string, unknown> | undefined;
  const pm = data?.payment_method as Record<string, unknown> | undefined;
  return (pm?.channel_code as string) ?? (body.channel_code as string) ?? "UNKNOWN";
}

/** Extract payment method type from webhook body. */
function extractMethod(_provider: string, body: Record<string, unknown>): string {
  const data = body.data as Record<string, unknown> | undefined;
  const pm = data?.payment_method as Record<string, unknown> | undefined;
  const type = (pm?.type as string) ?? (body.payment_method_type as string);
  // Map Xendit types to our channel types
  const typeMap: Record<string, string> = {
    QR_CODE: "qris",
    VIRTUAL_ACCOUNT: "va",
    EWALLET: "ewallet",
    OVER_THE_COUNTER: "retail",
  };
  return typeMap[type ?? ""] ?? "other";
}

/** Extract payment amount from webhook body. */
function extractAmount(_provider: string, body: Record<string, unknown>): number {
  const data = body.data as Record<string, unknown> | undefined;
  return Number(data?.amount ?? body.amount ?? 0);
}

/** Resolve invoice ID from webhook body metadata. */
function resolveInvoiceId(body: Record<string, unknown>): string | null {
  const data = body.data as Record<string, unknown> | undefined;
  const metadata = data?.metadata as Record<string, unknown> | undefined;
  return (metadata?.invoice_id as string) ?? null;
}
