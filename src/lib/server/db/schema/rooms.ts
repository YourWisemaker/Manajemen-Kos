import { relations } from "drizzle-orm";
import {
  decimal,
  index,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { property } from "./properties";
import { tenantSaas } from "./tenants";

export const room = pgTable(
  "room",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => property.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantSaas.id),
    number: varchar("number", { length: 50 }).notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    monthlyPrice: decimal("monthly_price", {
      precision: 12,
      scale: 2,
    }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("available"),
    facilities: jsonb("facilities").default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_room_tenant_property").on(table.tenantId, table.propertyId),
    index("idx_room_tenant_status").on(table.tenantId, table.status),
  ],
);

export const roomRelations = relations(room, ({ one }) => ({
  property: one(property, {
    fields: [room.propertyId],
    references: [property.id],
  }),
  tenant: one(tenantSaas, {
    fields: [room.tenantId],
    references: [tenantSaas.id],
  }),
}));
