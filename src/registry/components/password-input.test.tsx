import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PasswordInput } from "./password-input";

const rules = () => screen.getAllByRole("listitem").map((item) => item.getAttribute("data-met") === "true");
const openRequirements = () => fireEvent.click(screen.getByRole("button", { name: "Password requirements" }));

describe("PasswordInput", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("checks each rule and rates the strength as the password changes", () => {
    render(<PasswordInput label="Password" />);
    const input = screen.getByLabelText("Password");
    const root = input.closest('[data-slot="password-input"]');
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveAttribute("autocomplete", "new-password");
    expect(root).not.toHaveAttribute("data-strength");
    expect(screen.queryByRole("list", { name: "Requirements" })).not.toBeInTheDocument();
    openRequirements();
    expect(rules()).toEqual([false, false, false, false]);

    fireEvent.change(input, { target: { value: "abc" } });
    expect(root).toHaveAttribute("data-strength", "weak");
    fireEvent.change(input, { target: { value: "abcDefgh" } });
    expect(rules()).toEqual([true, true, false, false]);
    expect(root).toHaveAttribute("data-strength", "fair");
    fireEvent.change(input, { target: { value: "abcDefgh1" } });
    expect(root).toHaveAttribute("data-strength", "good");
    fireEvent.change(input, { target: { value: "abcDefgh1!" } });
    expect(rules()).toEqual([true, true, true, true]);
    expect(root).toHaveAttribute("data-strength", "strong");
    expect(screen.getByText("Strong")).toHaveAttribute("data-slot", "password-input-strength");
    expect(input).toHaveAccessibleDescription("Password strength: Strong. Meets every requirement.");
  });

  it("shows and hides the password without moving focus", () => {
    render(<PasswordInput label="Password" defaultValue="secret" />);
    const input = screen.getByLabelText("Password");
    input.focus();
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("blocks form submission until every rule passes", () => {
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    render(
      <form data-testid="form" onSubmit={(event) => onSubmit(event.nativeEvent)}>
        <PasswordInput label="Password" name="password" defaultValue="weak" />
      </form>,
    );
    const input = screen.getByLabelText<HTMLInputElement>("Password");
    const form = screen.getByTestId<HTMLFormElement>("form");
    expect(input.validity.valid).toBe(false);

    let valid = true;
    act(() => {
      valid = form.checkValidity();
    });
    expect(valid).toBe(false);
    expect(input).toHaveAttribute("aria-invalid", "true");
    // A failed submit opens the requirements without moving focus out of the input.
    expect(screen.getByText("A number").closest("li")).toHaveClass("text-destructive");
    expect(input).toHaveFocus();
    expect(input).toHaveAccessibleDescription(
      "Password strength: Weak. Still needs: At least 8 characters, Upper and lowercase letters, A number, A symbol.",
    );

    fireEvent.change(input, { target: { value: "Weak-but-long1" } });
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(form.checkValidity()).toBe(true);
    fireEvent.submit(form);
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(new FormData(form).get("password")).toBe("Weak-but-long1");
  });

  it("accepts custom rules and controlled values", () => {
    const onValueChange = vi.fn();
    const custom = [{ label: "At least 12 characters", test: (value: string) => value.length >= 12 }];
    const { rerender } = render(
      <PasswordInput label="Password" rules={custom} value="short" onValueChange={onValueChange} />,
    );
    const input = screen.getByLabelText("Password");
    openRequirements();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    fireEvent.change(input, { target: { value: "long enough pass" } });
    expect(onValueChange).toHaveBeenLastCalledWith("long enough pass");
    expect(input).toHaveValue("short");
    rerender(
      <PasswordInput
        label="Password"
        rules={custom}
        value="long enough pass"
        onValueChange={onValueChange}
      />,
    );
    expect(rules()).toEqual([true]);
  });
});
