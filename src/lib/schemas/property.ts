/**
 * Property & room form schemas — Task 4.1
 * ---------------------------------------
 * Validates the property and add/edit-room forms: the property name and the
 * room number must be non-empty after trimming, and the room's monthly price
 * must be a non-negative integer IDR amount (accepts either a number or a
 * Rupiah-formatted string).
 *
 * Requirements: 18.6, 18.8
 */

import { z } from "zod";
import { monthlyPriceSchema, nonEmptyTrimmed } from "./primitives";

/**
 * Property schema: a trimmed, non-empty name.
 *
 * Requirement: 18.8
 */
export const propertySchema = z.object({
  name: nonEmptyTrimmed,
});

/**
 * Room schema: a trimmed, non-empty room number and a non-negative integer
 * monthly price.
 *
 * Requirements: 18.6, 18.8
 */
export const roomSchema = z.object({
  number: nonEmptyTrimmed,
  monthlyPrice: monthlyPriceSchema,
});

/** Raw input accepted by {@link propertySchema}. */
export type PropertyInput = z.input<typeof propertySchema>;
/** Parsed property values. */
export type PropertyValues = z.output<typeof propertySchema>;

/** Raw input accepted by {@link roomSchema} (price may be a string). */
export type RoomInput = z.input<typeof roomSchema>;
/** Parsed room values (price as an integer IDR). */
export type RoomValues = z.output<typeof roomSchema>;
