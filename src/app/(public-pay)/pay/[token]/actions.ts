"use server";

/**
 * Public Payment Page Server Actions — Task 17.2
 *
 * Actions for the public payment page (`/pay/[token]`).
 * These are public-facing (no auth required) but still resolve tenant context
 * from the payment token.
 *
 * Requirements: 5.5, 6.2
 */

import type { PublicInvoiceView } from "@/lib/data";
import { withAuth } from "@/lib/server/auth/rbac";
import { RealDataSource } from "@/lib/server/datasource";
import {
  type PaymentResponse,
  paymentGatewayService,
} from "@/lib/server/payments/gateway";

const dataSource = new RealDataSource();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InitiatePaymentInput {
  invoiceId: string;
  channelCode: string;
  amount: number;
}

// ---------------------------------------------------------------------------
// getPublicInvoice — Req 5.5, 5.6
// ---------------------------------------------------------------------------

/**
 * Fetch the public invoice view by payment link token.
 * Returns null for invalid/unknown tokens.
 * No authentication required (public payment page).
 */
export const getPublicInvoice = withAuth(
  async (token: string): Promise<PublicInvoiceView | null> => {
    return dataSource.getInvoiceByToken(token);
  },
  { allowPublic: true },
);

// ---------------------------------------------------------------------------
// initiatePayment — Req 6.2
// ---------------------------------------------------------------------------

/**
 * Initiate a payment request for a public invoice.
 * Creates a payment via the tenant's configured gateway.
 * No authentication required (public payment page).
 */
export const initiatePayment = withAuth(
  async (data: InitiatePaymentInput): Promise<PaymentResponse> => {
    return paymentGatewayService.createPayment({
      invoiceId: data.invoiceId,
      channelCode: data.channelCode,
      amount: data.amount,
      description: `Pembayaran tagihan kos`,
    });
  },
  { allowPublic: true },
);
