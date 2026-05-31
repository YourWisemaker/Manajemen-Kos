/**
 * Marketing route group layout — Task 8.4
 * ----------------------------------------
 * A simple pass-through layout. Marketing pages have their own header/footer
 * built into the page — no shell wrapper needed.
 *
 * Requirements: 17.5, 17.6
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
