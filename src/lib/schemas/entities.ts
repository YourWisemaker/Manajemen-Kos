/**
 * Entity form schemas — Task 4.1
 * ------------------------------
 * Composite Zod schemas for the create/edit forms of the core domain entities:
 * property, room, resident, and owner registration. They build on the
 * primitive field schemas and {@link moneySchema}, sourcing all messages from
 * the copy dictionary.
 *
 * Requirements: 18.6, 18.8 (property/room), 10.4 (resident KTP), plus owner
 * registration for the auth/onboarding flow (Req 6/7).
 */

import { z } from "zod";
import { copy } from "@/lib/locale/copy/id";
import { moneySchema } from "./money";
import { emailSchema, ktpSchema, phoneSchema } from "./primitives";

const v = copy.validasi;

/** A required text field that must be non-empty after trimming. */
const requiredTrimmed = z
  .string()
  .transform((s) => s.trim())
  .refine((s) => s.length > 0, { message: v.tidakBolehKosong });

/* -------------------------------------------------------------------------- */
/* Property (Req 18.8)                                                        */
/* -------------------------------------------------------------------------- */

/** `propertySchema` — name required (trimmed non-empty); address/city optional. */
export const propertySchema = z.object({
  name: requiredTrimmed,
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
});

export type PropertyInput = z.infer<typeof propertySchema>;

/* -------------------------------------------------------------------------- */
/* Room (Req 18.8, 18.6)                                                      */
/* -------------------------------------------------------------------------- */

/**
 * `roomSchema` — room number required (trimmed non-empty); `monthlyPrice`
 * parsed via {@link moneySchema} to a non-negative integer IDR (`>= 0`).
 */
export const roomSchema = z.object({
  number: requiredTrimmed,
  type: z.string().trim().optional(),
  monthlyPrice: moneySchema,
  facilities: z.array(z.string()).optional(),
});

export type RoomInput = z.infer<typeof roomSchema>;

/* -------------------------------------------------------------------------- */
/* Resident (Req 10.4)                                                        */
/* -------------------------------------------------------------------------- */

/**
 * `residentSchema` — full name required, KTP exactly 16 digits, phone
 * normalized to `+62`, email optional.
 */
export const residentSchema = z.object({
  fullName: requiredTrimmed,
  ktpNumber: ktpSchema,
  phone: phoneSchema,
  email: emailSchema.optional(),
  emergencyContact: z.string().trim().optional(),
  roomNumber: z.string().trim().optional(),
});

export type ResidentInput = z.infer<typeof residentSchema>;

/* -------------------------------------------------------------------------- */
/* Owner registration (auth / onboarding)                                     */
/* -------------------------------------------------------------------------- */

/**
 * `ownerRegisterSchema` — email + password for owner sign-up. Password must be
 * at least 8 characters (client-side minimum for Phase 1).
 */
export const ownerRegisterSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, { message: v.passwordMinimal }),
});

export type OwnerRegisterInput = z.infer<typeof ownerRegisterSchema>;
