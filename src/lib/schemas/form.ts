"use client";

/**
 * Reusable React Hook Form + Zod helper — Task 4.3
 * ------------------------------------------------
 * A thin, typed wrapper around `useForm` that wires the Zod resolver and the
 * validation UX the design requires, so every surface form behaves the same:
 *
 *   - Submission is blocked while data is invalid (RHF + zodResolver).
 *   - Inline errors render under each field (consumed via `formState.errors`).
 *   - On a failed submit, focus moves to and scrolls the first invalid field
 *     into view (`shouldFocusError` + a scroll fallback helper).
 *   - After the first submit, each field re-validates on change and its error
 *     clears once the value becomes valid (`reValidateMode: "onChange"`).
 *
 * The form is typed over the schema's *input* shape (so `defaultValues` can be
 * the raw, pre-transform values, e.g. a Rupiah string) while the valid-submit
 * handler receives the schema's parsed *output* shape (e.g. an integer IDR).
 *
 * Designed for Next.js App Router client components ("use client").
 *
 * Requirements: 18.1, 18.2
 */

import { zodResolver } from "@hookform/resolvers/zod";
import {
  type FieldValues,
  type Resolver,
  type SubmitErrorHandler,
  type SubmitHandler,
  type UseFormProps,
  type UseFormReturn,
  useForm,
} from "react-hook-form";
import type { input as ZodInput, output as ZodOutput, ZodType } from "zod";

/** A Zod schema whose input and output are both form-shaped objects. */
type FormSchema = ZodType<FieldValues, FieldValues>;

/**
 * Options for {@link useZodForm}: RHF's `UseFormProps` over the schema's input
 * shape, minus `resolver` (supplied here) and the validation-mode fields,
 * which default to design-aligned values (still overridable).
 */
export type UseZodFormProps<Schema extends FormSchema> = Omit<
  UseFormProps<ZodInput<Schema>>,
  "resolver" | "mode" | "reValidateMode"
> &
  Partial<Pick<UseFormProps<ZodInput<Schema>>, "mode" | "reValidateMode">>;

/** The RHF instance returned by {@link useZodForm} (input form, output submit). */
export type ZodFormReturn<Schema extends FormSchema> = UseFormReturn<
  ZodInput<Schema>,
  unknown,
  ZodOutput<Schema>
>;

/**
 * Create a typed RHF form bound to a Zod `schema`.
 *
 * Validation modes default to:
 *   - `mode: "onTouched"` — validate a field once it has been touched/blurred,
 *     giving early feedback without nagging on first keystroke.
 *   - `reValidateMode: "onChange"` — after the first submit, re-validate on
 *     every change so errors clear as soon as the value becomes valid (18.2).
 *   - `shouldFocusError: true` — focus the first invalid field on a failed
 *     submit (18.1).
 *
 * @param schema - The Zod schema describing the form's values.
 * @param props - Optional RHF options (e.g. `defaultValues`); validation-mode
 *   defaults may be overridden.
 */
export function useZodForm<Schema extends FormSchema>(
  schema: Schema,
  props: UseZodFormProps<Schema> = {},
): ZodFormReturn<Schema> {
  return useForm<ZodInput<Schema>, unknown, ZodOutput<Schema>>({
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldFocusError: true,
    ...props,
    resolver: zodResolver(schema) as Resolver<ZodInput<Schema>, unknown>,
  });
}

/**
 * Scroll the first invalid field into view as a fallback for browsers/elements
 * where RHF's native `focus()` does not auto-scroll (e.g. custom controls).
 * Pair with `handleSubmit(onValid, scrollToFirstError())`.
 *
 * Requirement: 18.1 (scroll first invalid field into view)
 */
export function scrollToFirstError<
  TValues extends FieldValues,
>(): SubmitErrorHandler<TValues> {
  return (errors) => {
    const firstName = Object.keys(errors)[0];
    if (!firstName || typeof document === "undefined") {
      return;
    }
    const field = document.querySelector<HTMLElement>(`[name="${firstName}"]`);
    if (field && typeof field.scrollIntoView === "function") {
      field.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };
}

/**
 * Build the `onSubmit` handler for a Zod form: runs `onValid` (with parsed
 * output values) only when validation passes — submission is blocked
 * otherwise — and scrolls to the first invalid field on failure.
 *
 * @example
 *   const form = useZodForm(roomSchema);
 *   <form onSubmit={submitHandler(form, onValid)}>…</form>
 *
 * Requirements: 18.1, 18.2
 */
export function submitHandler<Schema extends FormSchema>(
  form: ZodFormReturn<Schema>,
  onValid: SubmitHandler<ZodOutput<Schema>>,
) {
  // `handleSubmit`'s first parameter is a conditional type over the transformed
  // values that TypeScript cannot resolve while `Schema` is still generic; the
  // concrete instantiation at each call site is correct, so we assert the type.
  const onValidArg = onValid as Parameters<typeof form.handleSubmit>[0];
  return form.handleSubmit(onValidArg, scrollToFirstError<ZodInput<Schema>>());
}
