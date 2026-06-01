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
import { meterReading, room } from "@/lib/server/db/schema";
import { subscriptionService } from "@/lib/server/subscriptions/service";
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
      .where(and(eq(meterReading.roomId, roomId), eq(meterReading.tenantId, tenantId)))
      .orderBy(desc(meterReading.readingDate));

    return rows;
  },
  { requiredPermission: "room:write" },
);

// ---------------------------------------------------------------------------
// Room CRUD Actions
// ---------------------------------------------------------------------------

export interface CreateRoomInput {
  propertyId: string;
  number: string;
  type: string;
  monthlyPrice: number;
  facilities?: string[];
}

export interface UpdateRoomInput {
  number?: string;
  type?: string;
  monthlyPrice?: number;
  status?: string;
  facilities?: string[];
}

export interface RoomView {
  id: string;
  propertyId: string;
  number: string;
  type: string;
  monthlyPrice: string;
  status: string;
  facilities: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export const createRoom = withAuth(
  async (data: CreateRoomInput): Promise<{ id: string }> => {
    const tenantId = requireTenantId();
    const db = getDb();

    const limits = await subscriptionService.checkLimits(tenantId);
    if (!limits.withinLimits) {
      throw new Error(
        `Batas kamar tercapai (${limits.currentRooms}/${limits.maxRooms}). Upgrade paket Anda untuk menambah kamar.`,
      );
    }

    const [created] = await db
      .insert(room)
      .values({
        tenantId,
        propertyId: data.propertyId,
        number: data.number,
        type: data.type,
        monthlyPrice: data.monthlyPrice.toFixed(2),
        facilities: data.facilities ?? [],
      })
      .returning({ id: room.id });

    return { id: created.id };
  },
  { requiredPermission: "room:write" },
);

export const updateRoom = withAuth(
  async (roomId: string, data: UpdateRoomInput): Promise<void> => {
    const tenantId = requireTenantId();
    const db = getDb();

    const updatePayload: Record<string, unknown> = { updatedAt: new Date() };
    if (data.number !== undefined) updatePayload.number = data.number;
    if (data.type !== undefined) updatePayload.type = data.type;
    if (data.monthlyPrice !== undefined)
      updatePayload.monthlyPrice = data.monthlyPrice.toFixed(2);
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.facilities !== undefined) updatePayload.facilities = data.facilities;

    await db
      .update(room)
      .set(updatePayload)
      .where(and(eq(room.id, roomId), eq(room.tenantId, tenantId)));
  },
  { requiredPermission: "room:write" },
);

export const listRoomsByProperty = withAuth(
  async (propertyId: string): Promise<RoomView[]> => {
    const tenantId = requireTenantId();
    const db = getDb();

    const rows = await db
      .select()
      .from(room)
      .where(and(eq(room.propertyId, propertyId), eq(room.tenantId, tenantId)))
      .orderBy(room.number);

    return rows;
  },
  { requiredPermission: "property:write" },
);

export const getRoom = withAuth(
  async (roomId: string): Promise<RoomView | null> => {
    const tenantId = requireTenantId();
    const db = getDb();

    const [r] = await db
      .select()
      .from(room)
      .where(and(eq(room.id, roomId), eq(room.tenantId, tenantId)))
      .limit(1);

    return r ?? null;
  },
  { requiredPermission: "property:write" },
);
