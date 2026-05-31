/**
 * Brand component barrel — Task 7.4
 * ---------------------------------
 * Single entry point for the `components/brand` library so surfaces can import
 * every brand building block (and its exported types/helpers) from one place:
 *
 *   import { RupiahText, StatusBadge, BrandMark } from "@/components/brand";
 *
 * Requirements: 2.4, 2.5, 2.6, 2.7, 2.8
 */

export { BrandMark, type BrandMarkProps } from "./brand-mark";
export { type EmptyIllustration, EmptyState, type EmptyStateProps } from "./empty-state";
export {
  computeOccupancyPct,
  OccupancyMeter,
  type OccupancyMeterProps,
} from "./occupancy-meter";
export {
  PaymentChannelCard,
  type PaymentChannelCardProps,
} from "./payment-channel-card";
export { RupiahText, type RupiahTextProps } from "./rupiah-text";
export { StatCard, type StatCardProps } from "./stat-card";
export {
  ENTITY_STATUSES,
  type EntityStatus,
  getStatusStyle,
  StatusBadge,
  type StatusBadgeProps,
  type StatusTone,
} from "./status-badge";
export { WizardStepper, type WizardStepperProps } from "./wizard-stepper";
