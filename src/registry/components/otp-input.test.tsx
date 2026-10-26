import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OtpInput } from "./otp-input";

describe("OtpInput", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("filters pasted digits, fills each slot, and submits the code", () => {
    const onValueChange = vi.fn();
    const onComplete = vi.fn();
    const { container } = render(
      <form data-testid="form">
        <OtpInput
          label="Verification code"
          name="code"
          length={4}
          onValueChange={onValueChange}
          onComplete={onComplete}
        />
      </form>,
    );
    const input = screen.getByRole("textbox", { name: "Verification code" });
    expect(input).toHaveAttribute("autocomplete", "one-time-code");
    expect(input).toHaveAttribute("inputmode", "numeric");
    expect(container.querySelectorAll('[data-slot="otp-input-slot"]')).toHaveLength(4);

    fireEvent.change(input, { target: { value: "12" } });
    expect(onValueChange).toHaveBeenLastCalledWith("12");
    expect(onComplete).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "1a2-34 99" } });
    expect(input).toHaveValue("1234");
    expect(onComplete).toHaveBeenCalledWith("1234");
    expect(container.querySelectorAll('[data-slot="otp-input-slot"][data-filled]')).toHaveLength(4);
    const form = screen.getByTestId("form");
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected a form");
    expect(new FormData(form).get("code")).toBe("1234");
  });

  it("uppercases alphanumeric codes and drops symbols", () => {
    render(<OtpInput label="Code" length={8} mode="alphanumeric" defaultValue="ab-12_cd!34xyz" />);
    const input = screen.getByRole("textbox", { name: "Code" });
    expect(input).toHaveValue("AB12CD34");
    expect(input).toHaveAttribute("inputmode", "text");
  });

  it("highlights the next empty slot while focused", () => {
    const { container } = render(<OtpInput label="Code" length={6} defaultValue="12" />);
    expect(container.querySelector('[data-slot="otp-input-slot"][data-active]')).toBeNull();
    fireEvent.focus(screen.getByRole("textbox", { name: "Code" }));
    const slots = container.querySelectorAll('[data-slot="otp-input-slot"]');
    expect(slots[2]).toHaveAttribute("data-active");
    expect(slots[2].querySelector('[data-slot="otp-input-caret"]')).not.toBeNull();
  });

  it("waits for controlled updates and exposes invalid and disabled states", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <OtpInput label="Code" length={4} value="12" onValueChange={onValueChange} />,
    );
    const input = screen.getByRole("textbox", { name: "Code" });
    fireEvent.change(input, { target: { value: "123" } });
    expect(onValueChange).toHaveBeenLastCalledWith("123");
    expect(input).toHaveValue("12");
    rerender(<OtpInput label="Code" length={4} value="123" invalid disabled onValueChange={onValueChange} />);
    expect(input).toHaveValue("123");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toBeDisabled();
  });

  it("keeps focus and hides the highlight on success", () => {
    const { container, rerender } = render(<OtpInput label="Code" length={4} defaultValue="1234" />);
    const input = screen.getByRole("textbox", { name: "Code" });
    act(() => input.focus());
    expect(container.querySelector('[data-slot="otp-input-highlight"]')).not.toBeNull();
    rerender(<OtpInput label="Code" length={4} defaultValue="1234" success />);
    expect(input).toHaveFocus();
    expect(container.querySelector('[data-slot="otp-input"]')).toHaveAttribute("data-success", "true");
    expect(container.querySelector('[data-slot="otp-input-highlight"]')).toBeNull();
  });

  it("splits the slots in half with a dash or custom separator", () => {
    const { container, rerender } = render(<OtpInput label="Code" length={6} />);
    expect(container.querySelector('[data-slot="otp-input-separator"]')).toBeNull();
    rerender(<OtpInput label="Code" length={6} separator />);
    const separator = container.querySelector('[data-slot="otp-input-separator"]');
    expect(separator).toHaveTextContent("-");
    expect(separator?.previousElementSibling).toBe(
      container.querySelectorAll('[data-slot="otp-input-slot"]')[2],
    );
    rerender(<OtpInput label="Code" length={8} separator="·" />);
    expect(container.querySelector('[data-slot="otp-input-separator"]')).toHaveTextContent("·");
    expect(container.querySelector('[data-slot="otp-input-separator"]')?.previousElementSibling).toBe(
      container.querySelectorAll('[data-slot="otp-input-slot"]')[3],
    );
  });

  it("rejects lengths other than 4, 6, or 8", () => {
    for (const length of [3, 5, 7, 9]) {
      // @ts-expect-error -- checks the runtime guard for untyped callers.
      expect(() => render(<OtpInput label="Code" length={length} />)).toThrow("4, 6, or 8");
    }
  });
});
