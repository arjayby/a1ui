import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { ValidatedInput } from "./validated-input";

const email = z.string().min(1, "Enter your email address.").pipe(z.email("Enter a valid email address."));

describe("ValidatedInput", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("waits for blur after an edit, then validates on every change", () => {
    render(<ValidatedInput label="Email" schema={email} description="For receipts." />);
    const input = screen.getByRole("textbox", { name: "Email" });
    expect(input).toHaveAccessibleDescription("For receipts.");

    fireEvent.blur(input);
    expect(input).not.toHaveAttribute("aria-invalid");

    fireEvent.change(input, { target: { value: "ada@" } });
    expect(input).not.toHaveAttribute("aria-invalid");
    fireEvent.blur(input);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Enter a valid email address. For receipts.");

    fireEvent.change(input, { target: { value: "" } });
    expect(screen.getByText("Enter your email address.")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "ada@example.com" } });
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input.closest('[data-slot="validated-input"]')).toHaveAttribute("data-valid", "true");
  });

  it("blocks form submission and reveals the schema error", () => {
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    render(
      <form data-testid="form" onSubmit={(event) => onSubmit(event.nativeEvent)}>
        <ValidatedInput label="Email" name="email" schema={email} />
      </form>,
    );
    const input = screen.getByRole<HTMLInputElement>("textbox", { name: "Email" });
    const form = screen.getByTestId<HTMLFormElement>("form");
    expect(input.validationMessage).toBe("Enter your email address.");

    let valid = true;
    act(() => {
      valid = form.checkValidity();
    });
    expect(valid).toBe(false);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Enter your email address.")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "ada@example.com" } });
    expect(input.validationMessage).toBe("");
    expect(form.checkValidity()).toBe(true);
    fireEvent.submit(form);
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(new FormData(form).get("email")).toBe("ada@example.com");
  });

  it("supports controlled values", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <ValidatedInput label="Email" schema={email} value="ada" onValueChange={onValueChange} />,
    );
    const input = screen.getByRole("textbox", { name: "Email" });
    fireEvent.change(input, { target: { value: "ada@" } });
    expect(onValueChange).toHaveBeenLastCalledWith("ada@");
    expect(input).toHaveValue("ada");
    rerender(<ValidatedInput label="Email" schema={email} value="ada@" onValueChange={onValueChange} />);
    expect(input).toHaveValue("ada@");
  });
});
