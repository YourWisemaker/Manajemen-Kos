"use client";

/**
 * Mock Tenant Context — Task 5.1
 * ------------------------------
 * `MockTenantProvider` holds the Phase 1 tenant session: the active tenant
 * ({@link TenantSettings}), the current user's {@link TenantRole}, and a
 * convenience `branding` subset (name, subdomain, logo, brand color) read by
 * the payment page and app chrome. Components consume it via {@link useTenant}.
 *
 * This mirrors the future real tenant-resolution contract so surfaces won't
 * change when the backend arrives. Role drives RBAC-aware rendering (see
 * `./rbac.tsx`) — purely visual gating in Phase 1.
 *
 * The provider seeds from the mock data layer's primary tenant. `initialRole`
 * and `initialTenant` props allow overriding the seed for tests/previews. A
 * tenant switcher (`setActiveTenant`) and role switcher (`setRole`) are
 * exposed so the dashboard can demo multi-property switching and RBAC.
 *
 * Requirements: 20.1
 */

import { createContext, type ReactNode, useContext, useMemo, useState } from "react";
import { PRIMARY_TENANT_SEED, type TenantSettings } from "@/lib/data";

/** The roles a tenant user can hold; drives visual RBAC gating. */
export type TenantRole = "owner" | "admin" | "staff";

/** Alias matching the design's terminology; identical to {@link TenantRole}. */
export type UserRole = TenantRole;

/** Human-readable Bahasa Indonesia labels for each role (for chrome/menus). */
export const ROLE_LABELS: Record<TenantRole, string> = {
  owner: "Pemilik",
  admin: "Admin",
  staff: "Staff",
};

/** Convenience branding subset derived from the active {@link TenantSettings}. */
export interface TenantBranding {
  name: string;
  subdomain: string;
  logoUrl?: string;
  brandColor: string;
}

/** The value exposed by {@link useTenant}. */
export interface TenantContextValue {
  /** The currently active tenant. */
  tenant: TenantSettings;
  /** The current user's role. */
  role: TenantRole;
  /** Branding subset for chrome/payment-page theming. */
  branding: TenantBranding;
  /** Switch the active tenant (multi-property/owner tenant switcher). */
  setActiveTenant: (tenant: TenantSettings) => void;
  /** Switch the current role (used to demo RBAC). */
  setRole: (role: TenantRole) => void;
}

/** Props for {@link MockTenantProvider}. */
export interface MockTenantProviderProps {
  children: ReactNode;
  /** Override the seeded tenant (defaults to {@link DEFAULT_TENANT}). */
  initialTenant?: TenantSettings;
  /** Override the seeded role (defaults to `"owner"`). */
  initialRole?: TenantRole;
}

/** The default active tenant — the mock primary tenant ("Kos Bunga Melati"). */
export const DEFAULT_TENANT: TenantSettings = PRIMARY_TENANT_SEED.settings;

export const TenantContext = createContext<TenantContextValue | null>(null);

/** Derive the convenience branding subset from a tenant's settings. */
function toBranding(tenant: TenantSettings): TenantBranding {
  return {
    name: tenant.name,
    subdomain: tenant.subdomain,
    logoUrl: tenant.logoUrl,
    brandColor: tenant.brandColor,
  };
}

/**
 * Provides the mock tenant session to its subtree. Seeds from the primary mock
 * tenant and `"owner"` role unless overridden via props.
 */
export function MockTenantProvider({
  children,
  initialTenant = DEFAULT_TENANT,
  initialRole = "owner",
}: MockTenantProviderProps) {
  const [tenant, setActiveTenant] = useState<TenantSettings>(initialTenant);
  const [role, setRole] = useState<TenantRole>(initialRole);

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

/**
 * Read the active tenant, current role, and branding from context.
 *
 * Works with both SessionTenantProvider (real auth) and MockTenantProvider,
 * since both write to the same TenantContext.
 *
 * @throws if called outside a provider.
 */
export function useTenant(): TenantContextValue {
  const value = useContext(TenantContext);
  if (value === null) {
    throw new Error("useTenant harus dipakai di dalam <MockTenantProvider>.");
  }
  return value;
}
