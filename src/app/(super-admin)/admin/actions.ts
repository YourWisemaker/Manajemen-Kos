"use server";

/**
 * Super Admin Server Actions — Task 15.2
 *
 * Wires all SuperAdminService methods as Server Actions
 * with `super_admin` role requirement.
 *
 * Requirements: 13.6
 */

import {
  type BroadcastMessage,
  type ListTenantsFilters,
  type PlatformMetrics,
  superAdminService,
  type TenantSaasSummary,
} from "@/lib/server/admin/service";
import { withAuth } from "@/lib/server/auth/rbac";

// ---------------------------------------------------------------------------
// getPlatformMetrics — Req 13.1
// ---------------------------------------------------------------------------

export const getPlatformMetrics = withAuth(
  async (): Promise<PlatformMetrics> => {
    return superAdminService.getPlatformMetrics();
  },
  { requiredRole: "super_admin" },
);

// ---------------------------------------------------------------------------
// listTenants — Req 13.2
// ---------------------------------------------------------------------------

export const listTenants = withAuth(
  async (
    filters?: ListTenantsFilters,
  ): Promise<{ tenants: TenantSaasSummary[]; total: number }> => {
    return superAdminService.listTenants(filters);
  },
  { requiredRole: "super_admin" },
);

// ---------------------------------------------------------------------------
// suspendTenant — Req 13.3
// ---------------------------------------------------------------------------

export const suspendTenant = withAuth(
  async (tenantId: string, reason: string): Promise<void> => {
    return superAdminService.suspendTenant(tenantId, reason);
  },
  { requiredRole: "super_admin" },
);

// ---------------------------------------------------------------------------
// unsuspendTenant — Req 13.3
// ---------------------------------------------------------------------------

export const unsuspendTenant = withAuth(
  async (tenantId: string): Promise<void> => {
    return superAdminService.unsuspendTenant(tenantId);
  },
  { requiredRole: "super_admin" },
);

// ---------------------------------------------------------------------------
// impersonate — Req 13.4
// ---------------------------------------------------------------------------

export const impersonate = withAuth(
  async (tenantId: string): Promise<{ token: string; expiresAt: string }> => {
    return superAdminService.impersonate(tenantId);
  },
  { requiredRole: "super_admin" },
);

// ---------------------------------------------------------------------------
// broadcast — Req 13.5
// ---------------------------------------------------------------------------

export const broadcast = withAuth(
  async (message: BroadcastMessage): Promise<{ sent: number }> => {
    return superAdminService.broadcast(message);
  },
  { requiredRole: "super_admin" },
);
