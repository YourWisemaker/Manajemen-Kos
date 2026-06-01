import fc from "fast-check";
import type { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { pbtConfig } from "@/test/pbt";
import {
  checkRateLimit,
  classifyEndpoint,
  type EndpointCategory,
  getRateLimitConfig,
} from "./index";

/**
 * Rate limiting property tests — Task 2.5
 * ---------------------------------------
 * Property 16 (Rate Limit Enforcement): *for any* tenant exceeding their
 * per-endpoint rate limit, all subsequent requests within the window must be
 * rejected (the 429 + `Retry-After` path), and requests from other tenants
 * must not be affected.
 *
 * **Validates: Requirements 14.1, 14.2**
 *
 * Hermetic strategy
 * -----------------
 * `checkRateLimit` derives its category from the request path via the REAL
 * `classifyEndpoint` and keys Upstash by `${tenantId}:${category}`. We exercise
 * that real code path end-to-end, but no live Redis exists in the test
 * environment, so we replace ONLY the `@upstash/ratelimit` backend with a
 * deterministic in-memory sliding-window model that mirrors the documented
 * semantics: the first `limit` requests for a key succeed and the next one
 * fails. Real key-derivation, endpoint classification, and the fail-open guards
 * all stay live; only the network-bound counter store is simulated.
 */

// Shared in-memory counter store, hoisted so the `@upstash/ratelimit` mock
// factory (also hoisted) can close over it. Cleared per property run.
const { rlStore } = vi.hoisted(() => ({ rlStore: new Map<string, number>() }));

vi.mock("@upstash/redis", () => ({
  // The real REST client is never contacted; a bare stub satisfies `new Redis()`.
  Redis: class FakeRedis {},
}));

vi.mock("@upstash/ratelimit", () => {
  // Deterministic sliding-window model keyed by `${prefix}|${key}`. One instance
  // per category is created by `getLimiters()` (prefix `ratelimit:${category}`)
  // and `.limit()` is called with `${tenantId}:${category}` — so distinct
  // tenants and categories map to distinct counters (the isolation invariant).
  class FakeRatelimit {
    readonly #limit: number;
    readonly #prefix: string;

    constructor(opts: { limiter: { limit: number }; prefix: string }) {
      this.#limit = opts.limiter.limit;
      this.#prefix = opts.prefix;
    }

    static slidingWindow(limit: number, _window: string) {
      return { limit };
    }

    async limit(key: string) {
      const composite = `${this.#prefix}|${key}`;
      const used = rlStore.get(composite) ?? 0;
      const reset = Date.now() + 60_000;
      if (used < this.#limit) {
        rlStore.set(composite, used + 1);
        return {
          success: true,
          limit: this.#limit,
          remaining: this.#limit - used - 1,
          reset,
        };
      }
      return { success: false, limit: this.#limit, remaining: 0, reset };
    }
  }

  return { Ratelimit: FakeRatelimit };
});

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const CATEGORIES: readonly EndpointCategory[] = [
  "dashboard",
  "webhook",
  "auth",
  "api",
  "payment",
];

/** A representative path that `classifyEndpoint` maps to each category. */
const PATHS: Record<EndpointCategory, string> = {
  webhook: "/api/webhooks/xendit",
  auth: "/api/auth/sign-in",
  payment: "/pay/tok_abc123",
  api: "/api/invoices",
  dashboard: "/dasbor",
};

/** Categories ordered by ascending sensitivity-derived limit (as designed). */
const LIMITS_ASC: readonly EndpointCategory[] = [
  "auth", // 10
  "payment", // 30
  "dashboard", // 60
  "api", // 120
  "webhook", // 200
];

/**
 * `checkRateLimit` only reads `request.nextUrl.pathname`, so a minimal stub is
 * faithful to the contract it depends on and avoids constructing a full
 * `NextRequest` (which needs an absolute URL + edge runtime).
 */
function makeRequest(pathname: string): NextRequest {
  return { nextUrl: { pathname } } as unknown as NextRequest;
}

// The lazy limiter init only runs when Redis env vars are present; set dummy
// values so the real code wires up our mocked backend instead of failing open.
const PREV_URL = process.env.UPSTASH_REDIS_REST_URL;
const PREV_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

beforeAll(() => {
  process.env.UPSTASH_REDIS_REST_URL = "https://fake.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token";
});

afterAll(() => {
  if (PREV_URL === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
  else process.env.UPSTASH_REDIS_REST_URL = PREV_URL;
  if (PREV_TOKEN === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
  else process.env.UPSTASH_REDIS_REST_TOKEN = PREV_TOKEN;
});

// ---------------------------------------------------------------------------
// classifyEndpoint — real per-endpoint classification (Req 14.1)
// ---------------------------------------------------------------------------

describe("classifyEndpoint (Req 14.1 — per-endpoint classification)", () => {
  it("maps every path to exactly one valid category (total function)", () => {
    // **Validates: Requirements 14.1**
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(),
          fc.constantFrom(
            "/",
            "/dasbor",
            "/penghuni",
            "/masuk",
            "/daftar",
            "/api/webhooks/midtrans",
            "/api/auth/callback",
            "/api/invoices",
            "/pay/tok123",
          ),
          fc.string().map((s) => `/api/${s}`),
          fc.string().map((s) => `/pay/${s}`),
          fc.string().map((s) => `/api/webhooks/${s}`),
        ),
        (path) => {
          expect(CATEGORIES).toContain(classifyEndpoint(path));
        },
      ),
      pbtConfig,
    );
  });

  it("classifies each representative fixture path into its intended category", () => {
    // **Validates: Requirements 14.1**
    for (const category of CATEGORIES) {
      expect(classifyEndpoint(PATHS[category])).toBe(category);
    }
  });
});

// ---------------------------------------------------------------------------
// Per-endpoint limit differentiation (Req 14.1 — sensitivity-based limits)
// ---------------------------------------------------------------------------

describe("getRateLimitConfig (Req 14.1 — limits differ by endpoint sensitivity)", () => {
  it("orders limits strictly by sensitivity (auth < payment < dashboard < api < webhook)", () => {
    // **Validates: Requirements 14.1**
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: LIMITS_ASC.length - 1 }),
        fc.integer({ min: 0, max: LIMITS_ASC.length - 1 }),
        (i, j) => {
          const li = getRateLimitConfig(LIMITS_ASC[i]).limit;
          const lj = getRateLimitConfig(LIMITS_ASC[j]).limit;
          if (i < j) expect(li).toBeLessThan(lj);
          else if (i > j) expect(li).toBeGreaterThan(lj);
          else expect(li).toBe(lj);
        },
      ),
      pbtConfig,
    );
  });

  it("exposes the designed distinct limits and positive windows", () => {
    // **Validates: Requirements 14.1**
    expect(getRateLimitConfig("auth").limit).toBe(10);
    expect(getRateLimitConfig("payment").limit).toBe(30);
    expect(getRateLimitConfig("dashboard").limit).toBe(60);
    expect(getRateLimitConfig("api").limit).toBe(120);
    expect(getRateLimitConfig("webhook").limit).toBe(200);
    for (const category of CATEGORIES) {
      expect(getRateLimitConfig(category).window).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Property 16 — Rate Limit Enforcement (Req 14.1, 14.2)
// ---------------------------------------------------------------------------

describe("Property 16 — Rate Limit Enforcement (Req 14.1, 14.2)", () => {
  it("rejects further requests once a tenant exceeds its per-endpoint limit", async () => {
    // **Validates: Requirements 14.1, 14.2**
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom(...CATEGORIES),
        async (tenantId, category) => {
          rlStore.clear();
          const req = makeRequest(PATHS[category]);
          const limit = getRateLimitConfig(category).limit;

          // Every request up to the limit succeeds.
          for (let i = 0; i < limit; i++) {
            const result = await checkRateLimit(tenantId, req);
            expect(result.success).toBe(true);
          }

          // The request that exceeds the limit is rejected → drives the 429 path.
          const blocked = await checkRateLimit(tenantId, req);
          expect(blocked.success).toBe(false);
          expect(blocked.limit).toBe(limit);

          // The middleware derives a valid (>= 1s) `Retry-After` from `reset`.
          const retryAfter = Math.max(Math.ceil((blocked.reset - Date.now()) / 1000), 1);
          expect(retryAfter).toBeGreaterThanOrEqual(1);
        },
      ),
      pbtConfig,
    );
  });

  it("never lets one tenant's exhausted quota affect another tenant", async () => {
    // **Validates: Requirements 14.1, 14.2**
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.constantFrom(...CATEGORIES),
        async (tenantA, tenantB, category) => {
          fc.pre(tenantA !== tenantB);
          rlStore.clear();
          const req = makeRequest(PATHS[category]);
          const limit = getRateLimitConfig(category).limit;

          // Exhaust tenant A's quota for this endpoint category.
          for (let i = 0; i < limit; i++) {
            await checkRateLimit(tenantA, req);
          }
          const aBlocked = await checkRateLimit(tenantA, req);
          expect(aBlocked.success).toBe(false);

          // Tenant B is completely unaffected: full quota still available.
          for (let i = 0; i < limit; i++) {
            const result = await checkRateLimit(tenantB, req);
            expect(result.success).toBe(true);
          }

          // ...and B is then independently enforced once it hits its own limit.
          const bBlocked = await checkRateLimit(tenantB, req);
          expect(bBlocked.success).toBe(false);
        },
      ),
      pbtConfig,
    );
  });
});
