import type { Metadata } from "next";
import { Bricolage_Grotesque, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "@/styles/globals.css";

/**
 * Typography — Task 1.3
 * A deliberate three-typeface system (display / body / mono) wired as CSS
 * variables so the design tokens and Tailwind `fontFamily` utilities resolve
 * to real fonts. Deliberately NOT Inter / Geist.
 */
const fontDisplay = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "KosKita",
  description: "Manajemen kos modern untuk Indonesia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${fontDisplay.variable} ${fontSans.variable} ${fontMono.variable}`}
    >
      <body className="font-sans">{children}</body>
    </html>
  );
}
