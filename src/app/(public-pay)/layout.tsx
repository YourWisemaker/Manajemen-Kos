/**
 * Public payment route group layout — Task 8.4
 * ---------------------------------------------
 * A pass-through layout. The public payment page has no tenant provider /
 * session; it applies `PayShell` itself with branding sourced from the
 * `PublicInvoiceView` (wired in Task 18).
 *
 * Requirements: 17.5, 17.6
 */
export default function PublicPayLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
