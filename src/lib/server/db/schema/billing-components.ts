import { relations } from "drizzle-orm";
import { decimal, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { property } from "./properties";
import { tenantSaas } from "./tenants";

export const billingComponent = pgTable("billing_component", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenantSaas.id),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => property.id),
  name: varchar("name", { length: 100 }).notNull(),
  calcMethod: varchar("calc_method", { length: 20 }).notNull(),
  defaultValue: decimal("default_value", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const billingComponentRelations = relations(billingComponent, ({ one }) => ({
  tenant: one(tenantSaas, {
    fields: [billingComponent.tenantId],
    references: [tenantSaas.id],
  }),
  property: one(property, {
    fields: [billingComponent.propertyId],
    references: [property.id],
  }),
}));
