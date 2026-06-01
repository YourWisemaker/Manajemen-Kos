import { describe, expect, it } from "vitest";

import {
  AuthError,
  ForbiddenError,
  hasPermission,
  meetsRoleRequirement,
  type Permission,
  ROLE_PERMISSIONS,
  type Role,
  toAuthErrorResponse,
  UnauthorizedError,
} from "./rbac";

/**
 * RBAC unit tests — Task 4.2
 * --------------------------
 * Verify the pure authorization logic: the role→permission mapping
 * (Requirements 4.4, 4.5), the permission/role check helpers, and the typed
 * 401 / 403 errors (Requirements 4.2, 4.3).
 */

const ALL_ROLES: Role[] = ["owner", "admin", "staff", "super_admin"];

describe("ROLE_PERMISSIONS mapping — Req 4.4, 4.5", () => {
  it("defines a permission set for every supported role", () => {
    for (const role of ALL_ROLES) {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
      expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
    }
  });

  it("grants owner full tenant-level management permissions", () => {
    expect(ROLE_PERMISSIONS.owner).toContain("tenant:manage");
    expect(ROLE_PERMISSIONS.owner).toContain("team:manage");
    expect(ROLE_PERMISSIONS.owner).toContain("subscription:manage");
  });

  it("restricts admin from tenant and team management", () => {
    expect(ROLE_PERMISSIONS.admin).not.toContain("tenant:manage");
    expect(ROLE_PERMISSIONS.admin).not.toContain("team:manage");
    expect(ROLE_PERMISSIONS.admin).not.toContain("subscription:manage");
  });

  it("restricts staff to operational write permissions only", () => {
    expect(ROLE_PERMISSIONS.staff).not.toContain("settings:write");
    expect(ROLE_PERMISSIONS.staff).not.toContain("tenant:manage");
    expect(ROLE_PERMISSIONS.staff).toContain("invoice:write");
    expect(ROLE_PERMISSIONS.staff).toContain("payment:verify");
  });

  it("grants super_admin the platform-only permissions", () => {
    expect(ROLE_PERMISSIONS.super_admin).toContain("admin:impersonate");
    expect(ROLE_PERMISSIONS.super_admin).toContain("admin:suspend");
  });

  it("never grants platform admin permissions to tenant roles", () => {
    for (const role of ["owner", "admin", "staff"] as Role[]) {
      expect(ROLE_PERMISSIONS[role]).not.toContain("admin:impersonate");
      expect(ROLE_PERMISSIONS[role]).not.toContain("admin:suspend");
    }
  });
});

describe("hasPermission", () => {
  it("returns true when the role's set includes the permission", () => {
    expect(hasPermission("owner", "tenant:manage")).toBe(true);
    expect(hasPermission("staff", "invoice:write")).toBe(true);
  });

  it("returns false when the role lacks the permission", () => {
    expect(hasPermission("staff", "settings:write")).toBe(false);
    expect(hasPermission("admin", "admin:suspend")).toBe(false);
  });

  it("is consistent with the ROLE_PERMISSIONS mapping for every role", () => {
    for (const role of ALL_ROLES) {
      for (const permission of ROLE_PERMISSIONS[role]) {
        expect(hasPermission(role, permission)).toBe(true);
      }
    }
  });

  it("returns false for an unknown role", () => {
    expect(hasPermission("ghost" as Role, "invoice:write")).toBe(false);
  });
});

describe("meetsRoleRequirement", () => {
  it("allows a role to satisfy its own requirement", () => {
    for (const role of ALL_ROLES) {
      expect(meetsRoleRequirement(role, role)).toBe(true);
    }
  });

  it("respects the staff < admin < owner < super_admin hierarchy", () => {
    expect(meetsRoleRequirement("owner", "admin")).toBe(true);
    expect(meetsRoleRequirement("super_admin", "owner")).toBe(true);
    expect(meetsRoleRequirement("admin", "owner")).toBe(false);
    expect(meetsRoleRequirement("staff", "admin")).toBe(false);
  });
});

describe("typed auth errors — Req 4.2, 4.3", () => {
  it("UnauthorizedError carries a 401 status code", () => {
    const err = new UnauthorizedError();
    expect(err).toBeInstanceOf(AuthError);
    expect(err.statusCode).toBe(401);
  });

  it("ForbiddenError carries a 403 status code", () => {
    const err = new ForbiddenError();
    expect(err).toBeInstanceOf(AuthError);
    expect(err.statusCode).toBe(403);
  });
});

describe("toAuthErrorResponse — Req 4.2, 4.3", () => {
  it("maps UnauthorizedError to a 401 response", async () => {
    const res = toAuthErrorResponse(new UnauthorizedError());
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: "Unauthorized: authentication required",
    });
  });

  it("maps ForbiddenError to a 403 response", async () => {
    const res = toAuthErrorResponse(
      new ForbiddenError("Forbidden: requires permission 'invoice:write'"),
    );
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({
      error: "Forbidden: requires permission 'invoice:write'",
    });
  });

  it("maps an unexpected error to a 500 response", () => {
    const res = toAuthErrorResponse(new Error("boom"));
    expect(res.status).toBe(500);
  });

  it("maps a non-Error value to a 500 response with a generic message", async () => {
    const res = toAuthErrorResponse("weird");
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "Internal Server Error" });
  });
});

describe("Permission type coverage", () => {
  it("the union of all role permissions stays within the Permission type", () => {
    const known: Permission[] = [
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
    ];
    const granted = new Set<string>();
    for (const role of ALL_ROLES) {
      for (const p of ROLE_PERMISSIONS[role]) granted.add(p);
    }
    for (const g of granted) {
      expect(known).toContain(g as Permission);
    }
  });
});
