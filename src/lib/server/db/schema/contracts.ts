import { relations } from "drizzle-orm";
import {
  date,
  decimal,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { kosTenant } from "./residents";
import { room } from "./rooms";
import { tenantSaas } from "./tenants";

export const contract = pgTable(
  "contract",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantSaas.id),
    roomId: uuid("room_id")
      .notNull()
      .references(() => room.id),
    kosTenantId: uuid("kos_tenant_id")
      .notNull()
      .references(() => kosTenant.id),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    depositAmount: decimal("deposit_amount", {
      precision: 12,
      scale: 2,
    }).notNull(),
    monthlyPrice: decimal("monthly_price", {
      precision: 12,
      scale: 2,
    }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_contract_tenant_status").on(table.tenantId, table.status)],
);

export const contractRelations = relations(contract, ({ one }) => ({
  tenant: one(tenantSaas, {
    fields: [contract.tenantId],
    references: [tenantSaas.id],
  }),
  room: one(room, {
    fields: [contract.roomId],
    references: [room.id],
  }),
  kosTenant: one(kosTenant, {
    fields: [contract.kosTenantId],
    references: [kosTenant.id],
  }),
}));
