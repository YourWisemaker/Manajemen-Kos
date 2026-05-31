"use client";

/**
 * Onboarding progress context — Task 11.1 / 11.2
 * ----------------------------------------------
 * A lightweight client context that persists the values entered across the
 * five onboarding step routes (Daftar → Pilih Paket → Buat Properti →
 * Hubungkan Pembayaran → Undang Staff). Because each step is its own route,
 * the entered data would otherwise be lost when the user navigates back or
 * forward; this provider keeps it in React state mirrored into `sessionStorage`
 * so progress survives client-side navigation (and a refresh) without a
 * backend.
 *
 * Mounted once in the (onboarding) route-group layout, it wraps every step.
 * Steps read their slice via {@link useOnboarding} and merge updates with
 * {@link OnboardingContextValue.update}.
 *
 * Requirements: 7.1, 7.3, 7.4
 */

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/** The persisted onboarding draft, one slice per wizard step. */
export interface OnboardingState {
  /** Step 1 — account confirmation. */
  daftar: { name: string };
  /** Step 2 — selected plan id (starter | pro | enterprise). */
  paket: { selectedPlan: string };
  /** Step 3 — first property draft (raw string inputs, pre-validation). */
  properti: {
    name: string;
    address: string;
    city: string;
    totalRooms: string;
    roomType: string;
    monthlyPrice: string;
  };
  /** Step 4 — payment gateway connection stub. */
  pembayaran: { gateway: string; connected: boolean };
  /** Step 5 — staff email invites (each row carries a stable id for keys). */
  tim: { emails: StaffInvite[] };
}

/** A single staff-invite row: a stable id plus the entered email value. */
export interface StaffInvite {
  id: string;
  value: string;
}

/** Generate a stable id for a new staff-invite row (client-side only). */
export function newInviteId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `invite-${Math.random().toString(36).slice(2)}`;
}

/** The default empty draft used before the user enters anything. */
export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  daftar: { name: "" },
  paket: { selectedPlan: "pro" },
  properti: {
    name: "",
    address: "",
    city: "",
    totalRooms: "",
    roomType: "",
    monthlyPrice: "",
  },
  pembayaran: { gateway: "xendit", connected: false },
  tim: { emails: [{ id: "invite-0", value: "" }] },
};

/** The value exposed by {@link useOnboarding}. */
export interface OnboardingContextValue {
  /** The current onboarding draft. */
  state: OnboardingState;
  /**
   * Merge a partial update into a single step's slice. Other slices are
   * preserved untouched.
   */
  update: <K extends keyof OnboardingState>(
    step: K,
    patch: Partial<OnboardingState[K]>,
  ) => void;
  /** Clear the draft (used after the wizard completes). */
  reset: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

/** The `sessionStorage` key the draft is mirrored into. */
const STORAGE_KEY = "koskita.onboarding";

/** Read any previously-saved draft from `sessionStorage` (client-only). */
function readStored(): OnboardingState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OnboardingState>;
    // Merge over the defaults so a partial/older shape never yields undefined
    // slices when new fields are added.
    return {
      daftar: { ...DEFAULT_ONBOARDING_STATE.daftar, ...parsed.daftar },
      paket: { ...DEFAULT_ONBOARDING_STATE.paket, ...parsed.paket },
      properti: { ...DEFAULT_ONBOARDING_STATE.properti, ...parsed.properti },
      pembayaran: { ...DEFAULT_ONBOARDING_STATE.pembayaran, ...parsed.pembayaran },
      tim: { ...DEFAULT_ONBOARDING_STATE.tim, ...parsed.tim },
    };
  } catch {
    return null;
  }
}

/**
 * Provides the onboarding draft to its subtree, hydrating from
 * `sessionStorage` on mount and persisting on every change.
 */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(DEFAULT_ONBOARDING_STATE);

  // Hydrate from sessionStorage after mount to avoid SSR/CSR mismatch.
  useEffect(() => {
    const stored = readStored();
    if (stored) setState(stored);
  }, []);

  // Persist on every change (client-only).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage may be unavailable (private mode / quota); the draft still
      // lives in React state for the current session, so we ignore failures.
    }
  }, [state]);

  const update = useCallback<OnboardingContextValue["update"]>((step, patch) => {
    setState((prev) => ({ ...prev, [step]: { ...prev[step], ...patch } }));
  }, []);

  const reset = useCallback(() => {
    // Restoring the default draft is sufficient to clear progress: the persist
    // effect mirrors the default (empty) draft back into sessionStorage, so a
    // later visit hydrates to a fresh wizard.
    setState(DEFAULT_ONBOARDING_STATE);
  }, []);

  const value = useMemo<OnboardingContextValue>(
    () => ({ state, update, reset }),
    [state, update, reset],
  );

  return (
    <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
  );
}

/**
 * Read and update the onboarding draft.
 *
 * @throws if called outside an {@link OnboardingProvider}.
 */
export function useOnboarding(): OnboardingContextValue {
  const value = useContext(OnboardingContext);
  if (value === null) {
    throw new Error("useOnboarding harus dipakai di dalam <OnboardingProvider>.");
  }
  return value;
}
