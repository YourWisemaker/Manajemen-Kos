import type { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Endpoint categories and their rate limits (requests per window)
// ---------------------------------------------------------------------------

export type EndpointCategory = "dashboard" | "webhook" | "auth" | "api" | "payment";

interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Window duration in seconds */
  window: number;
}

const RATE_LIMITS: Record<EndpointCategory, RateLimitConfig> = {
  dashboard: { limit: 60, window: 60 }, // 60 req/min
  webhook: { limit: 200, window: 60 }, // 200 req/min
  auth: { limit: 10, window: 60 }, // 10 req/min
  api: { limit: 120, window: 60 }, // 120 req/min
  payment: { limit: 30, window: 60 }, // 30 req/min
};

// ---------------------------------------------------------------------------
// Classify request into an endpoint category
// ---------------------------------------------------------------------------

export function classifyEndpoint(pathname: string): EndpointCategory {
  if (pathname.startsWith("/api/webhooks")) return "webhook";
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/masuk")) return "auth";
  if (pathname.startsWith("/pay/")) return "payment";
  if (pathname.startsWith("/api/")) return "api";
  return "dashboard";
}

// ---------------------------------------------------------------------------
// Rate limit result
// ---------------------------------------------------------------------------

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// ---------------------------------------------------------------------------
// Lazy Upstash Ratelimit instances (one per category)
// ---------------------------------------------------------------------------

type RatelimitInstance = import("@upstash/ratelimit").Ratelimit;

let _limiters: Map<EndpointCategory, RatelimitInstance> | null = null;
let _initFailed = false;

async function getLimiters(): Promise<Map<EndpointCategory, RatelimitInstance> | null> {
  if (_initFailed) return null;
  if (_limiters) return _limiters;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    // Fail open: Redis is not configured. Log a warning once (not per-request)
    // so the operator knows rate limiting is disabled. (Req 14.5)
    console.warn(
      "[ratelimit] UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN not set — rate limiting disabled (failing open).",
    );
    _initFailed = true;
    return null;
  }

  try {
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");

    const redis = new Redis({ url, token });
    const map = new Map<EndpointCategory, RatelimitInstance>();

    for (const [category, config] of Object.entries(RATE_LIMITS)) {
      map.set(
        category as EndpointCategory,
        new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(config.limit, `${config.window} s`),
          prefix: `ratelimit:${category}`,
          analytics: false,
        }),
      );
    }

    _limiters = map;
    return _limiters;
  } catch (error) {
    console.warn("[ratelimit] Failed to initialize Upstash Ratelimit:", error);
    _initFailed = true;
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check rate limit for a tenant + endpoint category.
 * Returns the rate limit result. If Redis is unavailable, fails open
 * (allows the request) and logs a warning.
 *
 * @param tenantId - The resolved tenant ID
 * @param request - The incoming Next.js request (used to classify endpoint)
 */
export async function checkRateLimit(
  tenantId: string,
  request: NextRequest,
): Promise<RateLimitResult> {
  const category = classifyEndpoint(request.nextUrl.pathname);
  const config = RATE_LIMITS[category];

  const limiters = await getLimiters();

  // Fail open if Redis is unavailable
  if (!limiters) {
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit,
      reset: Date.now() + config.window * 1000,
    };
  }

  const limiter = limiters.get(category);
  if (!limiter) {
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit,
      reset: Date.now() + config.window * 1000,
    };
  }

  const key = `${tenantId}:${category}`;

  try {
    const result = await limiter.limit(key);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    // Fail open — Redis error should not block requests
    console.warn(
      `[ratelimit] Redis error for tenant ${tenantId}, category ${category}:`,
      error,
    );
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit,
      reset: Date.now() + config.window * 1000,
    };
  }
}

/**
 * Get the rate limit configuration for a given endpoint category.
 * Useful for testing and introspection.
 */
export function getRateLimitConfig(category: EndpointCategory): RateLimitConfig {
  return RATE_LIMITS[category];
}
