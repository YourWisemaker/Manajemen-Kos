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

  // --- Step 3: Propagate tenant context via REQUEST headers ---
  // Next.js Edge middleware cannot use AsyncLocalStorage directly. We forward
  // the resolved tenant info on the *request* headers so Server Components /
  // Server Actions (running in the Node.js runtime) can read them via
  // `headers()` and call `tenantStorage.run()`. (Req 1.6)
  //
  // We start from the incoming headers but strip any client-supplied internal
  // headers first, then set the values the resolver actually derived — this
  // prevents a client from spoofing tenant context that downstream code trusts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-tenant-id");
  requestHeaders.delete("x-user-id");
  requestHeaders.delete("x-user-role");
  requestHeaders.delete("x-is-super-admin");

  requestHeaders.set("x-tenant-id", store.tenantId);
  if (store.userId) requestHeaders.set("x-user-id", store.userId);
  if (store.role) requestHeaders.set("x-user-role", store.role);
  if (store.isSuperAdmin) requestHeaders.set("x-is-super-admin", "true");

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Expose only rate limit info on the response for observability. Internal
  // tenant context is intentionally NOT set on the response (no client leak).
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
