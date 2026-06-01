import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/server/db/schema",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
