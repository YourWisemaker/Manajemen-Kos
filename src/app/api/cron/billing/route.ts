import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { formatRupiah } from "@/lib/locale/rupiah";
import { billingEngine } from "@/lib/server/billing/engine";
import { getDb } from "@/lib/server/db";
import { contract, invoice, kosTenant } from "@/lib/server/db/schema";
import { notificationService } from "@/lib/server/notifications";
import { withTenantContext } from "@/lib/server/tenant";

/**
 * POST /api/cron/billing
 *
 * Billing cron endpoint — generates monthly invoices and applies late fees.
 * Protected by CRON_SECRET in the authorization header.
 *
 * Req 8.1, 8.7
 */
export async function POST(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const invoiceResult = await billingEngine.generateMonthlyInvoices();
    const lateFeeResult = await billingEngine.applyLateFees();

    let notificationsSent = 0;
    const notificationErrors: string[] = [];

    for (const inv of invoiceResult.invoices) {
      try {
        await withTenantContext(
          { tenantId: inv.tenantId, userId: null, role: null, isSuperAdmin: false },
          async () => {
            const db = getDb();

            const [contractData] = await db
              .select({
                residentName: kosTenant.fullName,
                residentPhone: kosTenant.phone,
                residentEmail: kosTenant.email,
              })
              .from(contract)
              .innerJoin(kosTenant, eq(contract.kosTenantId, kosTenant.id))
              .where(eq(contract.id, inv.contractId))
              .limit(1);

            const [invData] = await db
              .select({
                invoiceNumber: invoice.invoiceNumber,
                paymentLinkToken: invoice.paymentLinkToken,
              })
              .from(invoice)
              .where(eq(invoice.id, inv.invoiceId))
              .limit(1);

            if (contractData && invData) {
              const amountFormatted = formatRupiah(Number(inv.total), {
                showSymbol: false,
              });
              const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://koskita.id";
              const paymentLink = `${baseUrl}/pay/${invData.paymentLinkToken}`;

              await notificationService.send({
                type: "invoice_issued",
                tenantId: inv.tenantId,
                recipientPhone: contractData.residentPhone ?? undefined,
                recipientEmail: contractData.residentEmail ?? undefined,
                variables: {
                  nama: contractData.residentName,
                  jumlah: amountFormatted,
                  jatuh_tempo: inv.dueDate,
                  link: paymentLink,
                },
              });
              notificationsSent++;
            }
          },
        );
      } catch (err) {
        notificationErrors.push(
          `${inv.invoiceId}: ${err instanceof Error ? err.message : "Unknown"}`,
        );
      }
    }

    return NextResponse.json({
      success: true,
      invoices: {
        generated: invoiceResult.generated,
        skipped: invoiceResult.skipped,
        errors: invoiceResult.errors.length,
      },
      notifications: {
        sent: notificationsSent,
        errors: notificationErrors.length,
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
