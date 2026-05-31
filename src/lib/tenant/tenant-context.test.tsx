import { fireEvent, render, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";
import { PRIMARY_TENANT_SEED } from "@/lib/mock/fixtures";
import type { TenantSettings } from "@/lib/mock/types";
import { can, OWNER_CAPABILITIES, OWNER_ONLY_CAPABILITIES } from "./permissions";
import { OWNER_ONLY_TOOLTIP, OwnerAction, RoleGate } from "./rbac";
import {
  MockTenantProvider,
  type MockTenantProviderProps,
  ROLE_LABELS,
  type TenantRole,
  useTenant,
} from "./tenant-context";

/**
 * Mock Tenant Context + visual RBAC tests — Task 5
 * ------------------------------------------------
 * Verifies the tenant context contract (Req 20.1): `useTenant` throws outside
 * its provider and exposes the active tenant, role, and branding inside it.
 * Also covers the visual RBAC helpers: `RoleGate` hides content for disallowed
 * roles and shows it for allowed roles (Req 20.4), and `OwnerAction` disables
 * the action with the exact "Hanya untuk Pemilik" tooltip for non-owners while
 * leaving it interactive for the Owner (Req 20.2, 20.3).
 *
 * Validates: Requirements 20.1, 20.2, 20.3, 20.4
 */

// Radix Tooltip positions its content with Popper, which observes layout via
// ResizeObserver — absent in jsdom. A no-op stub lets the tooltip content mount
// so we can assert the owner-only message when the trigger is focused.
beforeAll(() => {
  if (!("ResizeObserver" in globalThis)) {
    class ResizeObserverStub {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub;
  }
});

/** Build a provider wrapper with an optional starting tenant/role. */
function wrapper(props: Partial<MockTenantProviderProps> = {}) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MockTenantProvider {...props}>{children}</MockTenantProvider>;
  };
}

describe("useTenant (Req 20.1)", () => {
  it("throws a clear error when used outside the provider", () => {
    expect(() => renderHook(() => useTenant())).toThrow(
      "useTenant harus dipakai di dalam <MockTenantProvider>.",
    );
  });

  it("exposes the active tenant, role, and branding inside the provider", () => {
    const { result } = renderHook(() => useTenant(), { wrapper: wrapper() });

    // Defaults: the primary mock tenant and the Owner role.
    const { settings } = PRIMARY_TENANT_SEED;
    expect(result.current.tenant.id).toBe(settings.id);
    expect(result.current.role).toBe<TenantRole>("owner");

    // Branding is derived from the active tenant's settings.
    expect(result.current.branding).toEqual({
      name: settings.name,
      subdomain: settings.subdomain,
      logoUrl: settings.logoUrl,
      brandColor: settings.brandColor,
    });
  });

  it("honours the initialTenant and initialRole props", () => {
    const otherTenant: TenantSettings = {
      ...PRIMARY_TENANT_SEED.settings,
      id: "tenant-lain",
      name: "Kos Lain",
      subdomain: "koslain",
      brandColor: "#1F5C8B",
    };
    const { result } = renderHook(() => useTenant(), {
      wrapper: wrapper({ initialTenant: otherTenant, initialRole: "staff" }),
    });

    expect(result.current.tenant.id).toBe("tenant-lain");
    expect(result.current.role).toBe<TenantRole>("staff");
    expect(result.current.branding.name).toBe("Kos Lain");
    expect(ROLE_LABELS[result.current.role]).toBe("Staff");
  });
});

describe("RoleGate hides/shows by role (Req 20.4)", () => {
  it("renders children for an allowed role", () => {
    render(
      <RoleGate allow={["owner", "admin"]}>
        <span>Menu Pengaturan</span>
      </RoleGate>,
      { wrapper: wrapper({ initialRole: "admin" }) },
    );
    expect(screen.getByText("Menu Pengaturan")).toBeInTheDocument();
  });

  it("hides children for a disallowed role", () => {
    render(
      <RoleGate allow={["owner"]}>
        <span>Menu Pengaturan</span>
      </RoleGate>,
      { wrapper: wrapper({ initialRole: "staff" }) },
    );
    expect(screen.queryByText("Menu Pengaturan")).not.toBeInTheDocument();
  });

  it("renders the fallback for a disallowed role", () => {
    render(
      <RoleGate allow={["owner"]} fallback={<span>Akses terbatas</span>}>
        <span>Menu Pengaturan</span>
      </RoleGate>,
      { wrapper: wrapper({ initialRole: "staff" }) },
    );
    expect(screen.queryByText("Menu Pengaturan")).not.toBeInTheDocument();
    expect(screen.getByText("Akses terbatas")).toBeInTheDocument();
  });

  it("gates by capability, not just an explicit role list", () => {
    render(
      <RoleGate capability="deleteTenant">
        <span>Hapus Tenant</span>
      </RoleGate>,
      { wrapper: wrapper({ initialRole: "admin" }) },
    );
    // deleteTenant is Owner-only, so an admin does not see it.
    expect(screen.queryByText("Hapus Tenant")).not.toBeInTheDocument();
  });
});

describe("OwnerAction disables for non-owners (Req 20.2, 20.3)", () => {
  it("renders the action enabled and unwrapped for the Owner role", () => {
    render(
      <OwnerAction>
        <Button>Hapus Tenant</Button>
      </OwnerAction>,
      { wrapper: wrapper({ initialRole: "owner" }) },
    );
    expect(screen.getByRole("button", { name: "Hapus Tenant" })).toBeEnabled();
    // No disabled wrapper is rendered for the Owner.
    expect(document.querySelector('[data-rbac-disabled="true"]')).toBeNull();
  });

  it("disables the action and exposes the owner-only label for staff", () => {
    render(
      <OwnerAction>
        <Button>Hapus Tenant</Button>
      </OwnerAction>,
      { wrapper: wrapper({ initialRole: "staff" }) },
    );

    // The inner action stays visible but is disabled (Req 20.2).
    expect(screen.getByText("Hapus Tenant").closest("button")).toBeDisabled();

    // The wrapper trigger carries the exact required message (Req 20.3).
    const guard = document.querySelector('[data-rbac-disabled="true"]');
    expect(guard).not.toBeNull();
    expect(guard).toHaveAttribute("aria-label", OWNER_ONLY_TOOLTIP);
    expect(OWNER_ONLY_TOOLTIP).toBe("Hanya untuk Pemilik");
  });

  it("shows the 'Hanya untuk Pemilik' tooltip content when the trigger is focused", async () => {
    render(
      <OwnerAction>
        <Button>Ubah Langganan</Button>
      </OwnerAction>,
      { wrapper: wrapper({ initialRole: "admin" }) },
    );

    const guard = document.querySelector('[data-rbac-disabled="true"]');
    expect(guard).not.toBeNull();
    // Focusing the trigger opens the Radix tooltip (no hover delay on focus).
    fireEvent.focus(guard as Element);

    const tip = await screen.findAllByText(OWNER_ONLY_TOOLTIP);
    expect(tip.length).toBeGreaterThan(0);
  });
});

describe("can() capability matrix (Req 20.2)", () => {
  it("permits the Owner every owner-only capability", () => {
    for (const capability of OWNER_ONLY_CAPABILITIES) {
      expect(can("owner", capability)).toBe(true);
    }
    // Named handles resolve to the owner-only capabilities.
    expect(can("owner", OWNER_CAPABILITIES.deleteTenant)).toBe(true);
    expect(can("owner", OWNER_CAPABILITIES.changeSubscription)).toBe(true);
  });

  it("denies non-owner roles the owner-only capabilities", () => {
    for (const capability of OWNER_ONLY_CAPABILITIES) {
      expect(can("admin", capability)).toBe(false);
      expect(can("staff", capability)).toBe(false);
    }
  });
});
