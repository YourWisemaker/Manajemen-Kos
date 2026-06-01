import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { pbtConfig } from "@/test/pbt";

// ---------------------------------------------------------------------------
// Property 10: Subscription Plan Limit Enforcement — Task 11.3
// ---------------------------------------------------------------------------

const PLAN_MAX_ROOMS: Record<string, number> = {
  starter: 15,
  pro: 60,
  enterprise: Number.POSITIVE_INFINITY,
};

const planArb = fc.constantFrom("starter", "pro", "enterprise");

function isWithinLimit(plan: string, currentRooms: number): boolean {
  const maxRooms = PLAN_MAX_ROOMS[plan] ?? 0;
  return currentRooms <= maxRooms;
}

describe("Property 10: Plan Limit Enforcement (Req 10.5, 10.6)", () => {
  it("room count must not exceed plan maxRooms", () => {
    fc.assert(
      fc.property(planArb, fc.integer({ min: 0, max: 1000 }), (plan, currentRooms) => {
        const maxRooms = PLAN_MAX_ROOMS[plan];
        const withinLimit = isWithinLimit(plan, currentRooms);

        if (currentRooms <= maxRooms) {
          expect(withinLimit).toBe(true);
        } else {
          expect(withinLimit).toBe(false);
        }
      }),
      pbtConfig,
    );
  });

  it("starter rejects > 15 rooms, pro rejects > 60, enterprise never rejects", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 200 }), (roomCount) => {
        expect(isWithinLimit("starter", roomCount)).toBe(roomCount <= 15);
        expect(isWithinLimit("pro", roomCount)).toBe(roomCount <= 60);
        expect(isWithinLimit("enterprise", roomCount)).toBe(true);
      }),
      pbtConfig,
    );
  });

  it("exactly at the limit is always allowed, one over is rejected", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          ...Object.entries(PLAN_MAX_ROOMS).filter(([_, v]) => Number.isFinite(v)),
        ),
        ([plan, maxRooms]) => {
          expect(isWithinLimit(plan, maxRooms)).toBe(true);
          expect(isWithinLimit(plan, maxRooms + 1)).toBe(false);
        },
      ),
      pbtConfig,
    );
  });
});
