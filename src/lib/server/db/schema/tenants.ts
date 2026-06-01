import { jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const tenantSaas = pgTable("tenant_saas", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  subdomain: varchar("subdomain", { length: 100 }).unique(),
  customDomain: varchar("custom_domain", { length: 255 }),
  plan: varchar("plan", { length: 20 }).notNull().default("starter"),
  status: varchar("status", { length: 20 }).notNull().default("trial"),
  ownerEmail: varchar("owner_email", { length: 255 }).notNull(),
  ownerPhone: varchar("owner_phone", { length: 20 }),
  logoUrl: text("logo_url"),
  settings: jsonb("settings").default({}),
  trialEndsAt: timestamp("trial_ends_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
