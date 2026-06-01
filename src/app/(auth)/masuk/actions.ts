"use server";

import { auth } from "@/lib/server/auth";

/**
 * Login Server Action — Task 4.3
 *
 * Calls Better Auth's signIn endpoint for email/password authentication.
 * Will be wired to the login form in Task 17.1.
 */

interface LoginInput {
  email: string;
  password: string;
}

interface LoginResult {
  success: boolean;
  error?: string;
}

export async function login(input: LoginInput): Promise<LoginResult> {
  try {
    const response = await auth.api.signInEmail({
      body: {
        email: input.email,
        password: input.password,
      },
    });

    if (!response) {
      return { success: false, error: "Login gagal. Periksa email dan kata sandi." };
    }

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan saat login.";
    return { success: false, error: message };
  }
}
