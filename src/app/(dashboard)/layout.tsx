import { AppShell } from "@/components/shells/app-shell";
import { MockTenantProvider } from "@/lib/tenant";

/**
 * Dashboard route group layout — Task 8.4
 * ----------------------------------------
 * Wraps all tenant dashboard pages in the MockTenantProvider + AppShell.
 *
 * Requirements: 17.5, 17.6
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <MockTenantProvider>
      <AppShell>{children}</AppShell>
    </MockTenantProvider>
  );
}
