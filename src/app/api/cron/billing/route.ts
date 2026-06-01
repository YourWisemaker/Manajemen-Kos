import { NextResponse } from "next/server";

import { billingEngine } from "@/lib/server/billing/engine";

/**
 * POST /api/cron/billing
 *
 * Billing cron endpoint — generates monthly invoices and applies late fees.
 * Protected by CRON_SECRET in the authorization header.
 *
 * Req 8.1, 8.7
 */
export async function POST(request: Request): Promise<NextResponse> {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Generate monthly invoices
    const invoiceResult = await billingEngine.generateMonthlyInvoices();

    // Apply late fees to overdue invoices
    const lateFeeResult = await billingEngine.applyLateFees();

    return NextResponse.json({
      success: true,
      invoices: {
        generated: invoiceResult.generated,
        skipped: invoiceResult.skipped,
        errors: invoiceResult.errors.length,
      },
      lateFees: {
        applied: lateFeeResult.applied,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
