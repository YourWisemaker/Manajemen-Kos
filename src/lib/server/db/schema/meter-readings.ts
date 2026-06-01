import { relations } from "drizzle-orm";
import { date, decimal, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { room } from "./rooms";
import { tenantSaas } from "./tenants";

export const meterReading = pgTable("meter_reading", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenantSaas.id),
  roomId: uuid("room_id")
    .notNull()
    .references(() => room.id),
  readingDate: date("reading_date").notNull(),
  electricityValue: decimal("electricity_value", {
    precision: 10,
    scale: 2,
  }),
  waterValue: decimal("water_value", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const meterReadingRelations = relations(meterReading, ({ one }) => ({
  tenant: one(tenantSaas, {
    fields: [meterReading.tenantId],
    references: [tenantSaas.id],
  }),
  room: one(room, {
    fields: [meterReading.roomId],
    references: [room.id],
  }),
}));
