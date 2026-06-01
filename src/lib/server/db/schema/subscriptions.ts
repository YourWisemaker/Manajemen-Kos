import { relations } from "drizzle-orm";
import { date, decimal, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { tenantSaas } from "./tenants";

export const subscription = pgTable("subscription", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenantSaas.id),
  plan: varchar("plan", { length: 20 }).notNull(),
  amountMonthly: decimal("amount_monthly", {
    precision: 12,
    scale: 2,
  }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("trialing"),
  currentPeriodStart: date("current_period_start").notNull(),
  currentPeriodEnd: date("current_period_end").notNull(),
  externalSubId: varchar("external_sub_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subscriptionRelations = relations(subscription, ({ one }) => ({
  tenant: one(tenantSaas, {
    fields: [subscription.tenantId],
    references: [tenantSaas.id],
  }),
}));
