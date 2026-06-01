import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { tenantSaas } from "./tenants";

export const kosTenant = pgTable("kos_tenant", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenantSaas.id),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  ktpNumber: varchar("ktp_number", { length: 16 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }),
  emergencyContact: text("emergency_contact"),
  ktpImageKey: text("ktp_image_key"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const kosTenantRelations = relations(kosTenant, ({ one }) => ({
  tenant: one(tenantSaas, {
    fields: [kosTenant.tenantId],
    references: [tenantSaas.id],
  }),
}));
