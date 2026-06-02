import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * StatusBadge — Task 7.2
 * ----------------------
 * Maps every entity status used across the app to one of the named status
 * color tokens (success / warning / danger / info / neutral) plus a Bahasa
 * Indonesia display label. Built on top of the themed {@link Badge} base so it
 * inherits the 8px badge radius and typography.
 *
 * The mapping is a `Record<EntityStatus, StatusStyle>`, which makes it
 * **total**: if a new status is ever added to {@link EntityStatus} without a
 * mapping entry, this file fails to compile. That guarantees the "maps every
 * status" requirement at the type level.
 *
 * Server-safe pure component (no interactivity) — not marked "use client".
 *
 * Requirements: 2.5, 2.8
 */

/** The full union of entity statuses the UI renders (per the design). */
export type EntityStatus =
  | "lunas"
  | "tertagih"
  | "jatuh_tempo"
  | "tunggakan"
  | "draft"
  | "batal"
  | "tersedia"
  | "terisi"
  | "perbaikan"
  | "trial"
  | "aktif"
  | "ditangguhkan"
  | "berhenti"
  | "keluar"
  | "berakhir"
  | "diputus"
  | "open"
  | "in_progress"
  | "resolved";

/** The named status color families used by badges, rows, and charts. */
export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

interface StatusStyle {
  /** Which named status token family this status belongs to. */
  tone: StatusTone;
  /** Bahasa Indonesia label shown inside the badge. */
  label: string;
}

// Tone family -> token-driven classes (soft tinted fill + solid text/border).
// `neutral` uses the warm muted token so "inactive" states read as quiet.
const TONE_CLASS: Record<StatusTone, string> = {
  success: "border-success/20 bg-success/15 text-success",
  warning: "border-warning/30 bg-warning/20 text-warning-foreground",
  danger: "border-danger/20 bg-danger/15 text-danger",
  info: "border-info/20 bg-info/15 text-info",
  neutral: "border-border bg-muted text-muted-foreground",
};

/**
 * Total mapping from every {@link EntityStatus} to its tone + label.
 *
 * Assignments (consistent across the app):
 *  - success: lunas, tersedia, aktif        (paid / available / active — good)
 *  - danger:  jatuh_tempo, tunggakan, ditangguhkan (overdue / arrears / suspended)
 *  - warning: perbaikan, trial              (needs attention / time-limited)
 *  - info:    tertagih, terisi              (billed / occupied — informational)
 *  - neutral: draft, batal, berhenti, keluar, berakhir (inactive / ended)
 *  - danger also covers `diputus` (contract terminated early).
 */
const STATUS_MAP: Record<EntityStatus, StatusStyle> = {
  // Billing / invoices.
  lunas: { tone: "success", label: "Lunas" },
  tertagih: { tone: "info", label: "Tertagih" },
  jatuh_tempo: { tone: "danger", label: "Jatuh tempo" },
  tunggakan: { tone: "danger", label: "Tunggakan" },
  draft: { tone: "neutral", label: "Draf" },
  batal: { tone: "neutral", label: "Batal" },
  // Rooms.
  tersedia: { tone: "success", label: "Tersedia" },
  terisi: { tone: "info", label: "Terisi" },
  perbaikan: { tone: "warning", label: "Perbaikan" },
  // Tenant subscription lifecycle.
  trial: { tone: "warning", label: "Trial" },
  aktif: { tone: "success", label: "Aktif" },
  ditangguhkan: { tone: "danger", label: "Ditangguhkan" },
  berhenti: { tone: "neutral", label: "Berhenti" },
  // Residents.
  keluar: { tone: "neutral", label: "Keluar" },
  // Contracts.
  berakhir: { tone: "neutral", label: "Berakhir" },
  diputus: { tone: "danger", label: "Diputus" },
  // Maintenance requests.
  open: { tone: "warning", label: "Baru" },
  in_progress: { tone: "info", label: "Dikerjakan" },
  resolved: { tone: "success", label: "Selesai" },
};

export interface StatusBadgeProps {
  /** The entity status to render. */
  status: EntityStatus;
  /** Optional extra classes merged onto the badge. */
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { tone, label } = STATUS_MAP[status];
  return (
    <Badge className={cn(TONE_CLASS[tone], className)} data-status={status}>
      {label}
    </Badge>
  );
}

/**
 * Resolve the tone + label for a status without rendering. Exposed for tests
 * and for callers that need the tone (e.g. matching chart/row colors).
 */
export function getStatusStyle(status: EntityStatus): StatusStyle {
  return STATUS_MAP[status];
}

/** All entity statuses, useful for iteration in tests and filters. */
export const ENTITY_STATUSES = Object.keys(STATUS_MAP) as EntityStatus[];
