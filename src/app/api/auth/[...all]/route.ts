import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/server/auth";

/**
 * Better Auth catch-all API route — Task 4.3
 *
 * Handles all authentication endpoints:
 * - POST /api/auth/sign-up/email
 * - POST /api/auth/sign-in/email
 * - POST /api/auth/sign-in/social
 * - POST /api/auth/magic-link/send
 * - GET  /api/auth/session
 * - POST /api/auth/sign-out
 * - etc.
 */
export const { GET, POST } = toNextJsHandler(auth);
