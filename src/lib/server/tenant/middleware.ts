import { type NextRequest, NextResponse } from "next/server";

import type { TenantStore } from "./context";

// ---------------------------------------------------------------------------
// Route classification
// ---------------------------------------------------------------------------

/** Routes that never require tenant resolution (marketing, auth, assets). */
const PUBLIC_PATH_PREFIXES = [
  "/_next",
  "/favicon.ico",
  "/api/auth",
  // Webhooks self-authenticate via the gateway callback token and resolve their
  // own tenant from gateway_config — they must bypass session/subdomain
  // resolution or they would be 401'd before reaching the handler. (Req 7.1)
  "/api/webhooks",
  // Cron endpoints self-authenticate via CRON_SECRET and operate across all
  // tenants, so they have no single tenant context to resolve. (Req 8.1, 10.2)
  "/api/cron",
  "/masuk",
  "/daftar",
  "/onboarding",
] as const;

/** Static asset extensions that bypass middleware entirely. */
const STATIC_EXTENSIONS = [
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".css",
  ".js",
  ".woff",
  ".woff2",
  ".ttf",
] as const;

function isPublicRoute(pathname: string): boolean {
  // Root marketing page
  if (pathname === "/") return true;

  // Static file extensions
  if (STATIC_EXTENSIONS.some((ext) => pathname.endsWith(ext))) return true;

  // Public path prefixes
  if (PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;

  return false;
}

/**
 * Public payment pages (`/pay/[token]`). Tenant resolution is *attempted* from
 * the token so RLS/branding work for valid tokens, but an unresolved token must
 * NOT 401 — the page renders a branded "Tidak ditemukan" state instead. (Req 1.4)
 */
function isPaymentRoute(pathname: string): boolean {
  return pathname === "/pay" || pathname.startsWith("/pay/");
}

// ---------------------------------------------------------------------------
// Subdomain extraction
// ---------------------------------------------------------------------------

/** Base domains where subdomains are meaningful. */
const BASE_DOMAINS = ["koskita.id", "localhost"];

function extractSubdomain(host: string | null): string | null {
  if (!host) return null;

  // Strip port for localhost
  const hostname = host.split(":")[0];

  for (const base of BASE_DOMAINS) {
    if (hostname.endsWith(base) && hostname !== base) {
      const sub = hostname.slice(0, -(base.length + 1)); // +1 for the dot
      // Ignore "www" or empty subdomains
      if (sub && sub !== "www" && sub !== "app") return sub;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Redis cache helpers (lazy import to avoid build-time crashes)
// ---------------------------------------------------------------------------

let _redis: import("@upstash/redis").Redis | null | undefined;

async function getRedis(): Promise<import("@upstash/redis").Redis | null> {
  if (_redis === undefined) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (url && token) {
      const { Redis } = await import("@upstash/redis");
      _redis = new Redis({ url, token });
    } else {
      _redis = null;
    }
  }
  return _redis;
}

const SUBDOMAIN_CACHE_TTL = 3600; // 1 hour

async function lookupSubdomainTenantId(subdomain: string): Promise<string | null> {
  const redis = await getRedis();
  const cacheKey = `tenant:subdomain:${subdomain}`;

  if (!redis) return null;
  try {
    const cached = await redis.get<string>(cacheKey);
    return cached ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Payment token resolution
// ---------------------------------------------------------------------------

async function lookupPaymentTokenTenantId(token: string): Promise<string | null> {
  const redis = await getRedis();
  if (!redis) return null;
  try {
    const cacheKey = `tenant:payment-token:${token}`;
    const cached = await redis.get<string>(cacheKey);
    return cached ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main tenant resolution logic
// ---------------------------------------------------------------------------

export interface TenantResolutionResult {
  resolved: boolean;
  store: TenantStore | null;
  response?: NextResponse;
}

/**
 * Resolve the tenant for the current request.
 *
 * Resolution priority:
 * 1. Authenticated session (JWT claim / cookie placeholder)
 * 2. Payment token from /pay/[token] route
 * 3. Subdomain lookup (cached in Redis)
 * 4. Super admin X-Tenant-ID header (impersonation)
 *
 * TODO: Replace placeholder session extraction with real Better Auth
 * session reading in Task 4.
 */
export async function resolveTenant(
  request: NextRequest,
): Promise<TenantResolutionResult> {
  const { pathname } = request.nextUrl;

  // Skip public routes — no tenant resolution needed
  if (isPublicRoute(pathname)) {
    return { resolved: true, store: null };
  }

  let tenantId: string | null = null;
  let userId: string | null = null;
  let role: TenantStore["role"] = null;

  // --- Strategy 1: Session/JWT placeholder ---
  // TODO: Wire real Better Auth session reading here (Task 4).
  // For now, read from cookie or header as a placeholder.
  const sessionTenantId =
    request.cookies.get("tenant_id")?.value ?? request.headers.get("x-tenant-id");
  const sessionUserId =
    request.cookies.get("user_id")?.value ?? request.headers.get("x-user-id");
  const sessionRole = (request.cookies.get("user_role")?.value ??
    request.headers.get("x-user-role")) as TenantStore["role"];

  if (sessionTenantId) {
    tenantId = sessionTenantId;
    userId = sessionUserId ?? null;
    role = sessionRole ?? null;
  }

  // --- Strategy 2: Payment token route ---
  if (!tenantId) {
    const payTokenMatch = pathname.match(/^\/pay\/([^/]+)/);
    if (payTokenMatch) {
      const token = payTokenMatch[1];
      tenantId = await lookupPaymentTokenTenantId(token);
      // Payment pages are public — no userId/role needed
    }
  }

  // --- Strategy 3: Subdomain ---
  if (!tenantId) {
    const host = request.headers.get("host");
    const subdomain = extractSubdomain(host);
    if (subdomain) {
      tenantId = await lookupSubdomainTenantId(subdomain);
    }
  }

  // --- Strategy 4: Super admin impersonation header ---
  if (!tenantId) {
    const impersonateHeader = request.headers.get("x-tenant-id");
    const impersonateRole = request.headers.get("x-user-role");
    if (impersonateHeader && impersonateRole === "super_admin") {
      tenantId = impersonateHeader;
      role = "super_admin";
      // TODO: Log audit entry for impersonation (Task 14)
    }
  }

  // --- No tenant resolved ---
  if (!tenantId) {
    // Payment pages are public: an unknown token must reach the page so it can
    // render its branded "Tidak ditemukan" state rather than a hard 401. (Req 1.4)
    if (isPaymentRoute(pathname)) {
      return { resolved: true, store: null };
    }

    // Any other protected route with no resolvable tenant → 401. (Req 1.5)
    return {
      resolved: false,
      store: null,
      response: NextResponse.json(
        { error: "Tenant could not be resolved" },
        { status: 401 },
      ),
    };
  }

  const store: TenantStore = {
    tenantId,
    userId,
    role,
    // Derive the flag from the resolved role so it stays consistent regardless
    // of which strategy resolved the tenant (e.g. when the super_admin role
    // arrives via the session/header in Strategy 1 rather than Strategy 4).
    isSuperAdmin: role === "super_admin",
  };

  return { resolved: true, store };
}
