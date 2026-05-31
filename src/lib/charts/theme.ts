/**
 * Brand chart theme — Task 12.1
 * -----------------------------
 * Recharts reads colors as literal SVG paint values, so it can't consume the
 * Tailwind/OKLCH design-token utility classes directly. This module mirrors the
 * KosKita design tokens (see `styles/globals.css`) as explicit OKLCH color
 * strings so every chart renders in the brand palette rather than Recharts'
 * default blue/green series (Requirements 8.6, 14.4).
 *
 * The values here intentionally duplicate the channel values declared in
 * `globals.css` (`--brand-pandan-600`, `--brand-kunyit-500`, etc.). Keep them
 * in sync if the tokens change — they exist only because charts live outside
 * the CSS-variable cascade for their paint attributes.
 *
 * OKLCH paint values are supported in SVG `fill`/`stroke`/`stop-color` by all
 * modern browsers and are already used inline elsewhere in the app.
 */

/** Brand palette colors for chart paint, mirroring the OKLCH design tokens. */
export const chartTheme = {
  /** Signature pandan green — primary line/area (`--brand-pandan-600`). */
  pandan: "oklch(0.52 0.09 165)",
  /** Pandan tint — fills / secondary bars (`--brand-pandan-300`). */
  pandanTint: "oklch(0.86 0.04 165)",
  /** Kunyit accent — highlight series (`--brand-kunyit-500`). */
  kunyit: "oklch(0.74 0.14 70)",
  /** Terracotta — secondary series (`--brand-terracotta-500`). */
  terracotta: "oklch(0.62 0.13 40)",
  /** Teal — gradient end-stop / tertiary series (`--brand-teal-500`). */
  teal: "oklch(0.62 0.07 195)",
  /** Clay-red — arrears / negative series (`--danger`). */
  danger: "oklch(0.58 0.16 30)",
  /** Green — paid / positive series (`--success`). */
  success: "oklch(0.6 0.12 150)",
  /** Warm hairline — cartesian grid lines (`--line`). */
  grid: "oklch(0.9 0.01 85)",
  /** Warm gray — axis tick labels (`--ink-600`). */
  axis: "oklch(0.45 0.015 80)",
  /** Warm near-black — tooltip label text (`--ink-900`). */
  ink: "oklch(0.25 0.02 80)",
  /** Card surface — tooltip background (`--paper-100`). */
  surface: "oklch(0.97 0.008 90)",
} as const;

/**
 * Ordered categorical series palette for multi-series charts (bars, pies,
 * breakdowns). Drawn entirely from the brand palette so charts never fall back
 * to default chart-library colors.
 */
export const chartSeries: readonly string[] = [
  chartTheme.pandan,
  chartTheme.kunyit,
  chartTheme.terracotta,
  chartTheme.teal,
];

/** Shared tooltip container style so chart tooltips match the themed cards. */
export const chartTooltipStyle = {
  borderRadius: "10px",
  border: `1px solid ${chartTheme.grid}`,
  backgroundColor: chartTheme.surface,
  boxShadow: "0 2px 8px -2px rgb(56 40 24 / 0.08)",
  fontSize: "12px",
} as const;
