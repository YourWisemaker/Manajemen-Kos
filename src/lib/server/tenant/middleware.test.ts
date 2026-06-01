/**
 * Unit tests for the Tenant Resolver — Task 2.3
 *
 * Validates the resolution priority order and route classification:
 *   1. JWT/session → 2. payment token → 3. subdomain → 4. impersonation header
 * plus public-route pass-through and 401 rejection on unresolved protected
 * routes.
 *
 * These tests are hermetic: DATABASE_URL and the Upstash Redis env vars are
 * cleared so the payment-token / subdomain DB+cache lookups deterministically
 * resolve to `null` (they fail gracefully by design).
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { resolveTenant } from "./middleware";

const savedEnv: Record<string, string | undefined> = {};

beforeAll(() => {
  // Snapshot then clear env so DB/Redis lookups return null deterministically.
  for (const key of [
    "DATABASE_URL",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
  ]) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterAll(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function makeRequest(
  url: string,
  init?: { cookies?: Record<string, string>; headers?: Record<string, string> },
): NextRequest {
  const headers = new Headers(init?.headers);
  if (init?.cookies) {
    const cookie = Object.entries(init.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
    headers.set("cookie", cookie);
  }
  return new NextRequest(url, { headers });
}

describe("resolveTenant — public route pass-through (Req 1.1)", () => {
  it.each([
    "https://app.koskita.id/",
    "https://app.koskita.id/masuk",
    "https://app.koskita.id/daftar",
    "https://app.koskita.id/onboarding",
    "https://app.koskita.id/api/auth/session",
  ])("treats %s as public (no tenant required)", async (url) => {
    const result = await resolveTenant(makeRequest(url));
    expect(result.resolved).toBe(true);
    expect(result.store).toBeNull();
    expect(result.response).toBeUndefined();
  });

  it("treats /api/webhooks/* as public so self-authenticating webhooks pass through", async () => {
    const result = await resolveTenant(
      makeRequest("https://app.koskita.id/api/webhooks/xendit"),
    );
    expect(result.resolved).toBe(true);
    expect(result.store).toBeNull();
  });

  it("treats /api/cron/* as public so CRON_SECRET-protected jobs pass through", async () => {
    const result = await resolveTenant(
      makeRequest("https://app.koskita.id/api/cron/billing"),
    );
    expect(result.resolved).toBe(true);
    expect(result.store).toBeNull();
  });
});

describe("resolveTenant — resolution priority (Req 1.2, 1.3, 1.4)", () => {
  it("resolves tenant from the session cookie first (Req 1.2)", async () => {
    const result = await resolveTenant(
      makeRequest("https://app.koskita.id/dasbor", {
        cookies: { tenant_id: "tenant-123", user_id: "user-9", user_role: "owner" },
      }),
    );
    expect(result.resolved).toBe(true);
    expect(result.store).toMatchObject({
      tenantId: "tenant-123",
      userId: "user-9",
      role: "owner",
      isSuperAdmin: false,
    });
  });

  it("prefers the session cookie over a subdomain when both are present (priority)", async () => {
    const result = await resolveTenant(
      makeRequest("https://kosbunga.koskita.id/dasbor", {
        cookies: { tenant_id: "tenant-from-session" },
      }),
    );
    expect(result.store?.tenantId).toBe("tenant-from-session");
  });

  it("resolves super-admin impersonation via X-Tenant-ID + super_admin role (Req 1.4 / header)", async () => {
    const result = await resolveTenant(
      makeRequest("https://app.koskita.id/admin/data", {
        headers: { "x-tenant-id": "tenant-imp", "x-user-role": "super_admin" },
      }),
    );
    expect(result.resolved).toBe(true);
    expect(result.store).toMatchObject({
      tenantId: "tenant-imp",
      role: "super_admin",
      isSuperAdmin: true,
    });
  });
});

describe("resolveTenant — payment route handling (Req 1.4)", () => {
  it("does NOT 401 an unknown /pay token — lets the page render its not-found state", async () => {
    const result = await resolveTenant(
      makeRequest("https://app.koskita.id/pay/unknown-token"),
    );
    expect(result.resolved).toBe(true);
    expect(result.store).toBeNull();
    expect(result.response).toBeUndefined();
  });
});

describe("resolveTenant — unresolved protected routes (Req 1.5)", () => {
  it("rejects a protected route with 401 when no tenant can be resolved", async () => {
    const result = await resolveTenant(makeRequest("https://app.koskita.id/dasbor"));
    expect(result.resolved).toBe(false);
    expect(result.store).toBeNull();
    expect(result.response?.status).toBe(401);
  });
});
