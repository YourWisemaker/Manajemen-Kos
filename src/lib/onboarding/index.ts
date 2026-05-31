/**
 * Onboarding state barrel — Task 11
 * ---------------------------------
 * Single import surface for the onboarding progress context shared across the
 * five wizard step routes.
 *
 * Requirements: 7.1, 7.3, 7.4
 */

export {
  DEFAULT_ONBOARDING_STATE,
  newInviteId,
  type OnboardingContextValue,
  OnboardingProvider,
  type OnboardingState,
  type StaffInvite,
  useOnboarding,
} from "./onboarding-context";
