"use server";

/**
 * Report (Laporan) Server Actions — Task 17.1
 *
 * Provides report data via the RealDataSource.
 * Wrapped with `withAuth` requiring `report:read` permission.
 *
 * Requirements: 5.1, 4.1
 */

import type { DateRange, ReportBundle } from "@/lib/mock/types";
import { withAuth } from "@/lib/server/auth/rbac";
import { RealDataSource } from "@/lib/server/datasource";
import { requireTenantId } from "@/lib/server/tenant";

const dataSource = new RealDataSource();

// ---------------------------------------------------------------------------
// getReports — Req 5.1
// ---------------------------------------------------------------------------

/** Fetch report bundle (occupancy, revenue, aging, channels) for a date range. */
export const getReports = withAuth(
  async (range: DateRange): Promise<ReportBundle> => {
    const tenantId = requireTenantId();
    return dataSource.getReports(tenantId, range);
  },
  { requiredPermission: "report:read" },
);
