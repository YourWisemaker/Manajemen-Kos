import { and, count, eq, lte, sql } from "drizzle-orm";

import { getDb } from "@/lib/server/db";
import { room, subscription, tenantSaas } from "@/lib/server/db/schema";
import { notificationService } from "@/lib/server/notifications";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Plan = "starter" | "pro" | "enterprise";
export type SubStatus = "trialing" | "active" | "past_due" | "cancelled" | "suspended";

export interface PlanLimits {
  maxRooms: number;
  channels: string[];
  features: string[];
}

export interface CheckLimitsResult {
  withinLimits: boolean;
  currentRooms: number;
  maxRooms: number;
}

/**
 * Minimal notification service interface.
 * The real implementation is being built in parallel — we only define the
 * contract here so the subscription service can reference it without
 * importing a non-existent module.
 */
export interface INotificationService {
  send(payload: {
    type: string;
    tenantId: string;
    recipientEmail?: string;
    recipientPhone?: string;
    variables: Record<string, string>;
  }): Promise<void>;
}

// ---------------------------------------------------------------------------
// Plan configuration
// ---------------------------------------------------------------------------

const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  starter: {
    maxRooms: 15,
    channels: ["QRIS", "BCA_VA"],
    features: ["billing", "notifications"],
  },
  pro: {
    maxRooms: 60,
    channels: ["QRIS", "BCA_VA", "MANDIRI_VA", "BNI_VA", "GOPAY", "OVO", "DANA"],
    features: ["billing", "notifications", "reports", "meter_reading", "multi_property"],
  },
  enterprise: {
    maxRooms: Number.POSITIVE_INFINITY,
    channels: [
      "QRIS",
      "BCA_VA",
      "MANDIRI_VA",
      "BNI_VA",
      "GOPAY",
      "OVO",
      "DANA",
      "RETAIL",
    ],
    features: [
      "billing",
      "notifications",
      "reports",
      "meter_reading",
      "multi_property",
      "custom_domain",
      "api_access",
      "priority_support",
    ],
  },
};

const PLAN_PRICING: Record<Plan, number> = {
  starter: 99_000,
  pro: 249_000,
  enterprise: 599_000,
};

/** Trial duration in days. */
const TRIAL_DAYS = 14;

/** Days before trial expiry to send reminder (H-3). */
const TRIAL_REMINDER_DAYS = 3;

/** Grace period after trial/payment failure before suspension. */
const GRACE_PERIOD_DAYS = 7;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function _daysBetween(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((b.getTime() - a.getTime()) / msPerDay);
}

// ---------------------------------------------------------------------------
// SubscriptionService — Req 10.1–10.7
// ---------------------------------------------------------------------------

/**
 * Manages KosKita's SaaS subscription billing to tenant owners.
 * Handles plans, trials, upgrades, dunning, and suspension.
 */
export class SubscriptionService {
  private notificationService: INotificationService | null;

  constructor(notificationService?: INotificationService) {
    this.notificationService = notificationService ?? null;
  }

  // -------------------------------------------------------------------------
  // getPlanLimits
  // -------------------------------------------------------------------------

  /** Get the limits for a given plan. */
  getPlanLimits(plan: Plan): PlanLimits {
    return PLAN_LIMITS[plan];
  }

  // -------------------------------------------------------------------------
  // startTrial — Req 10.1
  // -------------------------------------------------------------------------

  /**
   * Start a 14-day free trial for a new tenant.
   * Creates a subscription record with status "trialing".
   */
  async startTrial(tenantId: string, plan: Plan): Promise<void> {
    const db = getDb();
    const now = new Date();
    const trialEnd = addDays(now, TRIAL_DAYS);

    await db.insert(subscription).values({
      tenantId,
      plan,
      amountMonthly: PLAN_PRICING[plan].toFixed(2),
      status: "trialing",
      currentPeriodStart: formatDateStr(now),
      currentPeriodEnd: formatDateStr(trialEnd),
    });

    // Update tenant record with trial end date
    await db
      .update(tenantSaas)
      .set({
        plan,
        status: "trial",
        trialEndsAt: trialEnd,
        updatedAt: now,
      })
      .where(eq(tenantSaas.id, tenantId));
  }

  // -------------------------------------------------------------------------
  // checkLimits — Req 10.5, 10.6
  // -------------------------------------------------------------------------

  /**
   * Verify room count against plan limits.
   * Returns whether the tenant is within limits and the current/max counts.
   */
  async checkLimits(tenantId: string): Promise<CheckLimitsResult> {
    const db = getDb();

    // Get tenant's current plan
    const [tenant] = await db
      .select({ plan: tenantSaas.plan })
      .from(tenantSaas)
      .where(eq(tenantSaas.id, tenantId));

    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    const plan = tenant.plan as Plan;
    const limits = PLAN_LIMITS[plan];

    // Count rooms for this tenant
    const [result] = await db
      .select({ total: count() })
      .from(room)
      .where(eq(room.tenantId, tenantId));

    const currentRooms = result?.total ?? 0;

    return {
      withinLimits: currentRooms < limits.maxRooms,
      currentRooms,
      maxRooms: limits.maxRooms,
    };
  }

  // -------------------------------------------------------------------------
  // changePlan — Req 10.7
  // -------------------------------------------------------------------------

  /**
   * Upgrade or downgrade a tenant's plan.
   * Validates that the tenant's current room count fits within the new plan limits.
   */
  async changePlan(tenantId: string, newPlan: Plan): Promise<void> {
    const db = getDb();

    // Count current rooms
    const [roomCount] = await db
      .select({ total: count() })
      .from(room)
      .where(eq(room.tenantId, tenantId));

    const currentRooms = roomCount?.total ?? 0;
    const newLimits = PLAN_LIMITS[newPlan];

    if (currentRooms > newLimits.maxRooms) {
      throw new Error(
        `Cannot downgrade to ${newPlan}: current room count (${currentRooms}) exceeds plan limit (${newLimits.maxRooms}). ` +
          `Please remove rooms before downgrading.`,
      );
    }

    const now = new Date();

    // Update subscription record
    await db
      .update(subscription)
      .set({
        plan: newPlan,
        amountMonthly: PLAN_PRICING[newPlan].toFixed(2),
        updatedAt: now,
      })
      .where(eq(subscription.tenantId, tenantId));

    // Update tenant record
    await db
      .update(tenantSaas)
      .set({
        plan: newPlan,
        updatedAt: now,
      })
      .where(eq(tenantSaas.id, tenantId));
  }

  // -------------------------------------------------------------------------
  // suspendTenant — Req 10.4
  // -------------------------------------------------------------------------

  /**
   * Suspend a tenant workspace.
   * Sets status to "suspended" — workspace becomes read-only, payment pages disabled.
   */
  async suspendTenant(tenantId: string, reason: string): Promise<void> {
    const db = getDb();
    const now = new Date();

    // Update subscription status
    await db
      .update(subscription)
      .set({
        status: "suspended",
        updatedAt: now,
      })
      .where(eq(subscription.tenantId, tenantId));

    // Update tenant status
    await db
      .update(tenantSaas)
      .set({
        status: "suspended",
        updatedAt: now,
      })
      .where(eq(tenantSaas.id, tenantId));

    // Send suspension notification (fire-and-forget)
    if (this.notificationService) {
      const [tenant] = await db
        .select({ email: tenantSaas.ownerEmail, name: tenantSaas.name })
        .from(tenantSaas)
        .where(eq(tenantSaas.id, tenantId));

      if (tenant) {
        this.notificationService
          .send({
            type: "subscription_suspended",
            tenantId,
            recipientEmail: tenant.email,
            variables: {
              nama: tenant.name,
              alasan: reason,
            },
          })
          .catch(() => {
            // Fire-and-forget — log but don't block
          });
      }
    }
  }

  // -------------------------------------------------------------------------
  // reactivateTenant — Req 10.7
  // -------------------------------------------------------------------------

  /**
   * Reactivate a suspended tenant after payment.
   * Restores workspace to "active" status.
   */
  async reactivateTenant(tenantId: string): Promise<void> {
    const db = getDb();
    const now = new Date();
    const periodEnd = addDays(now, 30);

    // Update subscription to active with new period
    await db
      .update(subscription)
      .set({
        status: "active",
        currentPeriodStart: formatDateStr(now),
        currentPeriodEnd: formatDateStr(periodEnd),
        updatedAt: now,
      })
      .where(eq(subscription.tenantId, tenantId));

    // Update tenant status
    await db
      .update(tenantSaas)
      .set({
        status: "active",
        updatedAt: now,
      })
      .where(eq(tenantSaas.id, tenantId));
  }

  // -------------------------------------------------------------------------
  // processDunning — Req 10.2, 10.3, 10.4
  // -------------------------------------------------------------------------

  /**
   * Process dunning for all tenants:
   * 1. Check trial expiry — send H-3 reminders
   * 2. Enforce grace period after trial expiry
   * 3. Suspend tenants that exceed grace period
   */
  async processDunning(): Promise<{
    reminders: number;
    suspended: number;
    errors: { tenantId: string; error: string }[];
  }> {
    const db = getDb();
    const now = new Date();
    const _today = formatDateStr(now);

    const result = {
      reminders: 0,
      suspended: 0,
      errors: [] as { tenantId: string; error: string }[],
    };

    // -----------------------------------------------------------------------
    // 1. Send H-3 trial expiry reminders — Req 10.2
    // -----------------------------------------------------------------------
    const reminderDate = addDays(now, TRIAL_REMINDER_DAYS);
    const reminderDateStr = formatDateStr(reminderDate);

    const trialingTenants = await db
      .select({
        id: tenantSaas.id,
        name: tenantSaas.name,
        email: tenantSaas.ownerEmail,
        trialEndsAt: tenantSaas.trialEndsAt,
      })
      .from(tenantSaas)
      .where(
        and(
          eq(tenantSaas.status, "trial"),
          sql`DATE(${tenantSaas.trialEndsAt}) = ${reminderDateStr}`,
        ),
      );

    for (const tenant of trialingTenants) {
      try {
        if (this.notificationService) {
          await this.notificationService.send({
            type: "trial_ending",
            tenantId: tenant.id,
            recipientEmail: tenant.email,
            variables: {
              nama: tenant.name,
              tanggal_berakhir: tenant.trialEndsAt
                ? formatDateStr(new Date(tenant.trialEndsAt))
                : reminderDateStr,
            },
          });
        }
        result.reminders++;
      } catch (err) {
        result.errors.push({
          tenantId: tenant.id,
          error: err instanceof Error ? err.message : "Failed to send reminder",
        });
      }
    }

    // -----------------------------------------------------------------------
    // 2. Move expired trials to past_due (grace period) — Req 10.3
    // -----------------------------------------------------------------------
    const expiredTrials = await db
      .select({ id: tenantSaas.id })
      .from(tenantSaas)
      .where(and(eq(tenantSaas.status, "trial"), lte(tenantSaas.trialEndsAt, now)));

    for (const tenant of expiredTrials) {
      try {
        await db
          .update(subscription)
          .set({
            status: "past_due",
            updatedAt: now,
          })
          .where(eq(subscription.tenantId, tenant.id));

        await db
          .update(tenantSaas)
          .set({
            status: "past_due",
            updatedAt: now,
          })
          .where(eq(tenantSaas.id, tenant.id));
      } catch (err) {
        result.errors.push({
          tenantId: tenant.id,
          error: err instanceof Error ? err.message : "Failed to transition to past_due",
        });
      }
    }

    // -----------------------------------------------------------------------
    // 3. Suspend tenants past grace period — Req 10.4
    // -----------------------------------------------------------------------
    const graceCutoff = addDays(now, -GRACE_PERIOD_DAYS);

    const pastDueTenants = await db
      .select({
        id: tenantSaas.id,
        periodEnd: subscription.currentPeriodEnd,
      })
      .from(tenantSaas)
      .innerJoin(subscription, eq(subscription.tenantId, tenantSaas.id))
      .where(
        and(
          eq(tenantSaas.status, "past_due"),
          lte(subscription.currentPeriodEnd, formatDateStr(graceCutoff)),
        ),
      );

    for (const tenant of pastDueTenants) {
      try {
        await this.suspendTenant(
          tenant.id,
          "Subscription payment overdue — grace period exceeded",
        );
        result.suspended++;
      } catch (err) {
        result.errors.push({
          tenantId: tenant.id,
          error: err instanceof Error ? err.message : "Failed to suspend",
        });
      }
    }

    return result;
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const subscriptionService = new SubscriptionService(notificationService);
