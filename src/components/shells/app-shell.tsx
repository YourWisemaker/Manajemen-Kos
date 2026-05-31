"use client";

/**
 * AppShell — Task 8.1
 * -------------------
 * Tenant dashboard chrome: collapsible left sidebar (icon + label), top bar
 * with tenant switcher, global search, notifications bell, and user menu.
 * Below the `md` breakpoint the sidebar collapses entirely and a bottom tab
 * bar shows the 5 most important nav items.
 *
 * Nav items are gated via `filterNavByRole` from `@/lib/tenant`.
 *
 * Requirements: 17.1, 17.2, 20.4
 */

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Home,
  LayoutDashboard,
  Receipt,
  Search,
  Settings,
  TrendingUp,
  Users,
} from "lucide-react";

import { BrandMark } from "@/components/brand";
import { Input } from "@/components/ui/input";
import {
  filterNavByRole,
  type NavItem,
  ROLE_LABELS,
  type TenantRole,
  useTenant,
} from "@/lib/tenant";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Nav item definitions
// ---------------------------------------------------------------------------

/** Full sidebar nav items per the design. */
const NAV_ITEMS: NavItem[] = [
  { id: "dasbor", label: "Dasbor", href: "/dasbor", icon: "LayoutDashboard" },
  { id: "properti", label: "Properti", href: "/properti", icon: "Building2" },
  { id: "penghuni", label: "Penghuni", href: "/penghuni", icon: "Users" },
  { id: "kontrak", label: "Kontrak", href: "/kontrak", icon: "FileText" },
  { id: "tagihan", label: "Tagihan", href: "/tagihan", icon: "Receipt" },
  {
    id: "laporan",
    label: "Laporan",
    href: "/laporan",
    icon: "TrendingUp",
    roles: ["owner", "admin"] as const,
  },
  {
    id: "pengaturan",
    label: "Pengaturan",
    href: "/pengaturan",
    icon: "Settings",
    roles: ["owner", "admin"] as const,
  },
];

/** Bottom tab bar items (5 most important). */
const MOBILE_TAB_IDS = ["dasbor", "properti", "penghuni", "tagihan", "pengaturan"];

// ---------------------------------------------------------------------------
// Icon resolver
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  Receipt,
  TrendingUp,
  Settings,
  Home,
};

function NavIcon({ icon, className }: { icon?: string; className?: string }) {
  const Icon = icon ? ICON_MAP[icon] : null;
  if (!Icon) return null;
  return <Icon className={cn("size-5 shrink-0", className)} />;
}

// ---------------------------------------------------------------------------
// AppShell
// ---------------------------------------------------------------------------

export interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { tenant, role, branding } = useTenant();
  const [collapsed, setCollapsed] = useState(false);

  const visibleNav = filterNavByRole(NAV_ITEMS, role);
  const mobileTabs = visibleNav.filter((item) => MOBILE_TAB_IDS.includes(item.id));

  return (
    <div className="flex h-dvh w-full flex-col bg-background md:flex-row">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden flex-col border-r border-line bg-card md:flex",
          "transition-[width] duration-200 ease-out",
          collapsed ? "w-[68px]" : "w-60",
        )}
      >
        {/* Sidebar header */}
        <div className="flex h-16 items-center gap-2 border-b border-line px-4">
          <BrandMark size="sm" showWordmark={!collapsed} />
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Navigasi utama">
          <ul className="flex flex-col gap-1">
            {visibleNav.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-button px-3 py-2 text-sm font-medium text-muted-foreground",
                    "transition-colors hover:bg-secondary hover:text-foreground",
                    collapsed && "justify-center px-2",
                  )}
                >
                  <NavIcon icon={item.icon} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-line p-2">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="flex w-full items-center justify-center rounded-button p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label={collapsed ? "Perluas sidebar" : "Kecilkan sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <ChevronLeft className="size-4" />
            )}
          </button>
        </div>
      </aside>

      {/* Main column: top bar + content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-card px-4 md:px-6">
          {/* Tenant switcher placeholder */}
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground">
              {branding.name}
            </span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </div>

          {/* Global search placeholder */}
          <div className="ml-auto flex max-w-xs flex-1 items-center md:max-w-sm">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari..."
                className="h-9 pl-9 text-sm"
                aria-label="Pencarian global"
              />
            </div>
          </div>

          {/* Notifications bell */}
          <button
            type="button"
            className="relative rounded-button p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Notifikasi"
          >
            <Bell className="size-5" />
          </button>

          {/* User menu placeholder */}
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-brand-pandan-300 text-xs font-semibold text-brand-pandan-900">
              {tenant.name.charAt(0).toUpperCase()}
            </div>
            <span className="hidden text-xs text-muted-foreground md:inline">
              {ROLE_LABELS[role]}
            </span>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        className="flex shrink-0 items-center justify-around border-t border-line bg-card px-2 pb-safe md:hidden"
        aria-label="Navigasi mobile"
      >
        {mobileTabs.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="flex flex-col items-center gap-0.5 px-2 py-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <NavIcon icon={item.icon} className="size-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
