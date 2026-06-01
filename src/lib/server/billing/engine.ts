import crypto from "node:crypto";
import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import { getDb, withTenantDb } from "@/lib/server/db";
import type * as schema from "@/lib/server/db/schema";
import {
  billingComponent,
  contract,
  invoice,
  invoiceLine,
  meterReading,
  room,
  tenantSaas,
} from "@/lib/server/db/schema";
import { withTenantContext } from "@/lib/server/tenant";

/**
 * A Drizzle database or transaction instance that supports select/insert/update.
 * Used to allow both full DB clients and transactions as parameters.
 */
// biome-ignore lint/suspicious/noExplicitAny: Drizzle generic variance
type DbOrTx = PgDatabase<PgQueryResultHKT, typeof schema, any>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Billing engine configuration. Req 8.1, 8.8 */
export interface BillingConfig {
  /** Days before due date to generate invoices (default H-5). */
  generateDaysBefore: number;
  /** Late fee percentage of invoice total (default 5%). */
  lateFeePercent: number;
  /** Maximum late fee amount in IDR. */
  lateFeeMaxAmount: number;
  /** Days after due date before late fee applies. */
  gracePeriodDays: number;
}

export interface BillingResult {
  generated: number;
  skipped: number;
  errors: { contractId: string; error: string }[];
}

export interface DepositRefundResult {
  originalDeposit: number;
  deductions: { reason: string; amount: number }[];
  refundAmount: number;
}

// ---------------------------------------------------------------------------
// Default config
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: BillingConfig = {
  generateDaysBefore: 5,
  lateFeePercent: 5,
  lateFeeMaxAmount: 500_000,
  gracePeriodDays: 7,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function startOfMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function endOfMonth(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const lastDay = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

// ---------------------------------------------------------------------------
// BillingEngine — Req 8.1–8.9, 16.1–16.2, 17.2
// ---------------------------------------------------------------------------

/**
 * Automated billing engine for monthly invoice generation, late fees,
 * deposits, and prorated billing.
 */
export class BillingEngine {
  private config: BillingConfig;

  constructor(config: Partial<BillingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // -------------------------------------------------------------------------
  // 7.1 — generateMonthlyInvoices (Req 8.1–8.6)
  // -------------------------------------------------------------------------

  /**
   * Generate invoices for all active contracts due within H-5 of targetDate.
   * Idempotent: skips contracts that already have an invoice for the period.
   */
  async generateMonthlyInvoices(targetDate: Date = new Date()): Promise<BillingResult> {
    const db = getDb();
    const dueDate = addDays(targetDate, this.config.generateDaysBefore);
    const dueDateStr = formatDateStr(dueDate);
    const periodStartStr = startOfMonth(dueDate);
    const periodEndStr = endOfMonth(dueDate);

    // Fetch all active tenants
    const tenants = await db
      .select({ id: tenantSaas.id })
      .from(tenantSaas)
      .where(eq(tenantSaas.status, "active"));

    const results: BillingResult = { generated: 0, skipped: 0, errors: [] };

    for (const { id: tenantId } of tenants) {
      await withTenantContext(
        { tenantId, userId: null, role: null, isSuperAdmin: false },
        async () => {
          await withTenantDb(tenantId, async (tdb) => {
            // Active contracts covering the billing period
            const contracts = await tdb
              .select()
              .from(contract)
              .where(
                and(
                  eq(contract.tenantId, tenantId),
                  eq(contract.status, "active"),
                  lte(contract.startDate, dueDateStr),
                  gte(contract.endDate, dueDateStr),
                ),
              );

            for (const c of contracts) {
              try {
                // Idempotency check — Req 8.6
                const existing = await tdb
                  .select({ id: invoice.id })
                  .from(invoice)
                  .where(
                    and(
                      eq(invoice.contractId, c.id),
                      eq(invoice.periodStart, periodStartStr),
                      eq(invoice.periodEnd, periodEndStr),
                    ),
                  );

                if (existing.length > 0) {
                  results.skipped++;
                  continue;
                }

                // Billing components for the property
                const components = await tdb
                  .select()
                  .from(billingComponent)
                  .where(eq(billingComponent.propertyId, c.roomId));

                // Also get property-level components
                const roomData = await tdb
                  .select({ propertyId: room.propertyId })
                  .from(room)
                  .where(eq(room.id, c.roomId));

                const propertyId = roomData[0]?.propertyId;
                const propertyComponents = propertyId
                  ? await tdb
                      .select()
                      .from(billingComponent)
                      .where(eq(billingComponent.propertyId, propertyId))
                  : components;

                // Build line items — Req 8.2, 8.3
                const lines = await this.buildInvoiceLines(
                  tdb,
                  c,
                  propertyComponents,
                  dueDate,
                );

                const total = lines
                  .reduce((sum, l) => sum + Number(l.amount), 0)
                  .toFixed(2);

                // Create invoice + lines in a transaction — Req 8.4, 8.5
                await tdb.transaction(async (tx) => {
                  const invNumber = await this.generateInvoiceNumber(tx, tenantId);
                  const token = crypto.randomUUID();

                  const [inv] = await tx
                    .insert(invoice)
                    .values({
                      tenantId,
                      contractId: c.id,
                      invoiceNumber: invNumber,
                      paymentLinkToken: token,
                      periodStart: periodStartStr,
                      periodEnd: periodEndStr,
                      dueDate: dueDateStr,
                      total,
                      status: "tertagih",
                    })
                    .returning();

                  await tx.insert(invoiceLine).values(
                    lines.map((l) => ({
                      tenantId,
                      invoiceId: inv.id,
                      description: l.description,
                      amount: l.amount,
                      componentType: l.componentType,
                    })),
                  );
                });

                results.generated++;
              } catch (err) {
                results.errors.push({
                  contractId: c.id,
                  error: err instanceof Error ? err.message : "Unknown error",
                });
              }
            }
          });
        },
      );
    }

    return results;
  }

  // -------------------------------------------------------------------------
  // 7.2 — applyLateFees (Req 8.8, 8.9)
  // -------------------------------------------------------------------------

  /**
   * Calculate and apply late fees to overdue invoices.
   * Fee = min(total * lateFeePercent, lateFeeMaxAmount).
   * Applied at most once per overdue period (no stacking).
   */
  async applyLateFees(): Promise<{ applied: number }> {
    const db = getDb();
    const today = new Date();
    const graceCutoff = addDays(today, -this.config.gracePeriodDays);
    const graceCutoffStr = formatDateStr(graceCutoff);

    const tenants = await db
      .select({ id: tenantSaas.id })
      .from(tenantSaas)
      .where(eq(tenantSaas.status, "active"));

    let applied = 0;

    for (const { id: tenantId } of tenants) {
      await withTenantContext(
        { tenantId, userId: null, role: null, isSuperAdmin: false },
        async () => {
          await withTenantDb(tenantId, async (tdb) => {
            // Find overdue invoices past grace period
            const overdueInvoices = await tdb
              .select()
              .from(invoice)
              .where(
                and(
                  eq(invoice.tenantId, tenantId),
                  eq(invoice.status, "tertagih"),
                  lte(invoice.dueDate, graceCutoffStr),
                ),
              );

            for (const inv of overdueInvoices) {
              // Check if late fee already applied (no stacking — Req 8.9)
              const existingFee = await tdb
                .select({ id: invoiceLine.id })
                .from(invoiceLine)
                .where(
                  and(
                    eq(invoiceLine.invoiceId, inv.id),
                    eq(invoiceLine.componentType, "late_fee"),
                  ),
                );

              if (existingFee.length > 0) {
                continue;
              }

              // Calculate fee: min(total * percent, max)
              const feeAmount = Math.min(
                Number(inv.total) * (this.config.lateFeePercent / 100),
                this.config.lateFeeMaxAmount,
              ).toFixed(2);

              // Apply late fee as a new invoice line
              await tdb.transaction(async (tx) => {
                await tx.insert(invoiceLine).values({
                  tenantId,
                  invoiceId: inv.id,
                  description: "Denda keterlambatan",
                  amount: feeAmount,
                  componentType: "late_fee",
                });

                // Update invoice total
                const newTotal = (Number(inv.total) + Number(feeAmount)).toFixed(2);
                await tx
                  .update(invoice)
                  .set({
                    total: newTotal,
                    status: "jatuh_tempo",
                    updatedAt: new Date(),
                  })
                  .where(eq(invoice.id, inv.id));
              });

              applied++;
            }
          });
        },
      );
    }

    return { applied };
  }

  // -------------------------------------------------------------------------
  // 7.2 — recordDeposit (Req 16.1)
  // -------------------------------------------------------------------------

  /**
   * Record a deposit payment for a contract on check-in.
   */
  async recordDeposit(contractId: string, amount: number): Promise<void> {
    const db = getDb();
    await db
      .update(contract)
      .set({
        depositAmount: amount.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(contract.id, contractId));
  }

  // -------------------------------------------------------------------------
  // 7.2 — calculateDepositRefund (Req 16.2)
  // -------------------------------------------------------------------------

  /**
   * Calculate deposit refund on checkout. Subtracts unpaid invoices
   * and any deductions from the original deposit.
   */
  async calculateDepositRefund(contractId: string): Promise<DepositRefundResult> {
    const db = getDb();

    const [contractData] = await db
      .select()
      .from(contract)
      .where(eq(contract.id, contractId));

    if (!contractData) {
      throw new Error(`Contract ${contractId} not found`);
    }

    const originalDeposit = Number(contractData.depositAmount);

    // Find unpaid invoices for this contract
    const unpaidInvoices = await db
      .select()
      .from(invoice)
      .where(
        and(
          eq(invoice.contractId, contractId),
          sql`${invoice.status} IN ('tertagih', 'jatuh_tempo')`,
        ),
      );

    const deductions: { reason: string; amount: number }[] = [];

    for (const inv of unpaidInvoices) {
      deductions.push({
        reason: `Tagihan belum lunas: ${inv.invoiceNumber}`,
        amount: Number(inv.total),
      });
    }

    const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);
    const refundAmount = Math.max(0, originalDeposit - totalDeductions);

    return { originalDeposit, deductions, refundAmount };
  }

  // -------------------------------------------------------------------------
  // 7.2 — generateProratedInvoice (Req 16.1)
  // -------------------------------------------------------------------------

  /**
   * Generate a prorated invoice for mid-month check-ins.
   * Returns the created invoice ID.
   */
  async generateProratedInvoice(contractId: string): Promise<string> {
    const db = getDb();

    const [contractData] = await db
      .select()
      .from(contract)
      .where(eq(contract.id, contractId));

    if (!contractData) {
      throw new Error(`Contract ${contractId} not found`);
    }

    const tenantId = contractData.tenantId;
    const startDate = new Date(contractData.startDate);
    const totalDays = daysInMonth(startDate);
    const remainingDays = totalDays - startDate.getDate() + 1;
    const prorationFactor = remainingDays / totalDays;

    const proratedAmount = (Number(contractData.monthlyPrice) * prorationFactor).toFixed(
      2,
    );

    const periodStartStr = formatDateStr(startDate);
    const periodEndStr = endOfMonth(startDate);
    const dueDateStr = periodStartStr; // Due immediately for prorated

    let invoiceId = "";

    await withTenantDb(tenantId, async (tdb) => {
      await tdb.transaction(async (tx) => {
        const invNumber = await this.generateInvoiceNumber(tx, tenantId);
        const token = crypto.randomUUID();

        const [inv] = await tx
          .insert(invoice)
          .values({
            tenantId,
            contractId,
            invoiceNumber: invNumber,
            paymentLinkToken: token,
            periodStart: periodStartStr,
            periodEnd: periodEndStr,
            dueDate: dueDateStr,
            total: proratedAmount,
            status: "tertagih",
          })
          .returning();

        await tx.insert(invoiceLine).values({
          tenantId,
          invoiceId: inv.id,
          description: `Sewa kamar (prorata ${remainingDays}/${totalDays} hari)`,
          amount: proratedAmount,
          componentType: "sewa",
        });

        invoiceId = inv.id;
      });
    });

    return invoiceId;
  }

  // -------------------------------------------------------------------------
  // 7.3 — Meter-based billing calculation (Req 17.2)
  // -------------------------------------------------------------------------

  /**
   * Build invoice line items from billing components.
   * Supports fixed, meter-based, and usage-based calc methods.
   */
  private async buildInvoiceLines(
    tdb: DbOrTx,
    contractData: typeof contract.$inferSelect,
    components: (typeof billingComponent.$inferSelect)[],
    billingDate: Date,
  ): Promise<{ description: string; amount: string; componentType: string | null }[]> {
    const lines: {
      description: string;
      amount: string;
      componentType: string | null;
    }[] = [];

    // Always include base rent
    lines.push({
      description: "Sewa kamar",
      amount: contractData.monthlyPrice,
      componentType: "sewa",
    });

    for (const comp of components) {
      let amount: number;

      switch (comp.calcMethod) {
        case "fixed": {
          // Fixed amount from default_value
          amount = Number(comp.defaultValue ?? 0);
          break;
        }

        case "meter": {
          // Meter-based: (current - previous) * rate
          // Fall back to default_value when no reading exists — Req 17.2
          amount = await this.calculateMeterCharge(
            tdb,
            contractData.roomId,
            comp,
            billingDate,
          );
          break;
        }

        case "usage": {
          // Usage-based: use default_value as the charge
          amount = Number(comp.defaultValue ?? 0);
          break;
        }

        default: {
          amount = Number(comp.defaultValue ?? 0);
        }
      }

      if (amount > 0) {
        lines.push({
          description: comp.name,
          amount: amount.toFixed(2),
          componentType: comp.calcMethod,
        });
      }
    }

    return lines;
  }

  /**
   * Calculate meter-based charge from reading difference.
   * Falls back to default_value when no reading exists.
   */
  private async calculateMeterCharge(
    tdb: DbOrTx,
    roomId: string,
    component: typeof billingComponent.$inferSelect,
    billingDate: Date,
  ): Promise<number> {
    // Get the two most recent readings for this room
    const readings = await tdb
      .select()
      .from(meterReading)
      .where(
        and(
          eq(meterReading.roomId, roomId),
          lte(meterReading.readingDate, formatDateStr(billingDate)),
        ),
      )
      .orderBy(desc(meterReading.readingDate))
      .limit(2);

    if (readings.length < 2) {
      // No sufficient readings — fall back to default_value
      return Number(component.defaultValue ?? 0);
    }

    const [current, previous] = readings;

    // Determine which meter value to use based on component name
    const isWater =
      component.name.toLowerCase().includes("air") ||
      component.name.toLowerCase().includes("water");

    const currentValue = Number(isWater ? current.waterValue : current.electricityValue);
    const previousValue = Number(
      isWater ? previous.waterValue : previous.electricityValue,
    );

    if (Number.isNaN(currentValue) || Number.isNaN(previousValue)) {
      return Number(component.defaultValue ?? 0);
    }

    const usage = currentValue - previousValue;

    if (usage <= 0) {
      return Number(component.defaultValue ?? 0);
    }

    // Rate is stored in default_value for meter components
    const rate = Number(component.defaultValue ?? 1);
    return usage * rate;
  }

  // -------------------------------------------------------------------------
  // Invoice number generation — Req 8.4
  // -------------------------------------------------------------------------

  /**
   * Generate unique invoice number per tenant: INV-{YYYY}-{seq}
   */
  private async generateInvoiceNumber(tx: DbOrTx, tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    // Count existing invoices for this tenant in the current year
    const [result] = await tx
      .select({ total: count() })
      .from(invoice)
      .where(
        and(
          eq(invoice.tenantId, tenantId),
          sql`${invoice.invoiceNumber} LIKE ${`${prefix}%`}`,
        ),
      );

    const seq = (result?.total ?? 0) + 1;
    return `${prefix}${String(seq).padStart(5, "0")}`;
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const billingEngine = new BillingEngine();
