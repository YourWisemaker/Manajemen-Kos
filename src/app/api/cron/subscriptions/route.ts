import { NextResponse } from "next/server";

import { subscriptionService } from "@/lib/server/subscriptions/service";

/**
 * POST /api/cron/subscriptions
 *
 * Daily dunning cron endpoint — processes trial expiry reminders,
 * grace period enforcement, and tenant suspension.
 * Protected by CRON_SECRET in the authorization header.
 *
 * Req 10.2, 10.3, 10.4
 */
export async function POST(request: Request): Promise<NextResponse> {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await subscriptionService.processDunning();

    return NextResponse.json({
      success: true,
      dunning: {
        reminders: result.reminders,
        suspended: result.suspended,
        errors: result.errors.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
