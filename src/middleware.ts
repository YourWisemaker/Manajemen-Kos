import { type NextRequest, NextResponse } from "next/server";

import { checkRateLimit } from "@/lib/server/ratelimit";
import { resolveTenant } from "@/lib/server/tenant/middleware";

export async function middleware(request: NextRequest): Promise<NextResponse> {
  // --- Step 1: Resolve tenant ---
  const resolution = await resolveTenant(request);

  // Public route — no tenant needed, pass through
  if (resolution.resolved && !resolution.store) {
    return NextResponse.next();
  }

  // Failed to resolve tenant on a protected route
  if (!resolution.resolved && resolution.response) {
    return resolution.response;
  }

  const store = resolution.store!;

  // --- Step 2: Rate limiting (after tenant resolution) ---
  const rateLimitResult = await checkRateLimit(store.tenantId, request);

  if (!rateLimitResult.success) {
    const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(retryAfter, 1)),
          "X-RateLimit-Limit": String(rateLimitResult.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rateLimitResult.reset),
        },
      },
    );
  }

  // --- Step 3: Propagate tenant context via headers ---
  // Next.js Edge middleware cannot use AsyncLocalStorage directly.
  // We pass the resolved tenant info via request headers so that
  // Server Components / Server Actions can pick it up and call
  // tenantStorage.run() in the Node.js runtime.
  const response = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  });

  // Set internal headers for downstream consumption
  response.headers.set("x-tenant-id", store.tenantId);
  if (store.userId) response.headers.set("x-user-id", store.userId);
  if (store.role) response.headers.set("x-user-role", store.role);
  if (store.isSuperAdmin) response.headers.set("x-is-super-admin", "true");

  // Also set rate limit info headers for observability
  response.headers.set("X-RateLimit-Limit", String(rateLimitResult.limit));
  response.headers.set("X-RateLimit-Remaining", String(rateLimitResult.remaining));

  return response;
}

/**
 * Matcher config: apply middleware to all routes EXCEPT static assets,
 * Next.js internals, and image optimization.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - Public assets in /public folder (file extensions)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|ico|css|js|woff|woff2|ttf|map)$).*)",
  ],
};
