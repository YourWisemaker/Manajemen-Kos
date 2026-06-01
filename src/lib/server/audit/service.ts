/**
 * Audit Log Service — Task 14.2
 *
 * Records all significant actions per tenant for compliance (UU PDP) and debugging.
 * Append-only: no updates or deletes permitted through the application layer.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
 */

import { and, count, desc, eq, gte, lte } from "drizzle-orm";

import { getDb } from "@/lib/server/db";
import { auditLog } from "@/lib/server/db/schema";
import { getTenantContext } from "@/lib/server/tenant";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuditEntry {
  tenantId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface AuditQueryFilters {
  tenantId: string;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  dateRange?: { from: Date; to: Date };
  limit?: number;
  offset?: number;
}

export interface AuditQueryResult {
  entries: AuditEntry[];
  total: number;
}

// ---------------------------------------------------------------------------
// AuditService — Req 12.1–12.6
// ---------------------------------------------------------------------------

export class AuditService {
  /**
   * Record an audit entry. Non-blocking, fire-and-forget — Req 12.4.
   * Automatically resolves tenantId and actorId from the current context.
   * Tags super admin impersonation entries — Req 12.5.
   */
  async log(entry: Omit<AuditEntry, "tenantId">): Promise<void> {
    // Fire-and-forget: schedule the write but don't await it in the caller
    void this.writeEntry(entry).catch((err) => {
      console.error(
        "[audit] Failed to write audit entry:",
        err instanceof Error ? err.message : err,
      );
    });
  }

  /**
   * Query audit log with filtering — Req 12.6.
   * Supports filtering by tenant, actor, entity type, entity ID, and date range.
   */
  async query(filters: AuditQueryFilters): Promise<AuditQueryResult> {
    const db = getDb();
    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;

    // Build conditions
    const conditions = [eq(auditLog.tenantId, filters.tenantId)];

    if (filters.actorId) {
      conditions.push(eq(auditLog.actorId, filters.actorId));
    }
    if (filters.entityType) {
      conditions.push(eq(auditLog.entityType, filters.entityType));
    }
    if (filters.entityId) {
      conditions.push(eq(auditLog.entityId, filters.entityId));
    }
    if (filters.dateRange?.from) {
      conditions.push(gte(auditLog.createdAt, filters.dateRange.from));
    }
    if (filters.dateRange?.to) {
      conditions.push(lte(auditLog.createdAt, filters.dateRange.to));
    }

    const whereClause = and(...conditions);

    // Get total count
    const [countResult] = await db
      .select({ total: count() })
      .from(auditLog)
      .where(whereClause);

    const total = countResult?.total ?? 0;

    // Get entries
    const rows = await db
      .select()
      .from(auditLog)
      .where(whereClause)
      .orderBy(desc(auditLog.createdAt))
      .limit(limit)
      .offset(offset);

    const entries: AuditEntry[] = rows.map((row) => ({
      tenantId: row.tenantId,
      actorId: row.actorId ?? "",
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId ?? "",
      before: (row.before as Record<string, unknown>) ?? undefined,
      after: (row.after as Record<string, unknown>) ?? undefined,
      metadata: (row.metadata as Record<string, unknown>) ?? undefined,
    }));

    return { entries, total };
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  /** Internal write — performs the actual DB insert. */
  private async writeEntry(entry: Omit<AuditEntry, "tenantId">): Promise<void> {
    const db = getDb();

    // Resolve tenant context (may not be available in all scenarios)
    let tenantId: string;
    let isSuperAdmin = false;

    try {
      const ctx = getTenantContext();
      tenantId = ctx.tenantId;
      isSuperAdmin = ctx.isSuperAdmin;
    } catch {
      // If no context (e.g. cron job), require tenantId in metadata
      tenantId = (entry.metadata?.tenantId as string) ?? "system";
    }

    // Tag super admin impersonation — Req 12.5
    const metadata = {
      ...entry.metadata,
      ...(isSuperAdmin ? { impersonation: true, superAdmin: true } : {}),
    };

    await db.insert(auditLog).values({
      tenantId,
      actorId: entry.actorId || null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId || null,
      before: entry.before ?? null,
      after: entry.after ?? null,
      metadata: Object.keys(metadata).length > 0 ? metadata : null,
    });
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const auditService = new AuditService();
