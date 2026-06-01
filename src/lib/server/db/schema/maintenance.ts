import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { kosTenant } from "./residents";
import { room } from "./rooms";
import { tenantSaas } from "./tenants";

export const maintenanceRequest = pgTable(
  "maintenance_request",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantSaas.id),
    roomId: uuid("room_id")
      .notNull()
      .references(() => room.id),
    kosTenantId: uuid("kos_tenant_id").references(() => kosTenant.id),
    description: text("description").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("open"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_maintenance_tenant_status").on(table.tenantId, table.status),
  ],
);

export const maintenanceRequestRelations = relations(maintenanceRequest, ({ one }) => ({
  tenant: one(tenantSaas, {
    fields: [maintenanceRequest.tenantId],
    references: [tenantSaas.id],
  }),
  room: one(room, {
    fields: [maintenanceRequest.roomId],
    references: [room.id],
  }),
  kosTenant: one(kosTenant, {
    fields: [maintenanceRequest.kosTenantId],
    references: [kosTenant.id],
  }),
}));
