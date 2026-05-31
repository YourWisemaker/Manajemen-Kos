import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArrowRight } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { Button, buttonVariants } from "./button";

/**
 * Themed Button tests — Task 6.3
 * ------------------------------
 * Verifies the brand variant contract (default is `primary`), that every
 * variant/size renders, and that the loading state prevents activation.
 *
 * Validates: Requirements 2.1, 2.2, 2.3
 */

const VARIANTS = ["primary", "accent", "outline-ink", "ghost", "danger"] as const;
const SIZES = ["sm", "md", "lg"] as const;

describe("Button default variant (Req 2.2)", () => {
  it("applies the primary (pandan green) variant when none is specified", () => {
    render(<Button>Simpan</Button>);
    const button = screen.getByRole("button", { name: "Simpan" });
    // The primary variant carries the pandan-green `bg-primary` token.
    expect(button).toHaveClass("bg-primary");
    expect(button).toHaveClass("text-primary-foreground");
  });

  it("buttonVariants() with no args resolves to the primary md classes", () => {
    // Guards the cva defaultVariants contract directly.
    const classes = buttonVariants();
    expect(classes).toContain("bg-primary");
    expect(classes).toContain("rounded-button");
  });
});

describe("Button variants and sizes render (Req 2.1)", () => {
  it.each(VARIANTS)("renders the %s variant without error", (variant) => {
    render(<Button variant={variant}>Aksi</Button>);
    expect(screen.getByRole("button", { name: "Aksi" })).toBeInTheDocument();
  });

  it.each(SIZES)("renders the %s size without error", (size) => {
    render(<Button size={size}>Aksi</Button>);
    expect(screen.getByRole("button", { name: "Aksi" })).toBeInTheDocument();
  });

  it("renders left and right Lucide icons", () => {
    render(
      <Button iconLeft={ArrowRight} iconRight={ArrowRight}>
        Lanjut
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Lanjut" });
    // Both icons render as Lucide svgs (1.5px stroke enforced globally).
    expect(button.querySelectorAll("svg.lucide")).toHaveLength(2);
  });
});

describe("Button loading state prevents activation (Req 2.3)", () => {
  it("is disabled and aria-busy while loading", () => {
    render(<Button loading>Menyimpan</Button>);
    const button = screen.getByRole("button", { name: "Menyimpan" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("shows a spinning Lucide indicator while loading", () => {
    render(<Button loading>Menyimpan</Button>);
    const button = screen.getByRole("button", { name: "Menyimpan" });
    const spinner = button.querySelector("svg.lucide.animate-spin");
    expect(spinner).not.toBeNull();
  });

  it("does not fire onClick while loading", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Menyimpan
      </Button>,
    );
    await user.click(screen.getByRole("button", { name: "Menyimpan" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("fires onClick normally when not loading", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Simpan</Button>);
    await user.click(screen.getByRole("button", { name: "Simpan" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not render left/right icons while loading (only the spinner)", () => {
    render(
      <Button loading iconLeft={ArrowRight} iconRight={ArrowRight}>
        Menyimpan
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Menyimpan" });
    // Exactly one svg (the spinner) is shown during loading.
    expect(button.querySelectorAll("svg.lucide")).toHaveLength(1);
    expect(button.querySelector("svg.lucide.animate-spin")).not.toBeNull();
  });
});
