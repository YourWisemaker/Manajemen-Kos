/**
 * Auth route group layout — Task 8.4
 * -----------------------------------
 * A pass-through layout. Auth pages have their own split-panel design
 * built into the page (full-viewport split with anyaman sidebar) — no
 * shell wrapper needed.
 *
 * Requirements: 17.5, 17.6
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
