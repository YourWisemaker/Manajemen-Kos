import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { pbtConfig } from "@/test/pbt";

// ---------------------------------------------------------------------------
// Property 15: Notification Template Interpolation Completeness — Task 10.4
// ---------------------------------------------------------------------------

function interpolateVariables(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    return variables[key] ?? match;
  });
}

const BUILTIN_KEYS = new Set([
  "constructor",
  "toString",
  "valueOf",
  "hasOwnProperty",
  "isPrototypeOf",
  "propertyIsEnumerable",
  "toLocaleString",
  "__proto__",
]);

const variableArb = fc.record({
  key: fc
    .string({ minLength: 1, maxLength: 20 })
    .filter((s) => /^\w+$/.test(s) && !BUILTIN_KEYS.has(s)),
  value: fc.string({ minLength: 0, maxLength: 200 }),
});

describe("Property 15: Notification Template Interpolation (Req 9.2)", () => {
  it("all provided placeholders are replaced with their values", () => {
    fc.assert(
      fc.property(fc.array(variableArb, { minLength: 1, maxLength: 10 }), (vars) => {
        const uniqueVars = new Map<string, string>();
        for (const v of vars) uniqueVars.set(v.key, v.value);

        const placeholders = [...uniqueVars.keys()].map((k) => `{${k}}`);
        const template = `Halo, tagihan ${placeholders.join(" dan ")} sudah siap.`;

        const variables: Record<string, string> = {};
        for (const [k, v] of uniqueVars) variables[k] = v;

        const result = interpolateVariables(template, variables);

        for (const [key, value] of uniqueVars) {
          expect(result).toContain(value);
          expect(result).not.toContain(`{${key}}`);
        }
      }),
      pbtConfig,
    );
  });

  it("unmatched placeholders are left as-is", () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1, maxLength: 20 })
          .filter((s) => /^\w+$/.test(s) && !BUILTIN_KEYS.has(s)),
        fc
          .string({ minLength: 1, maxLength: 20 })
          .filter((s) => /^\w+$/.test(s) && !BUILTIN_KEYS.has(s)),
        (knownKey, unknownKey) => {
          fc.pre(knownKey !== unknownKey);

          const template = `Halo {${knownKey}}, item {${unknownKey}} tersedia.`;
          const result = interpolateVariables(template, { [knownKey]: "Budi" });

          expect(result).toContain("Budi");
          expect(result).toContain(`{${unknownKey}}`);
          expect(result).not.toContain(`{${knownKey}}`);
        },
      ),
      pbtConfig,
    );
  });

  it("empty variable values produce empty replacement (not error)", () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1, maxLength: 20 })
          .filter((s) => /^\w+$/.test(s) && !BUILTIN_KEYS.has(s)),
        (key) => {
          const template = `Hello {${key}}!`;
          const result = interpolateVariables(template, { [key]: "" });
          expect(result).toBe("Hello !");
        },
      ),
      pbtConfig,
    );
  });
});
