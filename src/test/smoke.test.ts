import { describe, expect, it } from "vitest";

/**
 * Toolchain smoke test — Task 1.5
 *
 * Confirms the Vitest + jsdom + globals setup executes. Real feature tests
 * are added by their respective tasks.
 */
describe("test toolchain", () => {
  it("runs and passes a trivial assertion", () => {
    expect(true).toBe(true);
  });
});
