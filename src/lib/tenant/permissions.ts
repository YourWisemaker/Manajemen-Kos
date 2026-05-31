/**
 * Visual RBAC capability model — Task 5.2
 * ---------------------------------------
 * Pure, framework-free capability logic for the Phase 1 visual RBAC layer:
 * the typed capability set, the capability→roles policy, the
 * `can(role, capability)` predicate, and navigation-gating helpers. Kept free
 * of React and the `"use client"` boundary so server components and tests can
 * import it directly; the client components live in `./rbac.tsx` (which also
 * re-exports this module's public API).
 *
 * SECURITY: this is **visual gating only** — it shapes what each role sees in
 * the UI ahead of real enforcement. It is NOT a security boundary. Real
 * authorization is deferred to the backend (RLS + server checks) in Phase 2.
 *
 * Requirements: 20.2, 20.4
 */

import type { TenantRole } from "./tenant-context";

/**
 * The set of gated capabilities. `deleteTenant` and `changeSubscription` are
 * the owner-only actions called out by the design (Requirement 20.2);
 * `exportData` and `manageTeam` are shared owner/admin capabilities. The union
 * is open to growth as more gated capabilities appear.
 */
export type Capability =
  | "deleteTenant"
  | "changeSubscription"
  | "exportData"
  | "manageTeam";

/**
 * Named handles for the Owner-only capabilities, so call sites read clearly
 * (e.g. `can(role, OWNER_CAPABILITIES.deleteTenant)`).
 */
export const OWNER_CAPABILITIES = {
  deleteTenant: "deleteTenant",
  changeSubscription: "changeSubscription",
} as const satisfies Record<string, Capability>;

/**
 * Capability→roles policy: the roles permitted to use each capability. The two
 * owner-only capabilities are reserved for the Owner, so Admin and Staff
 * neither see nor use them.
 */
export const CAPABILITY_ROLES: Record<Capability, readonly TenantRole[]> = {
  deleteTenant: ["owner"],
  changeSubscription: ["owner"],
  exportData: ["owner", "admin"],
  manageTeam: ["owner", "admin"],
} as const;

/** The capabilities reserved for the Owner role (the "owner-only" notion). */
export const OWNER_ONLY_CAPABILITIES: readonly Capability[] = [
  OWNER_CAPABILITIES.deleteTenant,
  OWNER_CAPABILITIES.changeSubscription,
];

/** True when `capability` is reserved for the Owner role only. */
export function isOwnerOnly(capability: Capability): boolean {
  const roles = CAPABILITY_ROLES[capability];
  return roles.length === 1 && roles[0] === "owner";
}

/**
 * Whether `role` may use `capability`.
 *
 * @example can("owner", "deleteTenant") // true
 * @example can("staff", "changeSubscription") // false
 */
export function can(role: TenantRole, capability: Capability): boolean {
  return CAPABILITY_ROLES[capability].includes(role);
}

/** Convenience: whether `role` is the Owner. */
export function isOwner(role: TenantRole): boolean {
  return role === "owner";
}

// ---------------------------------------------------------------------------
// Navigation gating (Requirement 20.4)
// ---------------------------------------------------------------------------

/**
 * A navigation entry the AppShell renders. Visibility is gated by, in order:
 * `capability` (when present, requires {@link can}); else `roles` (when
 * present, the role must be listed); else the item is visible to every role.
 */
export interface NavItem {
  /** Stable id for the entry, e.g. "dasbor". */
  id: string;
  /** Bahasa Indonesia label. */
  label: string;
  /** Route the item links to, e.g. `/dasbor`. */
  href: string;
  /** Optional icon key resolved by the shell to a Lucide icon. */
  icon?: string;
  /** Gate by capability; takes precedence over `roles` when present. */
  capability?: Capability;
  /** Gate by an explicit allow-list of roles. */
  roles?: readonly TenantRole[];
}

/** Whether `item` is visible to `role` per its capability/roles gate. */
export function navVisibleFor(role: TenantRole, item: NavItem): boolean {
  if (item.capability !== undefined) {
    return can(role, item.capability);
  }
  if (item.roles !== undefined) {
    return item.roles.includes(role);
  }
  return true;
}

/** Return only the navigation items visible to `role`, preserving order. */
export function filterNavByRole<T extends NavItem>(
  items: readonly T[],
  role: TenantRole,
): T[] {
  return items.filter((item) => navVisibleFor(role, item));
}
