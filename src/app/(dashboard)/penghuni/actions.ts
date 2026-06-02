"use server";

/**
 * Resident (Penghuni) Server Actions — Task 17.1
 *
 * CRUD operations for residents. Delegates reads to RealDataSource
 * and writes to direct Drizzle queries.
 *
 * Requirements: 5.1, 4.1
 */

import { and, eq } from "drizzle-orm";

import type { Resident } from "@/lib/data";
import { withAuth } from "@/lib/server/auth/rbac";
import { RealDataSource } from "@/lib/server/datasource";
import { withTenantDb } from "@/lib/server/db";
import { kosTenant } from "@/lib/server/db/schema";
import { requireTenantId } from "@/lib/server/tenant";

const dataSource = new RealDataSource();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateResidentInput {
  fullName: string;
  ktpNumber: string;
  phone: string;
  email?: string;
  emergencyContact?: string;
  ktpImageKey?: string;
}

export interface UpdateResidentInput {
  fullName?: string;
  ktpNumber?: string;
  phone?: string;
  email?: string;
  emergencyContact?: string;
  ktpImageKey?: string;
}

// ---------------------------------------------------------------------------
// listResidents — Req 5.1
// ---------------------------------------------------------------------------

/** List all residents for the current tenant. */
export const listResidents = withAuth(
  async (): Promise<Resident[]> => {
    const tenantId = requireTenantId();
    return dataSource.listResidents(tenantId);
  },
  { requiredPermission: "report:read" },
);

// ---------------------------------------------------------------------------
// createResident — Req 4.1
// ---------------------------------------------------------------------------

/** Create a new resident record. */
export const createResident = withAuth(
  async (data: CreateResidentInput): Promise<{ id: string }> => {
    const tenantId = requireTenantId();

    return withTenantDb(tenantId, async (db) => {
      const [created] = await db
        .insert(kosTenant)
        .values({
          tenantId,
          fullName: data.fullName,
          ktpNumber: data.ktpNumber,
          phone: data.phone,
          email: data.email ?? null,
          emergencyContact: data.emergencyContact ?? null,
          ktpImageKey: data.ktpImageKey ?? null,
        })
        .returning({ id: kosTenant.id });

      return { id: created.id };
    });
  },
  { requiredPermission: "resident:write" },
);

// ---------------------------------------------------------------------------
// updateResident — Req 4.1
// ---------------------------------------------------------------------------

/** Update an existing resident record. */
export const updateResident = withAuth(
  async (id: string, data: UpdateResidentInput): Promise<void> => {
    const tenantId = requireTenantId();

    await withTenantDb(tenantId, async (db) => {
      await db
        .update(kosTenant)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(kosTenant.id, id), eq(kosTenant.tenantId, tenantId)));
    });
  },
  { requiredPermission: "resident:write" },
);
