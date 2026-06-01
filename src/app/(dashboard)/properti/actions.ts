"use server";

/**
 * Property Server Actions — Task 17.1
 *
 * CRUD operations for properties. Delegates reads to RealDataSource
 * and writes to direct Drizzle queries.
 *
 * Requirements: 5.1, 4.1
 */

import { and, eq } from "drizzle-orm";

import type { Property } from "@/lib/data";
import { withAuth } from "@/lib/server/auth/rbac";
import { RealDataSource } from "@/lib/server/datasource";
import { getDb } from "@/lib/server/db";
import { property } from "@/lib/server/db/schema";
import { requireTenantId } from "@/lib/server/tenant";

const dataSource = new RealDataSource();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreatePropertyInput {
  name: string;
  address: string;
  city: string;
}

export interface UpdatePropertyInput {
  name?: string;
  address?: string;
  city?: string;
}

// ---------------------------------------------------------------------------
// listProperties — Req 5.1
// ---------------------------------------------------------------------------

/** List all properties for the current tenant with occupancy counts. */
export const listProperties = withAuth(
  async (): Promise<Property[]> => {
    const tenantId = requireTenantId();
    return dataSource.listProperties(tenantId);
  },
  { requiredPermission: "property:write" },
);

// ---------------------------------------------------------------------------
// createProperty — Req 4.1
// ---------------------------------------------------------------------------

/** Create a new property for the current tenant. */
export const createProperty = withAuth(
  async (data: CreatePropertyInput): Promise<{ id: string }> => {
    const tenantId = requireTenantId();
    const db = getDb();

    const [created] = await db
      .insert(property)
      .values({
        tenantId,
        name: data.name,
        address: data.address,
        city: data.city,
        totalRooms: 0,
      })
      .returning({ id: property.id });

    return { id: created.id };
  },
  { requiredPermission: "property:write" },
);

// ---------------------------------------------------------------------------
// updateProperty — Req 4.1
// ---------------------------------------------------------------------------

/** Update an existing property. */
export const updateProperty = withAuth(
  async (id: string, data: UpdatePropertyInput): Promise<void> => {
    const tenantId = requireTenantId();
    const db = getDb();

    await db
      .update(property)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(property.id, id), eq(property.tenantId, tenantId)));
  },
  { requiredPermission: "property:write" },
);
