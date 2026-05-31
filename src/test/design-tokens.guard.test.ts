import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { pbtConfig } from "@/test/pbt";

/**
 * Anti-generic design-token guard — Task 1.6
 * ------------------------------------------
 * Programmatic guard for the product owner's non-negotiable requirement:
 * KosKita "must not look like a generic AI-generated SaaS". The two most
 * obvious tells of the default shadcn/AI-template aesthetic are:
 *
 *   1. a violet / indigo / purple primary brand color, and
 *   2. Inter (or Geist) used as the only typeface everywhere.
 *
 * This test reads the REAL project sources (`styles/globals.css` and
 * `app/layout.tsx`) from disk rather than hardcoding duplicate values, so it
 * fails the moment someone repoints `--primary` to a purple hue or swaps the
 * configured fonts back to Inter/Geist.
 *
 * Validates: Requirements 1.2 (primary hue outside violet/indigo/purple)
 * Validates: Requirements 1.3 (Bricolage Grotesque / Plus Jakarta Sans fonts)
 */

const here = dirname(fileURLToPath(import.meta.url));
const globalsCssPath = resolve(here, "../styles/globals.css");
const layoutPath = resolve(here, "../app/layout.tsx");

const globalsCss = readFileSync(globalsCssPath, "utf8");
const layoutSource = readFileSync(layoutPath, "utf8");

// Violet / indigo / purple occupy roughly this OKLCH hue band (degrees).
const VIOLET_HUE_MIN = 260;
const VIOLET_HUE_MAX = 320;
// A strict "this really is a green" band for the pandan primary.
const GREEN_HUE_MIN = 120;
const GREEN_HUE_MAX = 200;

/**
 * Parse the custom-property declarations inside the light-mode `:root` block.
 * Custom properties contain no nested braces, so a single non-`}` capture is
 * sufficient to isolate the first `:root { ... }` block.
 */
function parseRootTokens(css: string): Map<string, string> {
  const rootMatch = css.match(/:root\s*\{([^}]*)\}/);
  if (!rootMatch) {
    throw new Error("Could not locate a :root { ... } block in globals.css");
  }
  const tokens = new Map<string, string>();
  const declRe = /--([\w-]+)\s*:\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = declRe.exec(rootMatch[1])) !== null) {
    tokens.set(m[1], m[2].trim());
  }
  return tokens;
}

/**
 * Resolve a token to its final raw value, following `var(--other)` references
 * (e.g. `--primary` -> `--brand-pandan-600` -> `0.52 0.09 165`). Following the
 * chain is what makes the guard robust: changing `--primary` to point at a
 * purple token would change the resolved hue and trip the assertions below.
 */
function resolveToken(
  tokens: Map<string, string>,
  name: string,
  seen: Set<string> = new Set(),
): string {
  if (seen.has(name)) {
    throw new Error(`Circular token reference detected at --${name}`);
  }
  seen.add(name);
  const raw = tokens.get(name);
  if (raw === undefined) {
    throw new Error(`Token --${name} not found in :root`);
  }
  const varRef = raw.match(/^var\(\s*--([\w-]+)\s*\)$/);
  if (varRef) {
    return resolveToken(tokens, varRef[1], seen);
  }
  return raw;
}

/** Extract the OKLCH hue (3rd channel of `L C H`) from resolved channels. */
function oklchHue(channels: string): number {
  const parts = channels.split(/\s+/).map(Number);
  if (parts.length < 3 || parts.some(Number.isNaN)) {
    throw new Error(`Unexpected OKLCH channel format: "${channels}"`);
  }
  return parts[2];
}

/**
 * Find the CSS variable a given next/font constructor is wired to, e.g.
 * `Bricolage_Grotesque({ ..., variable: "--font-display" })` -> "--font-display".
 * Returns null when the font constructor is not configured at all.
 */
function fontVariableFor(source: string, fontFn: string): string | null {
  const re = new RegExp(`${fontFn}\\(\\{[^}]*?variable:\\s*["']([^"']+)["']`, "s");
  const m = source.match(re);
  return m ? m[1] : null;
}

const rootTokens = parseRootTokens(globalsCss);
const primaryChannels = resolveToken(rootTokens, "primary");
const primaryHue = oklchHue(primaryChannels);

describe("design tokens — primary brand color (Req 1.2)", () => {
  it("resolves the configured --primary token from globals.css", () => {
    // Sanity: the value parsed from disk is the pandan signature green.
    expect(primaryChannels).toBe("0.52 0.09 165");
    expect(primaryHue).toBe(165);
  });

  it("maps --primary to the pandan token, not a violet/indigo/purple token", () => {
    // Guards identity: the semantic primary must alias the brand pandan token.
    expect(rootTokens.get("primary")).toBe("var(--brand-pandan-600)");
    expect(globalsCss).not.toMatch(/--primary\s*:\s*var\(--brand-(violet|indigo|purple)/i);
  });

  it("keeps the primary hue OUTSIDE the violet/indigo/purple range", () => {
    const inVioletBand = primaryHue >= VIOLET_HUE_MIN && primaryHue <= VIOLET_HUE_MAX;
    expect(inVioletBand).toBe(false);
  });

  it("keeps the primary hue inside a strict green range (pandan)", () => {
    expect(primaryHue).toBeGreaterThanOrEqual(GREEN_HUE_MIN);
    expect(primaryHue).toBeLessThanOrEqual(GREEN_HUE_MAX);
  });
});

describe("design tokens — typography (Req 1.3)", () => {
  it("configures Bricolage Grotesque as the display typeface (--font-display)", () => {
    expect(fontVariableFor(layoutSource, "Bricolage_Grotesque")).toBe("--font-display");
  });

  it("configures Plus Jakarta Sans as the body/UI typeface (--font-sans)", () => {
    expect(fontVariableFor(layoutSource, "Plus_Jakarta_Sans")).toBe("--font-sans");
  });

  it("configures JetBrains Mono as the numeric/mono typeface (--font-mono)", () => {
    expect(fontVariableFor(layoutSource, "JetBrains_Mono")).toBe("--font-mono");
  });

  it("does NOT configure Inter or Geist as a typeface", () => {
    // The generic-template tells: Inter / Geist (and Geist_Mono) must be absent
    // as next/font constructors for the display or body faces.
    expect(layoutSource).not.toMatch(/\bInter\s*\(/);
    expect(layoutSource).not.toMatch(/\bGeist(_Mono)?\s*\(/);
    expect(fontVariableFor(layoutSource, "Inter")).toBeNull();
    expect(fontVariableFor(layoutSource, "Geist")).toBeNull();
  });
});

describe("design tokens — anti-generic hue property (Req 1.2)", () => {
  it("never coincides with any violet/indigo/purple hue [260,320]", () => {
    // **Validates: Requirements 1.2**
    // For every forbidden hue sampled across the violet/indigo/purple band, the
    // configured primary hue must differ from it AND must itself lie outside the
    // band. This holds across all samples because the pandan hue is 165.
    fc.assert(
      fc.property(fc.integer({ min: VIOLET_HUE_MIN, max: VIOLET_HUE_MAX }), (forbiddenHue) => {
        return (
          primaryHue !== forbiddenHue &&
          (primaryHue < VIOLET_HUE_MIN || primaryHue > VIOLET_HUE_MAX)
        );
      }),
      pbtConfig,
    );
  });
});
