"use client";

/**
 * AppShell — Task 8.1
 * -------------------
 * Tenant dashboard chrome: collapsible left sidebar (icon + label) on desktop;
 * below the `md` breakpoint the sidebar is hidden and the primary nav becomes a
 * bottom tab bar. The top bar carries a tenant switcher (multi-property /
 * owner), a global search input (visual), a notifications bell (visual), and a
 * user menu with a role switcher for demoing RBAC.
 *
 * Nav items are declared as `NavItem[]` and gated via `filterNavByRole` from
 * `@/lib/tenant`. The active item is derived from `usePathname`.
 *
 * Requirements: 17.1, 17.2, 20.4
 */

import {
  Bell,
  Building2,
  Check,
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
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { BrandMark } from "@/components/brand";
import { Input } from "@/components/ui/input";
import type { TenantSettings } from "@/lib/data";
import {
  DEFAULT_TENANT,
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

/** Full sidebar nav items per the design (Requirement 17.1). */
const NAV_ITEMS: NavItem[] = [
  { id: "dasbor", label: "Dasbor", href: "/dasbor", icon: "LayoutDashboard" },
  { id: "properti", label: "Properti", href: "/properti", icon: "Building2" },
  { id: "penghuni", label: "Penghuni", href: "/penghuni", icon: "Users" },
  { id: "kontrak", label: "Kontrak", href: "/kontrak", icon: "FileText" },
  { id: "tagihan", label: "Tagihan", href: "/tagihan", icon: "Receipt" },
  { id: "laporan", label: "Laporan", href: "/laporan", icon: "TrendingUp" },
  { id: "pengaturan", label: "Pengaturan", href: "/pengaturan", icon: "Settings" },
];

/** Bottom tab bar items (5 most important) for the mobile breakpoint. */
const MOBILE_TAB_IDS = ["dasbor", "properti", "penghuni", "tagihan", "pengaturan"];

/**
 * Mock alternate tenants for the switcher demo. Derived from the seeded primary
 * tenant so the switcher has more than one option to choose from in Phase 1.
 */
const TENANT_OPTIONS: TenantSettings[] = [
  DEFAULT_TENANT,
  {
    ...DEFAULT_TENANT,
    id: "tenant-kos-mawar",
    name: "Kos Mawar Indah",
    subdomain: "kosmawar",
    brandColor: "#c2410c",
  },
  {
    ...DEFAULT_TENANT,
    id: "tenant-kos-anggrek",
    name: "Kos Anggrek Residence",
    subdomain: "kosanggrek",
    brandColor: "#0f766e",
  },
];

const ROLE_OPTIONS: TenantRole[] = ["owner", "admin", "staff"];

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

/** True when `href` matches (or is a parent of) the current pathname. */
function isActiveHref(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

// ---------------------------------------------------------------------------
// Lightweight dropdown (no dropdown-menu primitive in the kit)
// ---------------------------------------------------------------------------

function useOutsideClose(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handle(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);
  return ref;
}

// ---------------------------------------------------------------------------
// AppShell
// ---------------------------------------------------------------------------

export interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { tenant, role, setActiveTenant, setRole } = useTenant();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [tenantOpen, setTenantOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const tenantRef = useOutsideClose(() => setTenantOpen(false));
  const userRef = useOutsideClose(() => setUserOpen(false));

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
            {visibleNav.map((item) => {
              const active = isActiveHref(pathname, item.href);
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-button px-3 py-2 text-sm font-medium",
                      "transition-colors",
                      active
                        ? "bg-secondary text-secondary-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                      collapsed && "justify-center px-2",
                    )}
                  >
                    <NavIcon icon={item.icon} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
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
          {/* Tenant switcher */}
          <div className="relative" ref={tenantRef}>
            <button
              type="button"
              onClick={() => setTenantOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-button px-2 py-1.5 transition-colors hover:bg-secondary"
              aria-haspopup="menu"
              aria-expanded={tenantOpen}
              aria-label="Ganti tenant"
            >
              <span className="max-w-[10rem] truncate text-sm font-semibold text-foreground">
                {tenant.name}
              </span>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </button>

            {tenantOpen && (
              <div
                className="absolute left-0 top-full z-20 mt-1 w-64 rounded-card border border-line bg-popover p-1 shadow-warm-lg"
                role="menu"
              >
                <p className="px-2 py-1.5 text-caption font-medium text-muted-foreground">
                  Pindah tenant
                </p>
                {TENANT_OPTIONS.map((option) => {
                  const selected = option.id === tenant.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      onClick={() => {
                        setActiveTenant(option);
                        setTenantOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-button px-2 py-2 text-left text-sm text-foreground transition-colors hover:bg-secondary"
                    >
                      <span
                        className="size-3 shrink-0 rounded-full border border-line"
                        style={{ backgroundColor: option.brandColor }}
                        aria-hidden="true"
                      />
                      <span className="flex-1 truncate">{option.name}</span>
                      {selected && <Check className="size-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Global search (visual) */}
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

          {/* Notifications bell (visual) */}
          <button
            type="button"
            className="relative rounded-button p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Notifikasi"
          >
            <Bell className="size-5" />
            <span
              className="absolute right-1.5 top-1.5 size-2 rounded-full bg-accent"
              aria-hidden="true"
            />
          </button>

          {/* User menu with role switcher */}
          <div className="relative" ref={userRef}>
            <button
              type="button"
              onClick={() => setUserOpen((o) => !o)}
              className="flex items-center gap-2 rounded-button px-1.5 py-1 transition-colors hover:bg-secondary"
              aria-haspopup="menu"
              aria-expanded={userOpen}
              aria-label="Menu pengguna"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-brand-pandan-300 text-xs font-semibold text-brand-pandan-900">
                {tenant.name.charAt(0).toUpperCase()}
              </span>
              <span className="hidden text-xs text-muted-foreground md:inline">
                {ROLE_LABELS[role]}
              </span>
            </button>

            {userOpen && (
              <div
                className="absolute right-0 top-full z-20 mt-1 w-56 rounded-card border border-line bg-popover p-1 shadow-warm-lg"
                role="menu"
              >
                <p className="px-2 py-1.5 text-caption font-medium text-muted-foreground">
                  Ganti peran (demo RBAC)
                </p>
                {ROLE_OPTIONS.map((option) => {
                  const selected = option === role;
                  return (
                    <button
                      key={option}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      onClick={() => {
                        setRole(option);
                        setUserOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-button px-2 py-2 text-left text-sm text-foreground transition-colors hover:bg-secondary"
                    >
                      <span>{ROLE_LABELS[option]}</span>
                      {selected && <Check className="size-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        className="flex shrink-0 items-center justify-around border-t border-line bg-card px-2 md:hidden"
        aria-label="Navigasi mobile"
      >
        {mobileTabs.map((item) => {
          const active = isActiveHref(pathname, item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-2 transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <NavIcon icon={item.icon} className="size-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
