/**
 * Resident (penghuni) form schema — Task 4.1
 * ------------------------------------------
 * Validates the add/edit-resident form. The KTP rule (exactly 16 digits) is
 * the key gate; the phone is normalized to a `+62` prefix, and email is
 * optional.
 *
 * Requirements: 18.3, 18.4, 10.4
 */

import { z } from "zod";
import {
  ktpSchema,
  nonEmptyTrimmed,
  optionalEmailSchema,
  phoneSchema,
} from "./primitives";

/** Add/edit-resident form schema. */
export const residentSchema = z.object({
  fullName: nonEmptyTrimmed,
  ktpNumber: ktpSchema,
  phone: phoneSchema,
  email: optionalEmailSchema,
  emergencyContact: z.string().trim().optional(),
  roomNumber: z.string().trim().optional(),
});

/** Raw input accepted by {@link residentSchema} (pre-transform). */
export type ResidentInput = z.input<typeof residentSchema>;
/** Parsed, normalized resident values (e.g. phone as `+62…`). */
export type ResidentValues = z.output<typeof residentSchema>;
