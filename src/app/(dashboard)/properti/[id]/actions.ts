"use server";

/**
 * Meter Reading Server Actions — Task 12.3
 *
 * Record and query electricity/water meter readings per room.
 * Readings are used by the billing engine for meter-based billing components.
 *
 * Requirements: 17.1, 17.4
 */

import { and, desc, eq } from "drizzle-orm";

import { withAuth } from "@/lib/server/auth/rbac";
import { getDb } from "@/lib/server/db";
import { meterReading } from "@/lib/server/db/schema";
import { requireTenantId } from "@/lib/server/tenant";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecordMeterReadingInput {
  roomId: string;
  readingDate: string;
  electricityValue?: number;
  waterValue?: number;
}

export interface MeterReadingView {
  id: string;
  roomId: string;
  readingDate: string;
  electricityValue: string | null;
  waterValue: string | null;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// recordMeterReading — Req 17.1
// ---------------------------------------------------------------------------

/**
 * Record a meter reading for a room.
 * At least one of electricityValue or waterValue must be provided.
 */
export const recordMeterReading = withAuth(
  async (data: RecordMeterReadingInput): Promise<{ id: string }> => {
    const tenantId = requireTenantId();
    const db = getDb();

    if (data.electricityValue == null && data.waterValue == null) {
      throw new Error(
        "At least one meter value (electricityValue or waterValue) must be provided.",
      );
    }

    const [created] = await db
      .insert(meterReading)
      .values({
        tenantId,
        roomId: data.roomId,
        readingDate: data.readingDate,
        electricityValue:
          data.electricityValue != null ? data.electricityValue.toFixed(2) : null,
        waterValue: data.waterValue != null ? data.waterValue.toFixed(2) : null,
      })
      .returning({ id: meterReading.id });

    return { id: created.id };
  },
  { requiredPermission: "room:write" },
);

// ---------------------------------------------------------------------------
// listMeterReadings — Req 17.4
// ---------------------------------------------------------------------------

/**
 * List meter reading history for a specific room, ordered by most recent first.
 */
export const listMeterReadings = withAuth(
  async (roomId: string): Promise<MeterReadingView[]> => {
    const tenantId = requireTenantId();
    const db = getDb();

    const rows = await db
      .select({
        id: meterReading.id,
        roomId: meterReading.roomId,
        readingDate: meterReading.readingDate,
        electricityValue: meterReading.electricityValue,
        waterValue: meterReading.waterValue,
        createdAt: meterReading.createdAt,
      })
      .from(meterReading)
      .where(
        and(eq(meterReading.roomId, roomId), eq(meterReading.tenantId, tenantId)),
      )
      .orderBy(desc(meterReading.readingDate));

    return rows;
  },
  { requiredPermission: "room:write" },
);
