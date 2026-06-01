import { and, count, desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/server/db";
import { maintenanceRequest } from "@/lib/server/db/schema";

export interface CreateMaintenanceInput {
  roomId: string;
  description: string;
  kosTenantId?: string;
}

export interface UpdateMaintenanceInput {
  description?: string;
  status?: string;
}

export interface MaintenanceView {
  id: string;
  tenantId: string;
  roomId: string;
  kosTenantId: string | null;
  description: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export class MaintenanceService {
  async create(tenantId: string, data: CreateMaintenanceInput): Promise<string> {
    const db = getDb();
    const [row] = await db
      .insert(maintenanceRequest)
      .values({
        tenantId,
        roomId: data.roomId,
        kosTenantId: data.kosTenantId ?? null,
        description: data.description,
        status: "open",
      })
      .returning({ id: maintenanceRequest.id });
    return row.id;
  }

  async update(
    tenantId: string,
    requestId: string,
    data: UpdateMaintenanceInput,
  ): Promise<void> {
    const db = getDb();
    const updatePayload: Record<string, unknown> = { updatedAt: new Date() };
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.status !== undefined) updatePayload.status = data.status;

    await db
      .update(maintenanceRequest)
      .set(updatePayload)
      .where(
        and(
          eq(maintenanceRequest.id, requestId),
          eq(maintenanceRequest.tenantId, tenantId),
        ),
      );
  }

  async list(
    tenantId: string,
    filters?: { roomId?: string; status?: string },
  ): Promise<MaintenanceView[]> {
    const db = getDb();
    const conditions = [eq(maintenanceRequest.tenantId, tenantId)];
    if (filters?.roomId) conditions.push(eq(maintenanceRequest.roomId, filters.roomId));
    if (filters?.status) conditions.push(eq(maintenanceRequest.status, filters.status));

    return db
      .select()
      .from(maintenanceRequest)
      .where(and(...conditions))
      .orderBy(desc(maintenanceRequest.createdAt));
  }

  async getById(tenantId: string, requestId: string): Promise<MaintenanceView | null> {
    const db = getDb();
    const [row] = await db
      .select()
      .from(maintenanceRequest)
      .where(
        and(
          eq(maintenanceRequest.id, requestId),
          eq(maintenanceRequest.tenantId, tenantId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async countByStatus(tenantId: string): Promise<Record<string, number>> {
    const db = getDb();
    const rows = await db
      .select({ status: maintenanceRequest.status, cnt: count() })
      .from(maintenanceRequest)
      .where(eq(maintenanceRequest.tenantId, tenantId))
      .groupBy(maintenanceRequest.status);

    const result: Record<string, number> = {};
    for (const r of rows) result[r.status] = Number(r.cnt);
    return result;
  }
}

export const maintenanceService = new MaintenanceService();
