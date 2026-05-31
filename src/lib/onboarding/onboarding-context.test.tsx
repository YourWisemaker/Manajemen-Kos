import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_ONBOARDING_STATE,
  OnboardingProvider,
  useOnboarding,
} from "./onboarding-context";

/**
 * Onboarding progress context tests — Task 11.1 / 11.2
 * ----------------------------------------------------
 * Verifies the wizard's cross-route draft persistence contract: `useOnboarding`
 * throws outside its provider, `update` merges per-step slices without touching
 * the others, the draft is mirrored to `sessionStorage` (so back/forward
 * navigation keeps entered values), a fresh provider hydrates from storage, and
 * `reset` clears both state and storage.
 *
 * Validates: Requirements 7.1, 7.3, 7.4
 */

const STORAGE_KEY = "koskita.onboarding";

function wrapper({ children }: { children: ReactNode }) {
  return <OnboardingProvider>{children}</OnboardingProvider>;
}

afterEach(() => {
  window.sessionStorage.clear();
});

describe("useOnboarding (Req 7.1)", () => {
  it("throws a clear error when used outside the provider", () => {
    expect(() => renderHook(() => useOnboarding())).toThrow(
      "useOnboarding harus dipakai di dalam <OnboardingProvider>.",
    );
  });

  it("starts from the default empty draft", () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });
    expect(result.current.state).toEqual(DEFAULT_ONBOARDING_STATE);
  });
});

describe("update merges per-step slices (Req 7.3, 7.4)", () => {
  it("updates one slice without clobbering the others", () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    act(() => result.current.update("daftar", { name: "Pak Budi" }));
    act(() => result.current.update("paket", { selectedPlan: "enterprise" }));

    expect(result.current.state.daftar.name).toBe("Pak Budi");
    expect(result.current.state.paket.selectedPlan).toBe("enterprise");
    // Untouched slices keep their defaults.
    expect(result.current.state.properti).toEqual(DEFAULT_ONBOARDING_STATE.properti);
  });

  it("mirrors the draft into sessionStorage", () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    act(() => result.current.update("daftar", { name: "Bu Sri" }));

    const stored = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored.daftar.name).toBe("Bu Sri");
  });
});

describe("persistence across mounts (Req 7.3)", () => {
  it("hydrates a fresh provider from sessionStorage", () => {
    const first = renderHook(() => useOnboarding(), { wrapper });
    act(() => first.result.current.update("properti", { name: "Kos Mawar" }));
    first.unmount();

    // A brand-new provider should pick up the persisted draft on mount.
    const second = renderHook(() => useOnboarding(), { wrapper });
    expect(second.result.current.state.properti.name).toBe("Kos Mawar");
  });
});

describe("reset clears the draft (Req 7.6)", () => {
  it("restores defaults and persists the empty draft", () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    act(() => result.current.update("daftar", { name: "Pak Joko" }));
    act(() => result.current.reset());

    expect(result.current.state).toEqual(DEFAULT_ONBOARDING_STATE);
    // The mirrored draft is reset back to the defaults (a fresh wizard).
    const stored = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored).toEqual(DEFAULT_ONBOARDING_STATE);
  });
});
