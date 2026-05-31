/**
 * Tenant / onboarding form schema — Task 4.1
 * ------------------------------------------
 * Validates tenant-level fields used during registration/onboarding, notably
 * the workspace subdomain (lowercase `a-z0-9-`, 3–30 chars, no edge hyphen).
 *
 * Requirement: 18.5
 */

import { z } from "zod";
import { nonEmptyTrimmed, subdomainSchema } from "./primitives";

/** Tenant profile / onboarding form schema. */
export const tenantSchema = z.object({
  name: nonEmptyTrimmed,
  subdomain: subdomainSchema,
});

/** Raw input accepted by {@link tenantSchema}. */
export type TenantInput = z.input<typeof tenantSchema>;
/** Parsed tenant values. */
export type TenantValues = z.output<typeof tenantSchema>;
