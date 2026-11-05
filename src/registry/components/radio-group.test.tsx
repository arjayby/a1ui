import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RadioGroup, RadioGroupItem } from "./radio-group";

const dots = () => document.querySelectorAll('[data-slot="radio-group-dot"]');

describe("RadioGroup", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("moves one dot between options from radios and labels, and links descriptions", () => {
    const onValueChange = vi.fn();
    render(
      <RadioGroup aria-label="Plan" defaultValue="free" duration={0} onValueChange={onValueChange}>
        <RadioGroupItem value="free" label="Free" description="For side projects" />
        <RadioGroupItem value="pro" label="Pro" description="For teams" />
      </RadioGroup>,
    );
    expect(screen.getByRole("radiogroup", { name: "Plan" })).toBeInTheDocument();
    const free = screen.getByRole("radio", { name: "Free" });
    const pro = screen.getByRole("radio", { name: "Pro" });
    expect(pro).toHaveAccessibleDescription("For teams");
    expect(free).toHaveAttribute("aria-checked", "true");
    expect(dots()).toHaveLength(1);
    expect(free).toContainElement(dots()[0] as HTMLElement);

    fireEvent.click(pro);
    expect(pro).toHaveAttribute("aria-checked", "true");
    expect(free).toHaveAttribute("aria-checked", "false");
    expect(dots()).toHaveLength(1);
    expect(pro).toContainElement(dots()[0] as HTMLElement);

    fireEvent.click(screen.getByText("Free"));
    expect(free).toHaveAttribute("aria-checked", "true");
    expect(onValueChange.mock.calls).toEqual([["pro"], ["free"]]);
  });

  it("follows a controlled value and submits its name with a form", () => {
    function Controlled() {
      const [value, setValue] = useState("monthly");
      return (
        <form data-testid="form">
          <RadioGroup aria-label="Billing" name="billing" value={value} onValueChange={setValue}>
            <RadioGroupItem value="monthly" label="Monthly" />
            <RadioGroupItem value="yearly" label="Yearly" />
          </RadioGroup>
          <span data-testid="value">{value}</span>
        </form>
      );
    }
    render(<Controlled />);
    fireEvent.click(screen.getByRole("radio", { name: "Yearly" }));
    expect(screen.getByTestId("value")).toHaveTextContent("yearly");
    expect(screen.getByRole("radio", { name: "Yearly" })).toHaveAttribute("aria-checked", "true");
    const form = screen.getByTestId("form") as HTMLFormElement;
    expect(new FormData(form).get("billing")).toBe("yearly");
  });

  it("renders the card variant with one sliding highlight and skips disabled options", () => {
    const onValueChange = vi.fn();
    render(
      <RadioGroup aria-label="Plan" variant="card" defaultValue="free" onValueChange={onValueChange}>
        <RadioGroupItem value="free" label="Free" description="For side projects" />
        <RadioGroupItem value="enterprise" label="Enterprise" disabled />
        <RadioGroupItem value="pro" label="Pro" />
      </RadioGroup>,
    );
    const highlights = () => document.querySelectorAll('[data-slot="radio-group-highlight"]');
    expect(screen.getByRole("radiogroup")).toHaveAttribute("data-variant", "card");
    expect(highlights()).toHaveLength(1);

    fireEvent.click(screen.getByText("Enterprise"));
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: "Enterprise" })).toHaveAttribute("aria-disabled", "true");

    fireEvent.click(screen.getByText("Pro"));
    expect(onValueChange).toHaveBeenCalledWith("pro");
    expect(highlights()).toHaveLength(1);
    expect(screen.getByText("Pro").closest('[data-slot="radio-group-item"]')).toContainElement(
      highlights()[0] as HTMLElement,
    );
  });

  it("starts empty, uses aria-label without a visible label, and ignores a disabled group", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <RadioGroup aria-label="Size" onValueChange={onValueChange}>
        <RadioGroupItem value="s" aria-label="Small" />
        <RadioGroupItem value="m" aria-label="Medium" />
      </RadioGroup>,
    );
    expect(dots()).toHaveLength(0);
    fireEvent.click(screen.getByRole("radio", { name: "Medium" }));
    expect(dots()).toHaveLength(1);

    rerender(
      <RadioGroup aria-label="Size" disabled onValueChange={onValueChange}>
        <RadioGroupItem value="s" aria-label="Small" />
        <RadioGroupItem value="m" aria-label="Medium" />
      </RadioGroup>,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Small" }));
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });
});
