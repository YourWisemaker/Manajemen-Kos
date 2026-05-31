"use client";

/**
 * AdminShell — Task 8.3
 * ---------------------
 * Super-admin chrome with a visually DISTINCT, cooler "internal tooling"
 * treatment (ink/slate-leaning sidebar) so staff never confuse it with a
 * tenant workspace. A clear "Konsol Internal KosKita" label anchors the
 * identity. Includes a simple sidebar/topbar with the admin nav and active-
 * item marking via `usePathname`. Wraps {children}.
 *
 * Requirements: 17.4, 16.1
 */

import { LayoutDashboard, Megaphone, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Admin nav items
// ---------------------------------------------------------------------------

interface AdminNavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ADMIN_NAV: AdminNavItem[] = [
  { id: "ringkasan", label: "Ringkasan", href: "/admin", icon: LayoutDashboard },
  { id: "tenant", label: "Tenant", href: "/admin/tenant", icon: Users },
  { id: "broadcast", label: "Broadcast", href: "/admin/broadcast", icon: Megaphone },
];

const INTERNAL_LABEL = "Konsol Internal KosKita";

/** True when `href` matches (or is a parent of) the current pathname. */
function isActiveHref(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

// ---------------------------------------------------------------------------
// AdminShell
// ---------------------------------------------------------------------------

export interface AdminShellProps {
  children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-dvh w-full flex-col bg-background md:flex-row">
      {/* Sidebar — cool slate/ink accent to distinguish from the tenant shell. */}
      <aside className="hidden w-60 flex-col border-r border-slate-700 bg-slate-900 md:flex">
        {/* Sidebar header */}
        <div className="flex h-16 items-center gap-2 border-b border-slate-700 px-4">
          <ShieldCheck className="size-5 shrink-0 text-slate-300" />
          <span className="font-display text-base font-semibold leading-tight text-white">
            {INTERNAL_LABEL}
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Navigasi admin">
          <ul className="flex flex-col gap-1">
            {ADMIN_NAV.map((item) => {
              const active = isActiveHref(pathname, item.href);
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-button px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-slate-800 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white",
                    )}
                  >
                    <item.icon className="size-5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Internal-tooling footer note */}
        <div className="border-t border-slate-700 px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">
            Lingkungan staf internal
          </p>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar — slate band reinforces the internal context. */}
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-700 bg-slate-900 px-4 md:px-6">
          <ShieldCheck className="size-5 shrink-0 text-slate-300 md:hidden" />
          <span className="font-display text-base font-semibold text-white">
            {INTERNAL_LABEL}
          </span>
          <span className="ml-2 rounded-badge bg-slate-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-300">
            Internal
          </span>
          <div className="ml-auto" />
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
