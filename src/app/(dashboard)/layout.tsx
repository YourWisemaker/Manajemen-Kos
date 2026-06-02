import { headers } from "next/headers";

import { AppShell } from "@/components/shells/app-shell";
import type { TenantRole } from "@/lib/tenant";
import { MockTenantProvider, SessionTenantProvider } from "@/lib/tenant";

/**
 * Dashboard route group layout
 * ----------------------------
 * Wraps all tenant dashboard pages in the appropriate TenantProvider + AppShell.
 *
 * If a real auth session is available (tenant context resolved by middleware),
 * uses SessionTenantProvider with server-derived data. Falls back to
 * MockTenantProvider for local dev without auth.
 *
 * Requirements: 17.5, 17.6
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerStore = await headers();
  const tenantId = headerStore.get("x-tenant-id");
  const userRole = headerStore.get("x-user-role") as TenantRole | null;

  // If middleware resolved a real tenant session, use the session-based provider.
  // This fetches the tenant settings from the database for the resolved tenant.
  if (tenantId && userRole) {
    const { getTenantSettings } = await import("@/app/(dashboard)/pengaturan/actions");

    try {
      const settings = await getTenantSettings();
      return (
        <SessionTenantProvider tenantSettings={settings} userRole={userRole}>
          <AppShell>{children}</AppShell>
        </SessionTenantProvider>
      );
    } catch {
      // If settings fetch fails (e.g. new tenant), fall through to mock
    }
  }

  // Fallback: MockTenantProvider for local dev or when no session is available.
  return (
    <MockTenantProvider>
      <AppShell>{children}</AppShell>
    </MockTenantProvider>
  );
}
