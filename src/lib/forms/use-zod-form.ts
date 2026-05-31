"use client";

/**
 * RHF + Zod form helper — Task 4.3
 * --------------------------------
 * `useZodForm` is a thin, typed wrapper around react-hook-form's `useForm`
 * pre-wired with the Zod resolver and the project's standard validation UX:
 *
 *   - Submission is blocked while the data is invalid (RHF + zodResolver).
 *   - Validation mode is `onTouched` with `reValidateMode: "onChange"`, so a
 *     field is validated once it has been touched/submitted and then
 *     re-validates on every change — clearing its error as soon as the value
 *     becomes valid (Req 18.2).
 *   - On a failed submit, RHF focuses the first invalid field
 *     (`shouldFocusError`); {@link useZodForm} additionally scrolls that field
 *     into view (Req 18.1) via {@link scrollFirstErrorIntoView}.
 *
 * Generics flow from the Zod schema, so `register`, `handleSubmit`, `errors`,
 * and the resolved values are all typed from a single source of truth.
 *
 * Inline per-field error rendering is the responsibility of the field
 * components (built later); this hook only supplies the wired-up form object
 * and the submit wrapper. See the usage pattern in the file footer.
 *
 * Requirements: 18.1, 18.2
 */

import { zodResolver } from "@hookform/resolvers/zod";
import {
  type FieldValues,
  type SubmitErrorHandler,
  type SubmitHandler,
  type UseFormProps,
  type UseFormReturn,
  useForm,
} from "react-hook-form";
import type { z } from "zod";

/**
 * Scroll the first field with a reported error into view. Reads the ordered
 * error keys from RHF's `formState.errors` and looks the element up by `name`.
 * Safe to call in non-DOM environments (it no-ops when `document` is absent).
 *
 * @param errors - The `formState.errors` object from react-hook-form.
 * @param container - Optional root to scope the field lookup (defaults to `document`).
 */
export function scrollFirstErrorIntoView(
  errors: FieldValues,
  container?: HTMLElement | null,
): void {
  if (typeof document === "undefined") return;

  const firstKey = Object.keys(errors)[0];
  if (!firstKey) return;

  const root: ParentNode = container ?? document;
  // `CSS.escape` may be absent in some test environments (jsdom); fall back to
  // a minimal escape for the attribute selector.
  const escaped =
    typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape(firstKey)
      : firstKey.replace(/["\\]/g, "\\$&");
  const field = root.querySelector<HTMLElement>(`[name="${escaped}"]`);
  if (!field) return;

  if (typeof field.scrollIntoView === "function") {
    field.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

/** Options for {@link useZodForm}: a Zod schema plus standard `useForm` props. */
export type UseZodFormProps<TSchema extends z.ZodType> = {
  /** The Zod schema whose output type drives the form's value types. */
  schema: TSchema;
} & Omit<UseFormProps<z.input<TSchema>>, "resolver">;

/**
 * The value type RHF works with for a given schema. With a resolver, the form
 * inputs are the schema's input type while submission yields the output type.
 */
export type ZodFormReturn<TSchema extends z.ZodType> = UseFormReturn<z.input<TSchema>>;

/**
 * Create a react-hook-form instance bound to a Zod schema with the project's
 * standard validation UX.
 *
 * @typeParam TSchema - The Zod schema type.
 * @param props - `{ schema, ...useFormProps }`. `mode`/`reValidateMode`
 *   default to the standard UX but can be overridden per form.
 * @returns The full `UseFormReturn` plus a {@link makeSubmitHandler} helper.
 */
export function useZodForm<TSchema extends z.ZodType>({
  schema,
  mode = "onTouched",
  reValidateMode = "onChange",
  shouldFocusError = true,
  ...formProps
}: UseZodFormProps<TSchema>) {
  const form = useForm<z.input<TSchema>>({
    // Cast bridges the input/output variance between RHF and the Zod resolver.
    resolver: zodResolver(schema) as UseFormProps<z.input<TSchema>>["resolver"],
    mode,
    reValidateMode,
    shouldFocusError,
    ...formProps,
  });

  /**
   * Wrap `handleSubmit` so that, on validation failure, the first invalid
   * field is scrolled into view (RHF already focuses it). An optional caller
   * `onInvalid` handler still runs.
   */
  const makeSubmitHandler = (
    onValid: SubmitHandler<z.input<TSchema>>,
    onInvalid?: SubmitErrorHandler<z.input<TSchema>>,
  ) =>
    form.handleSubmit(onValid, (errors, event) => {
      scrollFirstErrorIntoView(errors as FieldValues);
      onInvalid?.(errors, event);
    });

  return { ...form, makeSubmitHandler };
}

/**
 * Usage pattern (field components render their own inline errors):
 *
 * ```tsx
 * const { register, makeSubmitHandler, formState: { errors } } = useZodForm({
 *   schema: roomSchema,
 *   defaultValues: { number: "", monthlyPrice: "" },
 * });
 *
 * const onSubmit = makeSubmitHandler((values) => save(values));
 *
 * <form onSubmit={onSubmit} noValidate>
 *   <input {...register("number")} aria-invalid={!!errors.number} />
 *   {errors.number && <p role="alert">{errors.number.message}</p>}
 *   <button type="submit">Simpan</button>
 * </form>
 * ```
 *
 * Notes:
 *  - Keep `name` attributes equal to the schema keys so error focus/scroll can
 *    locate the element.
 *  - Use `noValidate` on the `<form>` so Zod (not the browser) drives messages.
 */
