"use server";

import { withAuth } from "@/lib/server/auth/rbac";
import { maintenanceService } from "@/lib/server/maintenance/service";
import { requireTenantId } from "@/lib/server/tenant";

export interface CreateMaintenanceInput {
  roomId: string;
  description: string;
  kosTenantId?: string;
}

export interface UpdateMaintenanceInput {
  description?: string;
  status?: string;
}

export const createMaintenanceRequest = withAuth(
  async (data: CreateMaintenanceInput): Promise<{ id: string }> => {
    const tenantId = requireTenantId();
    const id = await maintenanceService.create(tenantId, data);
    return { id };
  },
  { requiredPermission: "room:write" },
);

export const updateMaintenanceRequest = withAuth(
  async (requestId: string, data: UpdateMaintenanceInput): Promise<void> => {
    const tenantId = requireTenantId();
    await maintenanceService.update(tenantId, requestId, data);
  },
  { requiredPermission: "room:write" },
);

export const listMaintenanceRequests = withAuth(
  async (filters?: { roomId?: string; status?: string }) => {
    const tenantId = requireTenantId();
    return maintenanceService.list(tenantId, filters);
  },
  { requiredPermission: "property:write" },
);

export const getMaintenanceRequest = withAuth(
  async (requestId: string) => {
    const tenantId = requireTenantId();
    return maintenanceService.getById(tenantId, requestId);
  },
  { requiredPermission: "property:write" },
);
