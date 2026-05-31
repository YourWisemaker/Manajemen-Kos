import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { scrollFirstErrorIntoView, useZodForm } from "./use-zod-form";

/**
 * useZodForm tests — Task 4.3
 * ---------------------------
 * Verifies the standard validation UX wired by the helper: submission is
 * blocked on invalid data, allowed on valid data, errors clear when a field
 * becomes valid, and the first invalid field is scrolled into view on a failed
 * submit.
 *
 * Requirements: 18.1, 18.2
 */

const schema = z.object({
  name: z.string().min(1, { message: "Wajib diisi." }),
  age: z.coerce.number().min(0, { message: "Tidak boleh negatif." }),
});

/**
 * RHF's `formState` is a proxy that only subscribes to a field (e.g. `errors`)
 * when it is read during render. Reading it inside the `renderHook` callback
 * ensures the hook re-renders as `errors` change.
 */
function useTestForm(defaultValues?: { name: string; age: number }) {
  const form = useZodForm({ schema, defaultValues });
  void form.formState.errors;
  return form;
}

describe("useZodForm (Req 18.1, 18.2)", () => {
  it("blocks submission and reports errors when data is invalid", async () => {
    const onValid = vi.fn();
    const { result } = renderHook(() => useTestForm({ name: "", age: 0 }));

    const submit = result.current.makeSubmitHandler(onValid);
    await act(async () => {
      await submit();
    });

    expect(onValid).not.toHaveBeenCalled();
    expect(result.current.formState.errors.name?.message).toBe("Wajib diisi.");
  });

  it("allows submission when data is valid", async () => {
    const onValid = vi.fn();
    const { result } = renderHook(() => useTestForm({ name: "Kos Bunga", age: 2 }));

    const submit = result.current.makeSubmitHandler(onValid);
    await act(async () => {
      await submit();
    });

    expect(onValid).toHaveBeenCalledTimes(1);
    expect(onValid.mock.calls[0][0]).toMatchObject({ name: "Kos Bunga", age: 2 });
  });

  it("clears a field error once its value becomes valid (Req 18.2)", async () => {
    const { result } = renderHook(() => useTestForm({ name: "", age: 0 }));

    // Trigger validation (as a submit would) to surface the error.
    await act(async () => {
      await result.current.trigger("name");
    });
    await waitFor(() => {
      expect(result.current.formState.errors.name).toBeDefined();
    });

    // Provide a valid value and re-validate — the error clears.
    await act(async () => {
      result.current.setValue("name", "Melati", { shouldValidate: true });
    });
    await waitFor(() => {
      expect(result.current.formState.errors.name).toBeUndefined();
    });
  });

  it("exposes the RHF surface plus the submit-handler helper", () => {
    const { result } = renderHook(() => useTestForm());
    expect(typeof result.current.makeSubmitHandler).toBe("function");
    expect(typeof result.current.handleSubmit).toBe("function");
    expect(typeof result.current.register).toBe("function");
  });
});

describe("scrollFirstErrorIntoView", () => {
  it("scrolls the first errored field into view", () => {
    document.body.innerHTML = `
      <input name="name" />
      <input name="age" />
    `;
    const nameEl = document.querySelector<HTMLInputElement>('[name="name"]');
    const scrollSpy = vi.fn();
    if (nameEl) nameEl.scrollIntoView = scrollSpy;

    scrollFirstErrorIntoView({ name: { message: "Wajib diisi." } });

    expect(scrollSpy).toHaveBeenCalledTimes(1);
  });

  it("no-ops safely when there are no errors", () => {
    document.body.innerHTML = `<input name="name" />`;
    expect(() => scrollFirstErrorIntoView({})).not.toThrow();
  });
});
