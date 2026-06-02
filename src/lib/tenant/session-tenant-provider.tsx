"use client";

/**
 * Session-based Tenant Provider
 * -----------------------------
 * Replaces MockTenantProvider for authenticated dashboard routes.
 * Accepts tenant settings and role from the server (resolved via auth session)
 * and provides the same TenantContextValue interface used by all UI components.
 *
 * Uses the same internal TenantContext so that `useTenant()` works seamlessly.
 */

import { type ReactNode, useMemo, useState } from "react";
import type { TenantSettings } from "@/lib/data";
import {
  type TenantBranding,
  TenantContext,
  type TenantContextValue,
  type TenantRole,
} from "./tenant-context";

interface SessionTenantProviderProps {
  children: ReactNode;
  /** Tenant settings resolved from the authenticated session. */
  tenantSettings: TenantSettings;
  /** User role resolved from the session. */
  userRole: TenantRole;
}

function toBranding(tenant: TenantSettings): TenantBranding {
  return {
    name: tenant.name,
    subdomain: tenant.subdomain,
    logoUrl: tenant.logoUrl,
    brandColor: tenant.brandColor,
  };
}

/**
 * Provides real tenant session data to its subtree.
 * Initialized from server-resolved auth session, not mock data.
 */
export function SessionTenantProvider({
  children,
  tenantSettings,
  userRole,
}: SessionTenantProviderProps) {
  const [tenant, setActiveTenant] = useState<TenantSettings>(tenantSettings);
  const [role, setRole] = useState<TenantRole>(userRole);

  const value = useMemo<TenantContextValue>(
    () => ({
      tenant,
      role,
      branding: toBranding(tenant),
      setActiveTenant,
      setRole,
    }),
    [tenant, role],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}
