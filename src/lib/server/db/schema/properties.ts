import { relations } from "drizzle-orm";
import { integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { tenantSaas } from "./tenants";

export const property = pgTable("property", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenantSaas.id),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  timezone: varchar("timezone", { length: 50 }).default("Asia/Jakarta"),
  totalRooms: integer("total_rooms").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const propertyRelations = relations(property, ({ one }) => ({
  tenant: one(tenantSaas, {
    fields: [property.tenantId],
    references: [tenantSaas.id],
  }),
}));
