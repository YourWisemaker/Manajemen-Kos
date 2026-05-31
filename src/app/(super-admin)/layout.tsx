import { AdminShell } from "@/components/shells/admin-shell";
import { MockTenantProvider } from "@/lib/tenant";

/**
 * Super-admin route group layout — Task 8.4
 * ------------------------------------------
 * Wraps the super-admin console in MockTenantProvider + AdminShell.
 *
 * Requirements: 17.5, 17.6
 */
export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <MockTenantProvider>
      <AdminShell>{children}</AdminShell>
    </MockTenantProvider>
  );
}
