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
import { contract } from "./contracts";
import { tenantSaas } from "./tenants";

export const invoice = pgTable(
  "invoice",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantSaas.id),
    contractId: uuid("contract_id")
      .notNull()
      .references(() => contract.id),
    invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
    paymentLinkToken: varchar("payment_link_token", { length: 100 }).notNull().unique(),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    dueDate: date("due_date").notNull(),
    total: decimal("total", { precision: 12, scale: 2 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_invoice_tenant_status").on(table.tenantId, table.status),
    index("idx_invoice_tenant_due").on(table.tenantId, table.dueDate),
    index("idx_invoice_payment_token").on(table.paymentLinkToken),
  ],
);

export const invoiceLine = pgTable("invoice_line", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenantSaas.id),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoice.id),
  description: varchar("description", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  componentType: varchar("component_type", { length: 50 }),
});

export const invoiceRelations = relations(invoice, ({ one, many }) => ({
  tenant: one(tenantSaas, {
    fields: [invoice.tenantId],
    references: [tenantSaas.id],
  }),
  contract: one(contract, {
    fields: [invoice.contractId],
    references: [contract.id],
  }),
  lines: many(invoiceLine),
}));

export const invoiceLineRelations = relations(invoiceLine, ({ one }) => ({
  tenant: one(tenantSaas, {
    fields: [invoiceLine.tenantId],
    references: [tenantSaas.id],
  }),
  invoice: one(invoice, {
    fields: [invoiceLine.invoiceId],
    references: [invoice.id],
  }),
}));
