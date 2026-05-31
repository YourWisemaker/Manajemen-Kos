import type { Config } from "tailwindcss";

/**
 * Helper: build an OKLCH color that reads raw "L C H" channels from a CSS
 * variable while still honoring Tailwind's `<alpha-value>` opacity modifiers
 * (e.g. `bg-primary/90`). Tokens are stored channel-only in globals.css.
 */
const oklchVar = (name: string) => `oklch(var(${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: oklchVar("--border"),
        input: oklchVar("--input"),
        ring: oklchVar("--ring"),
        background: oklchVar("--background"),
        foreground: oklchVar("--foreground"),
        line: oklchVar("--line"),
        primary: {
          DEFAULT: oklchVar("--primary"),
          foreground: oklchVar("--primary-foreground"),
        },
        secondary: {
          DEFAULT: oklchVar("--secondary"),
          foreground: oklchVar("--secondary-foreground"),
        },
        destructive: {
          DEFAULT: oklchVar("--destructive"),
          foreground: oklchVar("--destructive-foreground"),
        },
        muted: {
          DEFAULT: oklchVar("--muted"),
          foreground: oklchVar("--muted-foreground"),
        },
        accent: {
          DEFAULT: oklchVar("--accent"),
          foreground: oklchVar("--accent-foreground"),
        },
        popover: {
          DEFAULT: oklchVar("--popover"),
          foreground: oklchVar("--popover-foreground"),
        },
        card: {
          DEFAULT: oklchVar("--card"),
          foreground: oklchVar("--card-foreground"),
        },
        // Brand palette (direct access for brand components / illustrations).
        brand: {
          pandan: {
            900: oklchVar("--brand-pandan-900"),
            600: oklchVar("--brand-pandan-600"),
            300: oklchVar("--brand-pandan-300"),
          },
          kunyit: oklchVar("--brand-kunyit-500"),
          terracotta: oklchVar("--brand-terracotta-500"),
          teal: oklchVar("--brand-teal-500"),
        },
        // Warm paper neutrals + warm ink.
        paper: {
          50: oklchVar("--paper-50"),
          100: oklchVar("--paper-100"),
          200: oklchVar("--paper-200"),
        },
        ink: {
          900: oklchVar("--ink-900"),
          600: oklchVar("--ink-600"),
        },
        // Named status tokens.
        success: {
          DEFAULT: oklchVar("--success"),
          foreground: oklchVar("--success-foreground"),
        },
        warning: {
          DEFAULT: oklchVar("--warning"),
          foreground: oklchVar("--warning-foreground"),
        },
        danger: {
          DEFAULT: oklchVar("--danger"),
          foreground: oklchVar("--danger-foreground"),
        },
        info: {
          DEFAULT: oklchVar("--info"),
          foreground: oklchVar("--info-foreground"),
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        // Base scale derived from --radius (10px).
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // Intentional named radii from the design.
        card: "var(--radius-card)", // 14px
        button: "var(--radius-button)", // 10px
        input: "var(--radius-input)", // 10px
        badge: "var(--radius-badge)", // 8px
      },
      boxShadow: {
        "warm-sm": "var(--shadow-warm-sm)",
        "warm-md": "var(--shadow-warm-md)",
        "warm-lg": "var(--shadow-warm-lg)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.2s ease-out",
        shimmer: "shimmer 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
