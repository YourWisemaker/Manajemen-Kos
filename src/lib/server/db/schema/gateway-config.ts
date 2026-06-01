import { relations } from "drizzle-orm";
import {
  boolean,
  decimal,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { tenantSaas } from "./tenants";

export const gatewayConfig = pgTable(
  "gateway_config",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantSaas.id),
    provider: varchar("provider", { length: 20 }).notNull(),
    apiKeyEncrypted: text("api_key_encrypted").notNull(),
    webhookTokenEncrypted: text("webhook_token_encrypted").notNull(),
    callbackToken: varchar("callback_token", { length: 100 }).notNull().unique(),
    settlementAccount: varchar("settlement_account", { length: 100 }),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_gateway_callback_token").on(table.callbackToken)],
);

export const paymentChannel = pgTable("payment_channel", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenantSaas.id),
  gatewayConfigId: uuid("gateway_config_id")
    .notNull()
    .references(() => gatewayConfig.id),
  channelType: varchar("channel_type", { length: 20 }).notNull(),
  channelCode: varchar("channel_code", { length: 50 }).notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  mdrPercent: decimal("mdr_percent", { precision: 5, scale: 2 }).default("0"),
  feeBearer: varchar("fee_bearer", { length: 20 }).default("owner"),
  isEnabled: boolean("is_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const gatewayConfigRelations = relations(gatewayConfig, ({ one, many }) => ({
  tenant: one(tenantSaas, {
    fields: [gatewayConfig.tenantId],
    references: [tenantSaas.id],
  }),
  channels: many(paymentChannel),
}));

export const paymentChannelRelations = relations(paymentChannel, ({ one }) => ({
  tenant: one(tenantSaas, {
    fields: [paymentChannel.tenantId],
    references: [tenantSaas.id],
  }),
  gatewayConfig: one(gatewayConfig, {
    fields: [paymentChannel.gatewayConfigId],
    references: [gatewayConfig.id],
  }),
}));
