"use server";

/**
 * Invoice (Tagihan) Server Actions — Task 17.1
 *
 * List and create invoices. Delegates reads to RealDataSource
 * and invoice creation to the billing engine.
 *
 * Requirements: 5.1, 4.1
 */

import crypto from "node:crypto";

import type { Invoice, InvoiceFilter } from "@/lib/mock/types";
import { withAuth } from "@/lib/server/auth/rbac";
import { RealDataSource } from "@/lib/server/datasource";
import { getDb } from "@/lib/server/db";
import { invoice, invoiceLine } from "@/lib/server/db/schema";
import { requireTenantId } from "@/lib/server/tenant";

const dataSource = new RealDataSource();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateInvoiceInput {
  contractId: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  lines: { description: string; amount: number }[];
}

// ---------------------------------------------------------------------------
// listInvoices — Req 5.1, 5.4
// ---------------------------------------------------------------------------

/** List invoices for the current tenant with optional filtering. */
export const listInvoices = withAuth(
  async (filter?: InvoiceFilter): Promise<Invoice[]> => {
    const tenantId = requireTenantId();
    return dataSource.listInvoices(tenantId, filter);
  },
  { requiredPermission: "invoice:write" },
);

// ---------------------------------------------------------------------------
// createInvoice — Req 4.1
// ---------------------------------------------------------------------------

/** Manually create an invoice for a contract. */
export const createInvoice = withAuth(
  async (data: CreateInvoiceInput): Promise<{ id: string }> => {
    const tenantId = requireTenantId();
    const db = getDb();

    // Generate invoice number (INV-YYYY-random)
    const year = new Date().getFullYear();
    const seq = crypto.randomBytes(3).toString("hex").toUpperCase();
    const invoiceNumber = `INV-${year}-${seq}`;

    // Generate unique payment link token
    const paymentLinkToken = crypto.randomUUID();

    // Calculate total from lines
    const total = data.lines.reduce((sum, line) => sum + line.amount, 0);

    // Insert invoice
    const [created] = await db
      .insert(invoice)
      .values({
        tenantId,
        contractId: data.contractId,
        invoiceNumber,
        paymentLinkToken,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        dueDate: data.dueDate,
        total: total.toFixed(2),
        status: "tertagih",
      })
      .returning({ id: invoice.id });

    // Insert line items
    if (data.lines.length > 0) {
      await db.insert(invoiceLine).values(
        data.lines.map((line) => ({
          tenantId,
          invoiceId: created.id,
          description: line.description,
          amount: line.amount.toFixed(2),
        })),
      );
    }

    return { id: created.id };
  },
  { requiredPermission: "invoice:write" },
);
