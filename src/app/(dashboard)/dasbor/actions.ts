"use server";

/**
 * Dashboard Server Actions — Task 17.1
 *
 * Provides the dashboard summary data via the RealDataSource.
 * Wrapped with `withAuth` requiring `report:read` permission.
 *
 * Requirements: 5.1, 4.1
 */

import type { DashboardSummary } from "@/lib/data";
import { withAuth } from "@/lib/server/auth/rbac";
import { RealDataSource } from "@/lib/server/datasource";
import { requireTenantId } from "@/lib/server/tenant";

const dataSource = new RealDataSource();

// ---------------------------------------------------------------------------
// getDashboardSummary — Req 5.1, 5.3
// ---------------------------------------------------------------------------

/** Fetch aggregated dashboard metrics for the current tenant. */
export const getDashboardSummary = withAuth(
  async (): Promise<DashboardSummary> => {
    const tenantId = requireTenantId();
    return dataSource.getDashboardSummary(tenantId);
  },
  { requiredPermission: "report:read" },
);
