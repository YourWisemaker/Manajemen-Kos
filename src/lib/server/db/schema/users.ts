import { relations } from "drizzle-orm";
import { boolean, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { tenantSaas } from "./tenants";

export const userAccount = pgTable("user_account", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenantSaas.id),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: text("password_hash"),
  role: varchar("role", { length: 20 }).notNull().default("staff"),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  mfaEnabled: boolean("mfa_enabled").default(false),
  mfaSecret: text("mfa_secret"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userAccountRelations = relations(userAccount, ({ one }) => ({
  tenant: one(tenantSaas, {
    fields: [userAccount.tenantId],
    references: [tenantSaas.id],
  }),
}));
