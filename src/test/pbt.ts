/**
 * Shared property-based-testing config — Task 1.5
 *
 * Centralizes the fast-check run parameters so every property test in the
 * suite uses a consistent, sufficiently large sample size. The design's
 * testing strategy requires a minimum of 100 iterations per property.
 *
 * Note: the config is intentionally left as a plain object literal (not
 * annotated with `Parameters` from fast-check, which defaults its generic to
 * `void`). A bare literal is structurally assignable to `Parameters<Ts>` for
 * any property arity, so it works with `fc.property(arb, pred)` regardless of
 * the generated argument tuple.
 *
 * Usage:
 *   import fc from "fast-check";
 *   import { pbtConfig } from "@/test/pbt";
 *   fc.assert(fc.property(arb, predicate), pbtConfig);
 */
export const PBT_MIN_RUNS = 100;

export const pbtConfig = {
  numRuns: PBT_MIN_RUNS,
} as const;

export default pbtConfig;
