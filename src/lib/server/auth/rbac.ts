import { headers } from "next/headers";

import { type TenantStore, tenantStorage } from "@/lib/server/tenant";

/**
 * RBAC Middleware — Task 4.2
 *
 * Role-based access control for Server Actions and API Routes.
 * Wraps actions with authentication + authorization checks and
 * establishes the tenant context via AsyncLocalStorage.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Role = "owner" | "admin" | "staff" | "super_admin";

export type Permission =
  | "tenant:manage"
  | "property:write"
  | "room:write"
  | "resident:write"
  | "contract:write"
  | "invoice:write"
  | "payment:verify"
  | "settings:write"
  | "team:manage"
  | "report:read"
  | "subscription:manage"
  | "admin:impersonate"
  | "admin:suspend";

// ---------------------------------------------------------------------------
// Role → Permissions mapping
// ---------------------------------------------------------------------------

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    "tenant:manage",
    "property:write",
    "room:write",
    "resident:write",
    "contract:write",
    "invoice:write",
    "payment:verify",
    "settings:write",
    "team:manage",
    "report:read",
    "subscription:manage",
  ],
  admin: [
    "property:write",
    "room:write",
    "resident:write",
    "contract:write",
    "invoice:write",
    "payment:verify",
    "settings:write",
    "report:read",
  ],
  staff: [
    "room:write",
    "resident:write",
    "contract:write",
    "invoice:write",
    "payment:verify",
    "report:read",
  ],
  super_admin: [
    "tenant:manage",
    "property:write",
    "room:write",
    "resident:write",
    "contract:write",
    "invoice:write",
    "payment:verify",
    "settings:write",
    "team:manage",
    "report:read",
    "subscription:manage",
    "admin:impersonate",
    "admin:suspend",
  ],
};

// ---------------------------------------------------------------------------
// Permission check helpers
// ---------------------------------------------------------------------------

/** Check if a role has a specific permission. */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Check if a role meets the minimum required role level. */
export function meetsRoleRequirement(userRole: Role, requiredRole: Role): boolean {
  const hierarchy: Role[] = ["staff", "admin", "owner", "super_admin"];
  const userLevel = hierarchy.indexOf(userRole);
  const requiredLevel = hierarchy.indexOf(requiredRole);
  return userLevel >= requiredLevel;
}

// ---------------------------------------------------------------------------
// withAuth — Higher-order function for Server Actions
// ---------------------------------------------------------------------------

interface WithAuthOptions {
  /** Minimum role required to execute this action. */
  requiredRole?: Role;
  /** Specific permission required. */
  requiredPermission?: Permission;
  /** Allow unauthenticated access (e.g. public payment pages). */
  allowPublic?: boolean;
}

/**
 * Wrap a Server Action with authentication and RBAC enforcement.
 *
 * - Reads the session via Better Auth
 * - Resolves tenant context from request headers (set by middleware)
 * - Runs the action inside `tenantStorage.run()` with the resolved context
 * - Throws if unauthorized (Next.js surfaces this as an error to the client)
 *
 * @example
 * ```ts
 * export const createProperty = withAuth(
 *   async (data: CreatePropertyInput) => { ... },
 *   { requiredPermission: "property:write" }
 * );
 * ```
 */
export function withAuth<T extends (...args: never[]) => unknown>(
  action: T,
  options: WithAuthOptions = {},
): T {
  const wrapped = async (...args: Parameters<T>) => {
    const { getSession } = await import("@/lib/server/auth");

    // Read tenant context from request headers (set by Edge middleware)
    const headerStore = await headers();
    const tenantId = headerStore.get("x-tenant-id");
    const userId = headerStore.get("x-user-id");
    const userRole = headerStore.get("x-user-role") as Role | null;
    const isSuperAdmin = headerStore.get("x-is-super-admin") === "true";

    // --- Public route bypass ---
    if (options.allowPublic && tenantId) {
      const store: TenantStore = {
        tenantId,
        userId: null,
        role: null,
        isSuperAdmin: false,
      };
      return tenantStorage.run(store, () =>
        (action as unknown as (...a: unknown[]) => unknown)(...args),
      );
    }

    // --- Authentication check ---
    const session = await getSession();

    if (!session?.user && !options.allowPublic) {
      throw new Error("Unauthorized: authentication required");
    }

    // Resolve effective tenant/role from session or headers
    const effectiveTenantId =
      tenantId ??
      ((session?.session as Record<string, unknown> | undefined)?.tenantId as
        | string
        | undefined);
    const effectiveUserId = userId ?? session?.user?.id ?? null;
    const effectiveRole =
      userRole ??
      ((session?.session as Record<string, unknown> | undefined)?.role as
        | Role
        | undefined) ??
      null;

    if (!effectiveTenantId && !options.allowPublic) {
      throw new Error("Unauthorized: no tenant context");
    }

    // --- Role check ---
    if (options.requiredRole && effectiveRole) {
      if (!meetsRoleRequirement(effectiveRole, options.requiredRole)) {
        throw new Error(`Forbidden: requires role '${options.requiredRole}'`);
      }
    }

    // --- Permission check ---
    if (options.requiredPermission && effectiveRole) {
      if (!hasPermission(effectiveRole, options.requiredPermission)) {
        throw new Error(`Forbidden: requires permission '${options.requiredPermission}'`);
      }
    }

    // --- Execute within tenant context ---
    const store: TenantStore = {
      tenantId: effectiveTenantId ?? "",
      userId: effectiveUserId,
      role: effectiveRole,
      isSuperAdmin,
    };

    return tenantStorage.run(store, () =>
      (action as unknown as (...a: unknown[]) => unknown)(...args),
    );
  };

  return wrapped as unknown as T;
}

// ---------------------------------------------------------------------------
// requirePermission — for API Routes
// ---------------------------------------------------------------------------

/**
 * Check permission in an API Route handler. Throws if unauthorized.
 * Reads context from request headers set by the Edge middleware.
 *
 * @example
 * ```ts
 * export async function POST(request: Request) {
 *   await requirePermission("invoice:write");
 *   // ... handler logic
 * }
 * ```
 */
export async function requirePermission(permission: Permission): Promise<void> {
  const headerStore = await headers();
  const role = headerStore.get("x-user-role") as Role | null;

  if (!role) {
    throw new Error("Unauthorized: authentication required");
  }

  if (!hasPermission(role, permission)) {
    throw new Error(`Forbidden: requires permission '${permission}'`);
  }
}
