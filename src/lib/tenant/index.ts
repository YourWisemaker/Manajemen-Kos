/**
 * Tenant context + visual RBAC — public entry point — Task 5
 * ----------------------------------------------------------
 * `@/lib/tenant` is the single import point for the Phase 1 mock tenant
 * session (active tenant, role, branding) and the visual role-based access
 * gating helpers.
 *
 * SECURITY: the RBAC here is visual-only and NOT a security boundary; real
 * authorization is enforced on the backend in Phase 2.
 *
 * Requirements: 20.1, 20.2, 20.3, 20.4
 */

export {
  CAPABILITY_ROLES,
  type Capability,
  can,
  filterNavByRole,
  isOwner,
  isOwnerOnly,
  type NavItem,
  navVisibleFor,
  OWNER_CAPABILITIES,
  OWNER_ONLY_CAPABILITIES,
} from "./permissions";
export {
  OWNER_ONLY_TOOLTIP,
  OwnerAction,
  type OwnerActionProps,
  OwnerOnly,
  type OwnerOnlyProps,
  type PermissionsApi,
  RoleGate,
  type RoleGateMode,
  type RoleGateProps,
  usePermissions,
} from "./rbac";
export { SessionTenantProvider } from "./session-tenant-provider";
export {
  DEFAULT_TENANT,
  MockTenantProvider,
  type MockTenantProviderProps,
  ROLE_LABELS,
  type TenantBranding,
  TenantContext,
  type TenantContextValue,
  type TenantRole,
  type UserRole,
  useTenant,
} from "./tenant-context";
