"use server";

/**
 * Contract Lifecycle Server Actions — Task 12.1
 *
 * Handles contract CRUD with billing engine integration:
 * - Check-in: create contract → record deposit → generate prorated invoice → update room to "terisi"
 * - Check-out: terminate contract → calculate deposit refund → update room to "tersedia"
 * - Status transitions: active → terminated/expired only
 *
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5
 */

import { and, eq } from "drizzle-orm";

import type { Contract } from "@/lib/data";
import { withAuth } from "@/lib/server/auth/rbac";
import { billingEngine } from "@/lib/server/billing/engine";
import { RealDataSource } from "@/lib/server/datasource";
import { withTenantDb } from "@/lib/server/db";
import { contract, room } from "@/lib/server/db/schema";
import { requireTenantId } from "@/lib/server/tenant";

const dataSource = new RealDataSource();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateContractInput {
  roomId: string;
  kosTenantId: string;
  startDate: string;
  endDate: string;
  depositAmount: number;
  monthlyPrice: number;
}

export interface TerminateContractResult {
  contractId: string;
  refund: {
    originalDeposit: number;
    deductions: { reason: string; amount: number }[];
    refundAmount: number;
  };
}

// ---------------------------------------------------------------------------
// createContract — Req 16.1, 16.4
// ---------------------------------------------------------------------------

/**
 * Create a new contract (check-in flow):
 * 1. Insert contract record
 * 2. Record deposit via billing engine
 * 3. Generate prorated invoice for mid-month check-ins
 * 4. Update room status to "terisi" (occupied)
 */
export const createContract = withAuth(
  async (data: CreateContractInput): Promise<{ id: string; invoiceId: string }> => {
    const tenantId = requireTenantId();

    return withTenantDb(tenantId, async (db) => {
      // 1. Create contract record
      const [created] = await db
        .insert(contract)
        .values({
          tenantId,
          roomId: data.roomId,
          kosTenantId: data.kosTenantId,
          startDate: data.startDate,
          endDate: data.endDate,
          depositAmount: data.depositAmount.toFixed(2),
          monthlyPrice: data.monthlyPrice.toFixed(2),
          status: "active",
        })
        .returning();

      // 2. Record deposit via billing engine — Req 16.1
      await billingEngine.recordDeposit(created.id, data.depositAmount);

      // 3. Generate prorated invoice for mid-month check-in — Req 16.1
      const invoiceId = await billingEngine.generateProratedInvoice(created.id);

      // 4. Update room status to "terisi" — Req 16.4
      await db
        .update(room)
        .set({ status: "terisi", updatedAt: new Date() })
        .where(and(eq(room.id, data.roomId), eq(room.tenantId, tenantId)));

      return { id: created.id, invoiceId };
    });
  },
  { requiredPermission: "contract:write" },
);

// ---------------------------------------------------------------------------
// terminateContract — Req 16.2, 16.3, 16.5
// ---------------------------------------------------------------------------

/**
 * Terminate a contract (check-out flow):
 * 1. Validate status transition (active → terminated only)
 * 2. Calculate deposit refund via billing engine
 * 3. Update contract status to "terminated"
 * 4. Update room status to "tersedia" (available)
 */
export const terminateContract = withAuth(
  async (contractId: string): Promise<TerminateContractResult> => {
    const tenantId = requireTenantId();

    return withTenantDb(tenantId, async (db) => {
      // Fetch current contract
      const [existing] = await db
        .select()
        .from(contract)
        .where(and(eq(contract.id, contractId), eq(contract.tenantId, tenantId)));

      if (!existing) {
        throw new Error(`Contract ${contractId} not found`);
      }

      // Enforce status transition — Req 16.3
      if (existing.status !== "active") {
        throw new Error(
          `Cannot terminate contract with status "${existing.status}". Only active contracts can be terminated.`,
        );
      }

      // Calculate deposit refund — Req 16.2
      const refund = await billingEngine.calculateDepositRefund(contractId);

      // Update contract status to "terminated" — Req 16.3
      await db
        .update(contract)
        .set({ status: "terminated", updatedAt: new Date() })
        .where(eq(contract.id, contractId));

      // Update room status to "tersedia" — Req 16.5
      await db
        .update(room)
        .set({ status: "tersedia", updatedAt: new Date() })
        .where(and(eq(room.id, existing.roomId), eq(room.tenantId, tenantId)));

      return { contractId, refund };
    });
  },
  { requiredPermission: "contract:write" },
);

// ---------------------------------------------------------------------------
// listContracts — query contracts for the current tenant
// ---------------------------------------------------------------------------

/** List all contracts for the current tenant, ordered by most recent first. */
export const listContracts = withAuth(
  async (): Promise<Contract[]> => {
    const tenantId = requireTenantId();
    return dataSource.listContracts(tenantId);
  },
  { requiredPermission: "report:read" },
);
