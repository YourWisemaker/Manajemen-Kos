"use client";

/**
 * Visual RBAC rendering helpers — Task 5.2
 * ----------------------------------------
 * Client components that gate UI by the current role from {@link useTenant}:
 *   - {@link usePermissions} — `{ role, can, isOwner }` bound to the active role.
 *   - {@link RoleGate} — gates children by role/capability with two modes:
 *       HIDE (default; render nothing/`fallback`) or DISABLE (keep children
 *       visible but inert, wrapped in a "Hanya untuk Pemilik" tooltip).
 *   - {@link OwnerOnly} — convenience wrapper restricting children to the Owner.
 *   - {@link OwnerAction} — wraps a single action element and renders it
 *     `disabled` (with the owner-only tooltip) for non-owners.
 *
 * The pure capability logic (`can`, `filterNavByRole`, the `Capability` and
 * `NavItem` types) lives in `./permissions.ts` and is re-exported here so call
 * sites can import everything RBAC-related from one module.
 *
 * SECURITY: visual gating only — NOT a security boundary. Real authorization
 * is enforced on the backend in Phase 2. See `./permissions.ts`.
 *
 * Requirements: 20.2, 20.3, 20.4
 */

import { cloneElement, type ReactElement, type ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { copy } from "@/lib/locale/copy/id";
import { cn } from "@/lib/utils";
import { type Capability, can, isOwner as isOwnerRole } from "./permissions";
import { type TenantRole, useTenant } from "./tenant-context";

// Re-export the pure capability/navigation API so RBAC consumers have a single
// import surface (`@/lib/tenant/rbac` or `@/lib/tenant`).
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

/** The tooltip shown on an Owner-only action disabled for other roles (Req 20.3). */
export const OWNER_ONLY_TOOLTIP = copy.rbac.hanyaUntukPemilik;

/** How a gate treats children the current role may not use. */
export type RoleGateMode = "hide" | "disable";

/** Permission API bound to the current role from {@link useTenant}. */
export interface PermissionsApi {
  /** The current user's role. */
  role: TenantRole;
  /** Whether the current role may use `capability`. */
  can: (capability: Capability) => boolean;
  /** Whether the current role is the Owner. */
  isOwner: boolean;
}

/**
 * Permission helper hook reading the current role from {@link useTenant}.
 * Throws (via `useTenant`) when used outside `MockTenantProvider`.
 */
export function usePermissions(): PermissionsApi {
  const { role } = useTenant();
  return {
    role,
    can: (capability: Capability) => can(role, capability),
    isOwner: isOwnerRole(role),
  };
}

/**
 * Wraps `children` in an inert, dimmed container that triggers the owner-only
 * tooltip on hover/focus. Shared by {@link RoleGate} (DISABLE mode) and
 * {@link OwnerOnly}. The wrapper is the focusable trigger because a disabled
 * inner control can't emit pointer/focus events itself.
 */
function DisabledGuard({ children, tooltip }: { children: ReactNode; tooltip: string }) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>
          {/* biome-ignore lint/a11y/useSemanticElements: a <button> would nest interactive content inside the gated action */}
          <span
            aria-disabled="true"
            aria-label={tooltip}
            className={cn(
              "inline-flex cursor-not-allowed select-none opacity-50",
              "[&_*]:pointer-events-none",
            )}
            data-rbac-disabled="true"
            role="button"
            tabIndex={0}
          >
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Props for {@link RoleGate}. */
export interface RoleGateProps {
  children: ReactNode;
  /** Gate by an explicit allow-list of roles. */
  allow?: readonly TenantRole[];
  /** Gate by a capability instead of an explicit role list. */
  capability?: Capability;
  /** `"hide"` (default) renders nothing/`fallback`; `"disable"` renders inert. */
  mode?: RoleGateMode;
  /** Tooltip text used in DISABLE mode. Defaults to "Hanya untuk Pemilik". */
  disabledTooltip?: string;
  /** Rendered in HIDE mode when the current role is not allowed. */
  fallback?: ReactNode;
}

/** Resolve whether `role` passes the gate's `capability`/`allow` rule. */
function gateAllows(
  role: TenantRole,
  capability: RoleGateProps["capability"],
  allow: RoleGateProps["allow"],
): boolean {
  if (capability !== undefined) {
    return can(role, capability);
  }
  if (allow !== undefined) {
    return allow.includes(role);
  }
  // No rule given ⇒ default to Owner-only, matching the common call site.
  return isOwnerRole(role);
}

/**
 * Gates `children` by the current role.
 *
 * - HIDE mode (default): renders `children` when allowed, otherwise `fallback`
 *   (or nothing).
 * - DISABLE mode: always keeps `children` visible; when denied they are
 *   wrapped in an inert `[data-rbac-disabled]` container that triggers the
 *   "Hanya untuk Pemilik" tooltip on hover/focus (Requirement 20.3).
 */
export function RoleGate({
  children,
  allow,
  capability,
  mode = "hide",
  disabledTooltip = OWNER_ONLY_TOOLTIP,
  fallback = null,
}: RoleGateProps) {
  const { role } = useTenant();
  const allowed = gateAllows(role, capability, allow);

  if (allowed) {
    return <>{children}</>;
  }

  if (mode === "hide") {
    return <>{fallback}</>;
  }

  return <DisabledGuard tooltip={disabledTooltip}>{children}</DisabledGuard>;
}

/** Props for {@link OwnerOnly}. */
export interface OwnerOnlyProps {
  children: ReactNode;
  /** `"hide"` (default) or `"disable"` with the owner-only tooltip. */
  mode?: RoleGateMode;
  /** Tooltip text used in DISABLE mode. Defaults to "Hanya untuk Pemilik". */
  disabledTooltip?: string;
  /** Optional fallback rendered in HIDE mode for non-owners. */
  fallback?: ReactNode;
}

/**
 * Convenience wrapper restricting children to the Owner role. Equivalent to a
 * {@link RoleGate} with `allow={["owner"]}`.
 *
 * Requirement: 20.2
 */
export function OwnerOnly({
  children,
  mode = "hide",
  disabledTooltip = OWNER_ONLY_TOOLTIP,
  fallback = null,
}: OwnerOnlyProps) {
  return (
    <RoleGate
      allow={["owner"]}
      mode={mode}
      disabledTooltip={disabledTooltip}
      fallback={fallback}
    >
      {children}
    </RoleGate>
  );
}

/** Props for {@link OwnerAction}. */
export interface OwnerActionProps {
  /** A single interactive element (typically a themed `<Button>`) to gate. */
  children: ReactElement<{ disabled?: boolean }>;
  /** Tooltip/aria-label shown when disabled (default: "Hanya untuk Pemilik"). */
  disabledMessage?: string;
}

/**
 * Gate a single action element by role WITHOUT hiding it. The Owner gets the
 * action unchanged; non-owners get the same action rendered with `disabled`
 * set and wrapped in a tooltip trigger labeled "Hanya untuk Pemilik"
 * (Req 20.2, 20.3). Use this when the child accepts a `disabled` prop and you
 * want the control itself (not just a wrapper) to be disabled.
 */
export function OwnerAction({
  children,
  disabledMessage = OWNER_ONLY_TOOLTIP,
}: OwnerActionProps) {
  const { role } = useTenant();

  if (isOwnerRole(role)) {
    return children;
  }

  const disabledChild = cloneElement(children, { disabled: true });

  return (
    <TooltipProvider>
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>
          {/* biome-ignore lint/a11y/useSemanticElements: a <button> would nest interactive content inside the gated action */}
          <span
            aria-disabled="true"
            aria-label={disabledMessage}
            className={cn("inline-flex cursor-not-allowed")}
            data-rbac-disabled="true"
            role="button"
            tabIndex={0}
          >
            {disabledChild}
          </span>
        </TooltipTrigger>
        <TooltipContent>{disabledMessage}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
