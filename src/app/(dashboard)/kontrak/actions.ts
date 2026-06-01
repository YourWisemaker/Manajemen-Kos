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

import { and, desc, eq } from "drizzle-orm";

import { withAuth } from "@/lib/server/auth/rbac";
import { billingEngine } from "@/lib/server/billing/engine";
import { getDb } from "@/lib/server/db";
import { contract, room } from "@/lib/server/db/schema";
import { requireTenantId } from "@/lib/server/tenant";

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

export interface ContractView {
  id: string;
  roomId: string;
  kosTenantId: string;
  startDate: string;
  endDate: string;
  depositAmount: string;
  monthlyPrice: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
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
    const db = getDb();

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
    const db = getDb();

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
  },
  { requiredPermission: "contract:write" },
);

// ---------------------------------------------------------------------------
// listContracts — query contracts for the current tenant
// ---------------------------------------------------------------------------

/** List all contracts for the current tenant, ordered by most recent first. */
export const listContracts = withAuth(
  async (): Promise<ContractView[]> => {
    const tenantId = requireTenantId();
    const db = getDb();

    const rows = await db
      .select({
        id: contract.id,
        roomId: contract.roomId,
        kosTenantId: contract.kosTenantId,
        startDate: contract.startDate,
        endDate: contract.endDate,
        depositAmount: contract.depositAmount,
        monthlyPrice: contract.monthlyPrice,
        status: contract.status,
        createdAt: contract.createdAt,
        updatedAt: contract.updatedAt,
      })
      .from(contract)
      .where(eq(contract.tenantId, tenantId))
      .orderBy(desc(contract.createdAt));

    return rows;
  },
  { requiredPermission: "contract:write" },
);
