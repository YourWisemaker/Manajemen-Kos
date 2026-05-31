/**
 * Canonical design-token metadata — single source of truth for the
 * KosKita visual identity. Used by the anti-generic guard test (Task 1.6)
 * and available to brand components that need typeface names at runtime.
 *
 * These mirror the values configured in `globals.css` (OKLCH tokens) and
 * `layout.tsx` (next/font wiring). Keep them in sync.
 */

/** Configured typefaces — deliberately NOT Inter / Geist. */
export const fonts = {
  /** Display / headings. */
  display: "Bricolage Grotesque",
  /** Body / UI. */
  sans: "Plus Jakarta Sans",
  /** Numeric / monospace (tabular figures). */
  mono: "JetBrains Mono",
} as const;

/**
 * Primary brand color in OKLCH channels (L C H), mirroring
 * `--brand-pandan-600` in globals.css. Pandan green — hue ~165, which is
 * well outside the violet/indigo/purple range (~260–320).
 */
export const primaryBrandOklch = {
  lightness: 0.52,
  chroma: 0.09,
  hue: 165,
} as const;
