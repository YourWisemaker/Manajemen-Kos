"use server";

/**
 * Super Admin Server Actions — Task 15.2
 *
 * Wires all SuperAdminService methods as Server Actions
 * with `super_admin` role requirement.
 *
 * Requirements: 13.6
 */

import type { PlatformMetrics, TenantSaasSummary } from "@/lib/data";
import {
  type BroadcastMessage,
  type ListTenantsFilters,
  superAdminService,
} from "@/lib/server/admin/service";
import { withAuth } from "@/lib/server/auth/rbac";

function buildMrrTrend(mrr: number): PlatformMetrics["mrrTrend"] {
  const now = new Date();
  const points: PlatformMetrics["mrrTrend"] = [];

  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    points.push({ month, amount: Math.round(mrr) });
  }

  return points;
}

function mapPlan(plan: string): TenantSaasSummary["plan"] {
  if (plan === "starter" || plan === "pro" || plan === "enterprise") return plan;
  return "starter";
}

function mapStatus(status: string): TenantSaasSummary["status"] {
  if (status === "trial") return "trial";
  if (status === "active") return "aktif";
  if (status === "suspended") return "ditangguhkan";
  if (status === "cancelled") return "berhenti";
  return "aktif";
}

// ---------------------------------------------------------------------------
// getPlatformMetrics — Req 13.1
// ---------------------------------------------------------------------------

export const getPlatformMetrics = withAuth(
  async (): Promise<PlatformMetrics> => {
    const metrics = await superAdminService.getPlatformMetrics();
    return {
      ...metrics,
      mrr: Math.round(metrics.mrr),
      mrrTrend: buildMrrTrend(metrics.mrr),
    };
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
    const result = await superAdminService.listTenants(filters);
    return {
      total: result.total,
      tenants: result.tenants.map((t) => ({
        id: t.id,
        name: t.name,
        plan: mapPlan(t.plan),
        status: mapStatus(t.status),
        rooms: t.rooms,
        mrr: Math.round(t.mrr),
        joinedAt: t.joinedAt,
      })),
    };
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
