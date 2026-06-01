import { relations } from "drizzle-orm";
import {
  decimal,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { paymentChannel } from "./gateway-config";
import { invoice } from "./invoices";
import { tenantSaas } from "./tenants";

export const payment = pgTable(
  "payment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantSaas.id),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoice.id),
    channelId: uuid("channel_id").references(() => paymentChannel.id),
    paymentReference: varchar("payment_reference", { length: 255 }).notNull().unique(),
    externalPaymentId: varchar("external_payment_id", { length: 255 }),
    channelCode: varchar("channel_code", { length: 50 }).notNull(),
    method: varchar("method", { length: 20 }).notNull(),
    amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).notNull(),
    adminFee: decimal("admin_fee", { precision: 12, scale: 2 }).default("0"),
    paidAt: timestamp("paid_at"),
    expiresAt: timestamp("expires_at"),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    proofImageKey: text("proof_image_key"),
    rawWebhook: jsonb("raw_webhook"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_payment_tenant_status").on(table.tenantId, table.status),
    index("idx_payment_reference").on(table.paymentReference),
  ],
);

export const paymentRelations = relations(payment, ({ one }) => ({
  tenant: one(tenantSaas, {
    fields: [payment.tenantId],
    references: [tenantSaas.id],
  }),
  invoice: one(invoice, {
    fields: [payment.invoiceId],
    references: [invoice.id],
  }),
  channel: one(paymentChannel, {
    fields: [payment.channelId],
    references: [paymentChannel.id],
  }),
}));
