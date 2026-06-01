import { relations } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { tenantSaas } from "./tenants";

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantSaas.id),
    actorId: uuid("actor_id"),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: varchar("entity_id", { length: 100 }),
    before: jsonb("before"),
    after: jsonb("after"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_audit_tenant_created").on(table.tenantId, table.createdAt)],
);

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  tenant: one(tenantSaas, {
    fields: [auditLog.tenantId],
    references: [tenantSaas.id],
  }),
}));
