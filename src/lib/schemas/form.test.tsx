import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { submitHandler, useZodForm } from "./form";
import { roomSchema } from "./property";

/**
 * useZodForm helper tests — Task 4.3
 * ----------------------------------
 * Renders a small real form using the helper to verify the design's
 * validation UX: invalid submits are blocked and surface inline errors under
 * each field; once a field becomes valid its error clears on change; valid
 * submits invoke the handler with parsed (normalized) output values.
 *
 * Requirements: 18.1, 18.2
 */

function RoomForm({
  onValid,
}: {
  onValid: (values: { number: string; monthlyPrice: number }) => void;
}) {
  const form = useZodForm(roomSchema, {
    defaultValues: { number: "", monthlyPrice: "" },
  });
  const { register, formState } = form;
  return (
    <form onSubmit={submitHandler(form, onValid)}>
      <input aria-label="number" {...register("number")} />
      {formState.errors.number ? (
        <p role="alert">{formState.errors.number.message}</p>
      ) : null}

      <input aria-label="monthlyPrice" {...register("monthlyPrice")} />
      {formState.errors.monthlyPrice ? (
        <p role="alert">{formState.errors.monthlyPrice.message}</p>
      ) : null}

      <button type="submit">Simpan</button>
    </form>
  );
}

describe("useZodForm (Req 18.1, 18.2)", () => {
  it("blocks submission and shows inline errors for invalid data", async () => {
    const user = userEvent.setup();
    const onValid = vi.fn();
    render(<RoomForm onValid={onValid} />);

    await user.click(screen.getByRole("button", { name: "Simpan" }));

    // Req 18.1: invalid data must not invoke the valid handler, and inline
    // error messages must render under the invalid fields.
    expect(onValid).not.toHaveBeenCalled();
    const alerts = await screen.findAllByRole("alert");
    expect(alerts.length).toBeGreaterThanOrEqual(1);
  });

  it("clears a field error on change once it becomes valid (re-validate after submit)", async () => {
    const user = userEvent.setup();
    const onValid = vi.fn();
    render(<RoomForm onValid={onValid} />);

    // First submit marks the form submitted and shows the number error.
    await user.click(screen.getByRole("button", { name: "Simpan" }));
    await screen.findAllByRole("alert");

    // Req 18.2: typing a valid value re-validates on change and clears the error.
    await user.type(screen.getByLabelText("number"), "A-1");
    await waitFor(() => {
      expect(screen.queryByText(/tidak boleh kosong/i)).not.toBeInTheDocument();
    });
  });

  it("invokes the valid handler with parsed (normalized) values", async () => {
    const user = userEvent.setup();
    const captured: { number: string; monthlyPrice: number }[] = [];
    function Wrapper() {
      const [done, setDone] = useState(false);
      return (
        <>
          <RoomForm
            onValid={(values) => {
              captured.push(values);
              setDone(true);
            }}
          />
          {done ? <span data-testid="done" /> : null}
        </>
      );
    }
    render(<Wrapper />);

    await user.type(screen.getByLabelText("number"), " A-1 ");
    await user.type(screen.getByLabelText("monthlyPrice"), "Rp 750.000");
    await user.click(screen.getByRole("button", { name: "Simpan" }));

    await screen.findByTestId("done");
    expect(captured[0]).toMatchObject({ number: "A-1", monthlyPrice: 750000 });
  });
});
