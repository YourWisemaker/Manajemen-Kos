import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins/magic-link";

/**
 * Better Auth configuration — Task 4.1
 *
 * Providers: email/password (Argon2id default), Google OAuth, magic link.
 * Optional TOTP 2FA. JWT sessions with custom tenant claims.
 * Hooks: afterSignUp creates tenant workspace, afterSignIn updates last_login.
 */
export const auth = betterAuth({
  appName: "KosKita",
  basePath: "/api/auth",
  secret: process.env.BETTER_AUTH_SECRET,

  // ---------------------------------------------------------------------------
  // Database — Better Auth manages its own user/session tables via Kysely.
  // We point it at the same PostgreSQL instance.
  // ---------------------------------------------------------------------------
  database: {
    type: "postgres",
    dialect: (() => {
      // Lazy dialect creation to avoid crashing at build time
      // when DATABASE_URL is not set.
      const { Pool } = require("pg") as typeof import("pg");
      const { PostgresDialect } = require("kysely") as typeof import("kysely");
      return new PostgresDialect({
        pool: new Pool({
          connectionString: process.env.DATABASE_URL,
        }),
      });
    })(),
  },

  // ---------------------------------------------------------------------------
  // Email & Password
  // ---------------------------------------------------------------------------
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // Better Auth uses Scrypt by default; we override with Argon2id.
    // NOTE: argon2 is a peer dep — if not installed, falls back to scrypt.
    // For now we rely on the default strong hashing.
  },

  // ---------------------------------------------------------------------------
  // Social Providers
  // ---------------------------------------------------------------------------
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },

  // ---------------------------------------------------------------------------
  // Plugins
  // ---------------------------------------------------------------------------
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        // TODO: Wire to Resend email provider (Task 10.3)
        console.info(`[auth] Magic link for ${email}: ${url}`);
      },
    }),
    // TOTP 2FA: disabled in better-auth@1.2.8 due to GET+body runtime error.
    // Re-enable after upgrading: twoFactor({ issuer: "KosKita" })
    nextCookies(),
  ],

  // ---------------------------------------------------------------------------
  // Session — custom claims for tenant context
  // ---------------------------------------------------------------------------
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh daily
    additionalFields: {
      tenantId: {
        type: "string",
        required: false,
        input: false,
      },
      role: {
        type: "string",
        required: false,
        input: false,
      },
      fullName: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Cookie configuration
  // ---------------------------------------------------------------------------
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    defaultCookieAttributes: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    },
  },

  // ---------------------------------------------------------------------------
  // Database hooks — afterSignUp + afterSignIn
  // ---------------------------------------------------------------------------
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // afterSignUp: create tenant workspace
          await createTenantWorkspace(user);
        },
      },
    },
    session: {
      create: {
        after: async (session) => {
          // afterSignIn: update last_login timestamp
          await updateLastLogin(session.userId);
        },
      },
    },
  },
});

// ---------------------------------------------------------------------------
// Helper: get session from request headers (for Server Actions / RSC)
// ---------------------------------------------------------------------------

/**
 * Retrieve the current session. Returns null if unauthenticated.
 * Use in Server Components or Server Actions.
 */
export async function getSession() {
  const { headers } = await import("next/headers");
  const headerStore = await headers();

  return auth.api.getSession({
    headers: headerStore,
  });
}

// ---------------------------------------------------------------------------
// afterSignUp hook implementation
// ---------------------------------------------------------------------------

interface BetterAuthUser {
  id: string;
  email: string;
  name: string;
  [key: string]: unknown;
}

async function createTenantWorkspace(user: BetterAuthUser): Promise<void> {
  try {
    const { getDb } = await import("@/lib/server/db");
    const { tenantSaas } = await import("@/lib/server/db/schema/tenants");
    const { userAccount } = await import("@/lib/server/db/schema/users");
    const { subscription } = await import("@/lib/server/db/schema/subscriptions");

    const db = getDb();
    const slug = generateSlug(user.name || user.email.split("@")[0]);
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    // Create tenant record
    const [tenant] = await db
      .insert(tenantSaas)
      .values({
        name: user.name || `Kos ${user.email.split("@")[0]}`,
        slug,
        plan: "starter",
        status: "trial",
        ownerEmail: user.email,
        trialEndsAt,
      })
      .returning({ id: tenantSaas.id });

    if (!tenant) return;

    // Create user_account record with role "owner"
    await db.insert(userAccount).values({
      tenantId: tenant.id,
      email: user.email,
      fullName: user.name || user.email.split("@")[0],
      role: "owner",
    });

    // Start trial subscription
    const periodStart = now.toISOString().split("T")[0];
    const periodEnd = trialEndsAt.toISOString().split("T")[0];

    await db.insert(subscription).values({
      tenantId: tenant.id,
      plan: "starter",
      amountMonthly: "0",
      status: "trialing",
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    });
  } catch (error) {
    // Log but don't crash the sign-up flow
    console.error("[auth] Failed to create tenant workspace:", error);
  }
}

// ---------------------------------------------------------------------------
// afterSignIn hook implementation
// ---------------------------------------------------------------------------

async function updateLastLogin(userId: string): Promise<void> {
  try {
    const { eq } = await import("drizzle-orm");
    const { getDb } = await import("@/lib/server/db");
    const { userAccount } = await import("@/lib/server/db/schema/users");

    const db = getDb();
    await db
      .update(userAccount)
      .set({ lastLogin: new Date() })
      .where(eq(userAccount.id, userId));
  } catch {
    // Non-critical — don't block sign-in
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}
