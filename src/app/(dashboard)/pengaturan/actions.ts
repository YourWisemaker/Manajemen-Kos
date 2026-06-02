"use server";

/**
 * Settings (Pengaturan) Server Actions — Task 17.1
 *
 * Get and update tenant settings. Delegates reads to RealDataSource
 * and writes to direct Drizzle queries.
 *
 * Requirements: 5.1, 4.1
 */

import { eq } from "drizzle-orm";

import type { TenantSettings } from "@/lib/data";
import { withAuth } from "@/lib/server/auth/rbac";
import { RealDataSource } from "@/lib/server/datasource";
import { withTenantDb } from "@/lib/server/db";
import { tenantSaas } from "@/lib/server/db/schema";
import { requireTenantId } from "@/lib/server/tenant";

const dataSource = new RealDataSource();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UpdateTenantSettingsInput {
  name?: string;
  logoUrl?: string;
  brandColor?: string;
  waTemplates?: {
    invoiceIssued?: string;
    paymentSuccess?: string;
    reminder?: string;
  };
}

// ---------------------------------------------------------------------------
// getTenantSettings — Req 5.1
// ---------------------------------------------------------------------------

/** Fetch the current tenant's settings and branding. */
export const getTenantSettings = withAuth(
  async (): Promise<TenantSettings> => {
    const tenantId = requireTenantId();
    return dataSource.getTenantSettings(tenantId);
  },
  { requiredPermission: "settings:write" },
);

// ---------------------------------------------------------------------------
// updateTenantSettings — Req 4.1
// ---------------------------------------------------------------------------

/** Update tenant settings (name, branding, WA templates). */
export const updateTenantSettings = withAuth(
  async (data: UpdateTenantSettingsInput): Promise<void> => {
    const tenantId = requireTenantId();

    await withTenantDb(tenantId, async (db) => {
      // Fetch current settings to merge
      const [current] = await db
        .select({ settings: tenantSaas.settings })
        .from(tenantSaas)
        .where(eq(tenantSaas.id, tenantId));

      const existingSettings = (current?.settings ?? {}) as Record<string, unknown>;

      // Build updated settings object
      const updatedSettings = { ...existingSettings };
      if (data.brandColor !== undefined) {
        updatedSettings.brandColor = data.brandColor;
      }
      if (data.waTemplates !== undefined) {
        const existingTemplates = (existingSettings.waTemplates ?? {}) as Record<
          string,
          string
        >;
        updatedSettings.waTemplates = { ...existingTemplates, ...data.waTemplates };
      }

      // Build the update payload
      const updatePayload: Record<string, unknown> = {
        settings: updatedSettings,
        updatedAt: new Date(),
      };
      if (data.name !== undefined) {
        updatePayload.name = data.name;
      }
      if (data.logoUrl !== undefined) {
        updatePayload.logoUrl = data.logoUrl;
      }

      await db.update(tenantSaas).set(updatePayload).where(eq(tenantSaas.id, tenantId));
    });
  },
  { requiredPermission: "settings:write" },
);
