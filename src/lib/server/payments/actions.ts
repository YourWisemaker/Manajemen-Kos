"use server";

/**
 * Payment Channel Management — Task 8.6
 *
 * Server Actions for managing gateway_config and payment_channel records.
 * Supports enabling/disabling channels per tenant.
 *
 * Requirements: 6.2, 6.3
 */

import { and, eq } from "drizzle-orm";
import { withAuth } from "@/lib/server/auth/rbac";
import { getDb } from "@/lib/server/db";
import { gatewayConfig, invoice, payment, paymentChannel } from "@/lib/server/db/schema";
import type { PaymentChannelView } from "@/lib/server/payments/gateway";
import { encrypt } from "@/lib/server/payments/gateway";
import { requireTenantId } from "@/lib/server/tenant";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GatewayConfigInput {
  provider: string;
  apiKey: string;
  webhookToken: string;
  callbackToken: string;
  settlementAccount?: string;
}

export interface PaymentChannelInput {
  gatewayConfigId: string;
  channelType: string;
  channelCode: string;
  displayName: string;
  mdrPercent?: string;
  feeBearer?: string;
}

// ---------------------------------------------------------------------------
// Gateway Config Actions
// ---------------------------------------------------------------------------

/** Create or update gateway configuration for the current tenant. */
export const upsertGatewayConfig = withAuth(
  async (input: GatewayConfigInput): Promise<{ id: string }> => {
    const tenantId = requireTenantId();
    const db = getDb();

    // Encrypt sensitive credentials
    const apiKeyEncrypted = encrypt(input.apiKey);
    const webhookTokenEncrypted = encrypt(input.webhookToken);

    // Check if config already exists for this tenant + provider
    const [existing] = await db
      .select({ id: gatewayConfig.id })
      .from(gatewayConfig)
      .where(
        and(
          eq(gatewayConfig.tenantId, tenantId),
          eq(gatewayConfig.provider, input.provider),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(gatewayConfig)
        .set({
          apiKeyEncrypted,
          webhookTokenEncrypted,
          callbackToken: input.callbackToken,
          settlementAccount: input.settlementAccount ?? null,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(gatewayConfig.id, existing.id));
      return { id: existing.id };
    }

    const [created] = await db
      .insert(gatewayConfig)
      .values({
        tenantId,
        provider: input.provider,
        apiKeyEncrypted,
        webhookTokenEncrypted,
        callbackToken: input.callbackToken,
        settlementAccount: input.settlementAccount ?? null,
        isActive: true,
      })
      .returning({ id: gatewayConfig.id });

    return { id: created.id };
  },
  { requiredPermission: "settings:write" },
);

/** Deactivate a gateway configuration. */
export const deactivateGatewayConfig = withAuth(
  async (configId: string): Promise<void> => {
    const tenantId = requireTenantId();
    const db = getDb();

    await db
      .update(gatewayConfig)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(gatewayConfig.id, configId), eq(gatewayConfig.tenantId, tenantId)));
  },
  { requiredPermission: "settings:write" },
);

// ---------------------------------------------------------------------------
// Payment Channel Actions
// ---------------------------------------------------------------------------

/** Add a payment channel for the current tenant. */
export const addPaymentChannel = withAuth(
  async (input: PaymentChannelInput): Promise<{ id: string }> => {
    const tenantId = requireTenantId();
    const db = getDb();

    const [created] = await db
      .insert(paymentChannel)
      .values({
        tenantId,
        gatewayConfigId: input.gatewayConfigId,
        channelType: input.channelType,
        channelCode: input.channelCode,
        displayName: input.displayName,
        mdrPercent: input.mdrPercent ?? "0",
        feeBearer: input.feeBearer ?? "owner",
        isEnabled: true,
      })
      .returning({ id: paymentChannel.id });

    return { id: created.id };
  },
  { requiredPermission: "settings:write" },
);

/** Enable a payment channel. Req 6.2 */
export const enablePaymentChannel = withAuth(
  async (channelId: string): Promise<void> => {
    const tenantId = requireTenantId();
    const db = getDb();

    await db
      .update(paymentChannel)
      .set({ isEnabled: true })
      .where(
        and(eq(paymentChannel.id, channelId), eq(paymentChannel.tenantId, tenantId)),
      );
  },
  { requiredPermission: "settings:write" },
);

/** Disable a payment channel. Req 6.3 */
export const disablePaymentChannel = withAuth(
  async (channelId: string): Promise<void> => {
    const tenantId = requireTenantId();
    const db = getDb();

    await db
      .update(paymentChannel)
      .set({ isEnabled: false })
      .where(
        and(eq(paymentChannel.id, channelId), eq(paymentChannel.tenantId, tenantId)),
      );
  },
  { requiredPermission: "settings:write" },
);

/** Get active payment channels for the payment page. Req 6.2, 6.3 */
export const getActiveChannels = withAuth(
  async (): Promise<PaymentChannelView[]> => {
    const tenantId = requireTenantId();
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
  },
  { requiredPermission: "settings:write" },
);

/** Get active channels for public payment page (no auth required). */
export const getPublicActiveChannels = withAuth(
  async (tenantId: string): Promise<PaymentChannelView[]> => {
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
  },
  { allowPublic: true },
);

// ---------------------------------------------------------------------------
// Cash Recording — PRD requirement: manual cash payment recording
// ---------------------------------------------------------------------------

export interface RecordCashPaymentInput {
  invoiceId: string;
  amountPaid: number;
}

/** Record a manual cash payment against an invoice. */
export const recordCashPayment = withAuth(
  async (input: RecordCashPaymentInput): Promise<{ paymentId: string }> => {
    const tenantId = requireTenantId();
    const db = getDb();

    const crypto = await import("node:crypto");
    const reference = `CASH-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    const [pay] = await db
      .insert(payment)
      .values({
        tenantId,
        invoiceId: input.invoiceId,
        paymentReference: reference,
        channelCode: "CASH",
        method: "cash",
        amountPaid: input.amountPaid.toFixed(2),
        adminFee: "0",
        paidAt: new Date(),
        status: "success",
      })
      .returning({ id: payment.id });

    await db
      .update(invoice)
      .set({ status: "lunas", updatedAt: new Date() })
      .where(and(eq(invoice.id, input.invoiceId), eq(invoice.tenantId, tenantId)));

    return { paymentId: pay.id };
  },
  { requiredPermission: "payment:verify" },
);
