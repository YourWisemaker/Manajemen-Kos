/**
 * Observability — Sentry placeholder (Task 16.1)
 *
 * Captures exceptions with tenant context. In development, logs to console.
 * Replace with real @sentry/nextjs integration when deploying to production.
 *
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CaptureContext {
  tenantId?: string;
  userId?: string;
  action?: string;
  extra?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Sensitive data patterns to scrub — Req 15.4
// ---------------------------------------------------------------------------

const SENSITIVE_KEYS = [
  "password",
  "passwordHash",
  "apiKey",
  "secretKey",
  "mfaSecret",
  "ktpNumber",
  "webhook_token",
  "accessKeyId",
  "secretAccessKey",
];

/** Remove sensitive fields from context before logging/sending. */
function scrubSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
  const scrubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      scrubbed[key] = "[REDACTED]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      scrubbed[key] = scrubSensitiveData(value as Record<string, unknown>);
    } else {
      scrubbed[key] = value;
    }
  }
  return scrubbed;
}

// ---------------------------------------------------------------------------
// captureException — Req 15.1, 15.2
// ---------------------------------------------------------------------------

/**
 * Capture an exception with tenant context.
 * In dev: logs to console. In production: would forward to Sentry.
 */
export function captureException(error: unknown, context?: CaptureContext): void {
  const safeContext = context?.extra
    ? { ...context, extra: scrubSensitiveData(context.extra) }
    : context;

  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  // In development, log to console with structured context
  if (process.env.NODE_ENV !== "production") {
    console.error("[sentry:dev]", {
      message,
      stack: stack?.split("\n").slice(0, 5).join("\n"),
      tenantId: safeContext?.tenantId,
      userId: safeContext?.userId,
      action: safeContext?.action,
      extra: safeContext?.extra,
    });
    return;
  }

  // Production: forward to Sentry SDK (when configured)
  // TODO: Replace with real Sentry integration:
  // import * as Sentry from "@sentry/nextjs";
  // Sentry.captureException(error, { tags: { tenantId }, extra: safeContext });
  console.error("[sentry:prod]", { message, ...safeContext });
}

// ---------------------------------------------------------------------------
// captureMessage — for non-error alerts (e.g. RLS violations) — Req 15.3
// ---------------------------------------------------------------------------

/**
 * Capture a message/alert (e.g. RLS violation detection).
 */
export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" | "fatal" = "warning",
  context?: CaptureContext,
): void {
  const safeContext = context?.extra
    ? { ...context, extra: scrubSensitiveData(context.extra) }
    : context;

  if (process.env.NODE_ENV !== "production") {
    console.warn(`[sentry:dev][${level}]`, message, safeContext);
    return;
  }

  // Production: Sentry.captureMessage(message, { level, tags, extra })
  console.warn(`[sentry:prod][${level}]`, message, safeContext);
}
