/**
 * Payment Gateway Service — Task 8.1
 *
 * Per-tenant payment gateway integration (Xendit). Creates payment requests,
 * manages credentials, and provides active channel queries.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

import crypto from "node:crypto";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/server/db";
import { gatewayConfig, payment, paymentChannel } from "@/lib/server/db/schema";
import { requireTenantId } from "@/lib/server/tenant";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreatePaymentRequest {
  invoiceId: string;
  channelCode: string;
  amount: number;
  description: string;
  expiresInMinutes?: number;
}

export interface PaymentResponse {
  externalPaymentId: string;
  paymentReference: string;
  status: "pending";
  qrCodeUrl?: string;
  vaNumber?: string;
  redirectUrl?: string;
  paymentCode?: string;
  expiresAt: string;
}

export interface PaymentChannelView {
  id: string;
  channelType: string;
  channelCode: string;
  displayName: string;
  mdrPercent: string;
  feeBearer: string;
}

// ---------------------------------------------------------------------------
// Encryption helpers (AES-256-GCM)
// ---------------------------------------------------------------------------

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }
  // Key should be 32 bytes (hex-encoded = 64 chars)
  return Buffer.from(key, "hex");
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns base64-encoded string: iv + authTag + ciphertext.
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Pack: iv (12) + authTag (16) + ciphertext
  const packed = Buffer.concat([iv, authTag, encrypted]);
  return packed.toString("base64");
}

/**
 * Decrypt a base64-encoded AES-256-GCM ciphertext.
 * Expects format: iv (12 bytes) + authTag (16 bytes) + ciphertext.
 */
export function decrypt(encryptedBase64: string): string {
  const key = getEncryptionKey();
  const packed = Buffer.from(encryptedBase64, "base64");

  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

// ---------------------------------------------------------------------------
// Channel → method type mapping
// ---------------------------------------------------------------------------

type ChannelMethodType = "QR_CODE" | "VIRTUAL_ACCOUNT" | "EWALLET" | "OVER_THE_COUNTER";

const CHANNEL_TYPE_MAP: Record<string, ChannelMethodType> = {
  qris: "QR_CODE",
  va: "VIRTUAL_ACCOUNT",
  ewallet: "EWALLET",
  retail: "OVER_THE_COUNTER",
};

/** Default expiration in minutes per channel type. Req 6.5 */
const DEFAULT_EXPIRY_MINUTES: Record<string, number> = {
  qris: 30,
  va: 1440, // 24h
  ewallet: 60,
  retail: 1440, // 24h
};

// ---------------------------------------------------------------------------
// Payment Gateway Service
// ---------------------------------------------------------------------------

export class PaymentGatewayService {
  /**
   * Create a payment request using the tenant's gateway credentials.
   * Returns existing pending payment if duplicate (same invoice + channel).
   * Req 6.1–6.7
   */
  async createPayment(req: CreatePaymentRequest): Promise<PaymentResponse> {
    const tenantId = requireTenantId();
    const db = getDb();

    // Check for existing pending payment (dedup). Req 6.6
    const [existing] = await db
      .select()
      .from(payment)
      .where(
        and(
          eq(payment.tenantId, tenantId),
          eq(payment.invoiceId, req.invoiceId),
          eq(payment.channelCode, req.channelCode),
          eq(payment.status, "pending"),
        ),
      )
      .limit(1);

    if (existing) {
      return {
        externalPaymentId: existing.externalPaymentId ?? "",
        paymentReference: existing.paymentReference,
        status: "pending",
        expiresAt: existing.expiresAt?.toISOString() ?? "",
      };
    }

    // Load tenant gateway config. Req 6.1
    const [config] = await db
      .select()
      .from(gatewayConfig)
      .where(and(eq(gatewayConfig.tenantId, tenantId), eq(gatewayConfig.isActive, true)))
      .limit(1);

    if (!config) {
      throw new Error("No active gateway configuration for this tenant");
    }

    // Resolve channel info
    const [channel] = await db
      .select()
      .from(paymentChannel)
      .where(
        and(
          eq(paymentChannel.tenantId, tenantId),
          eq(paymentChannel.channelCode, req.channelCode),
          eq(paymentChannel.isEnabled, true),
        ),
      )
      .limit(1);

    if (!channel) {
      throw new Error(
        `Payment channel '${req.channelCode}' is not enabled for this tenant`,
      );
    }

    // Decrypt API key. Req 6.1, 6.7
    const apiKey = decrypt(config.apiKeyEncrypted);

    // Generate unique payment reference. Req 6.4
    const paymentReference = generatePaymentReference();

    // Determine expiration. Req 6.5
    const expiryMinutes =
      req.expiresInMinutes ?? DEFAULT_EXPIRY_MINUTES[channel.channelType] ?? 1440;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Determine payment method type for Xendit
    const methodType = CHANNEL_TYPE_MAP[channel.channelType] ?? "QR_CODE";

    // Create payment request via Xendit SDK. Req 6.2, 6.3
    const xenditResponse = await createXenditPaymentRequest({
      apiKey,
      paymentReference,
      amount: req.amount,
      channelCode: req.channelCode,
      channelType: methodType,
      description: req.description,
    });

    // Persist payment record
    await db.insert(payment).values({
      tenantId,
      invoiceId: req.invoiceId,
      channelId: channel.id,
      paymentReference,
      externalPaymentId: xenditResponse.externalPaymentId,
      channelCode: req.channelCode,
      method: channel.channelType,
      amountPaid: req.amount.toString(),
      expiresAt,
      status: "pending",
    });

    return {
      externalPaymentId: xenditResponse.externalPaymentId,
      paymentReference,
      status: "pending",
      qrCodeUrl: xenditResponse.qrCodeUrl,
      vaNumber: xenditResponse.vaNumber,
      redirectUrl: xenditResponse.redirectUrl,
      paymentCode: xenditResponse.paymentCode,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Get enabled payment channels for a tenant. Req 6.2, 6.3
   */
  async getActiveChannels(tenantId: string): Promise<PaymentChannelView[]> {
    const db = getDb();

    const channels = await db
      .select({
        id: paymentChannel.id,
        channelType: paymentChannel.channelType,
        channelCode: paymentChannel.channelCode,
        displayName: paymentChannel.displayName,
        mdrPercent: paymentChannel.mdrPercent,
        feeBearer: paymentChannel.feeBearer,
      })
      .from(paymentChannel)
      .innerJoin(gatewayConfig, eq(paymentChannel.gatewayConfigId, gatewayConfig.id))
      .where(
        and(
          eq(paymentChannel.tenantId, tenantId),
          eq(paymentChannel.isEnabled, true),
          eq(gatewayConfig.isActive, true),
        ),
      );

    return channels.map((ch) => ({
      id: ch.id,
      channelType: ch.channelType,
      channelCode: ch.channelCode,
      displayName: ch.displayName,
      mdrPercent: ch.mdrPercent ?? "0",
      feeBearer: ch.feeBearer ?? "owner",
    }));
  }
}

// ---------------------------------------------------------------------------
// Xendit SDK integration
// ---------------------------------------------------------------------------

interface XenditPaymentParams {
  apiKey: string;
  paymentReference: string;
  amount: number;
  channelCode: string;
  channelType: ChannelMethodType;
  description: string;
}

interface XenditPaymentResult {
  externalPaymentId: string;
  qrCodeUrl?: string;
  vaNumber?: string;
  redirectUrl?: string;
  paymentCode?: string;
}

/**
 * Create a payment request via the Xendit SDK.
 * Uses xendit-node@6.0.0 PaymentRequest API.
 */
async function createXenditPaymentRequest(
  params: XenditPaymentParams,
): Promise<XenditPaymentResult> {
  const { default: Xendit } = await import("xendit-node");

  const xendit = new Xendit({ secretKey: params.apiKey });

  const paymentMethodType = params.channelType;

  const response = await xendit.PaymentRequest.createPaymentRequest({
    data: {
      referenceId: params.paymentReference,
      amount: params.amount,
      currency: "IDR",
      paymentMethod: {
        type: paymentMethodType,
        reusability: "ONE_TIME_USE",
        ...(paymentMethodType === "QR_CODE" && {
          qrCode: { channelCode: params.channelCode as "QRIS" },
        }),
        ...(paymentMethodType === "VIRTUAL_ACCOUNT" && {
          virtualAccount: {
            channelCode: params.channelCode as "BCA",
            channelProperties: { customerName: "KosKita Resident" },
          },
        }),
        ...(paymentMethodType === "EWALLET" && {
          ewallet: {
            channelCode: params.channelCode as "DANA",
            channelProperties: {
              successReturnUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/pay/success`,
            },
          },
        }),
        ...(paymentMethodType === "OVER_THE_COUNTER" && {
          overTheCounter: {
            channelCode: params.channelCode as "ALFAMART",
            channelProperties: { customerName: "KosKita Resident" },
          },
        }),
      },
      description: params.description,
    },
  });

  // Extract channel-specific data from the response actions
  const result: XenditPaymentResult = {
    externalPaymentId: response.id,
  };

  // Parse actions for QR code URL, redirect URL, etc.
  if (response.actions) {
    for (const action of response.actions) {
      if (action.qrCode) {
        result.qrCodeUrl = action.qrCode;
      }
      if (action.url && action.urlType === "WEB") {
        result.redirectUrl = action.url;
      }
      if (action.url && action.urlType === "DEEPLINK") {
        result.redirectUrl = result.redirectUrl ?? action.url;
      }
    }
  }

  // Extract VA number or payment code from payment method
  const pm = response.paymentMethod;
  if (pm && "virtualAccount" in pm) {
    const va = (pm as unknown as Record<string, unknown>).virtualAccount as
      | { channelProperties?: { virtualAccountNumber?: string } }
      | undefined;
    result.vaNumber = va?.channelProperties?.virtualAccountNumber;
  }
  if (pm && "overTheCounter" in pm) {
    const otc = (pm as unknown as Record<string, unknown>).overTheCounter as
      | { channelProperties?: { paymentCode?: string } }
      | undefined;
    result.paymentCode = otc?.channelProperties?.paymentCode;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a globally unique payment reference. Req 6.4 */
function generatePaymentReference(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(8).toString("hex");
  return `PAY-${timestamp}-${random}`;
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const paymentGatewayService = new PaymentGatewayService();
