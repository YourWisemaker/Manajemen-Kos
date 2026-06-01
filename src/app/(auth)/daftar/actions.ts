"use server";

import { auth } from "@/lib/server/auth";

/**
 * Registration Server Action — Task 4.3
 *
 * Calls Better Auth's signUp endpoint. The afterSignUp hook
 * (configured in auth/index.ts) automatically creates the tenant
 * workspace, user_account record, and trial subscription.
 *
 * Will be wired to the registration form in Task 17.1.
 */

interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
}

interface RegisterResult {
  success: boolean;
  error?: string;
}

export async function register(input: RegisterInput): Promise<RegisterResult> {
  try {
    const response = await auth.api.signUpEmail({
      body: {
        email: input.email,
        password: input.password,
        name: input.fullName,
      },
    });

    if (!response) {
      return { success: false, error: "Pendaftaran gagal. Coba lagi." };
    }

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan saat pendaftaran.";
    return { success: false, error: message };
  }
}
