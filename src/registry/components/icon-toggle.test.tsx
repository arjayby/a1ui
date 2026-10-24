import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { IconToggle } from "./icon-toggle";

describe("IconToggle", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("toggles both ways without submitting its parent form", async () => {
    const onPressedChange = vi.fn();
    const onSubmit = vi.fn((event) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <IconToggle label="Dark mode" duration={0} onPressedChange={onPressedChange} />
      </form>,
    );
    const button = screen.getByRole("button", { name: "Dark mode" });
    const path = button.querySelector("path");
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(path).toHaveAttribute("d", expect.stringMatching(/^M17\.25 12 C/));
    const sun = path?.getAttribute("d");

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(path).toHaveAttribute("d", expect.stringMatching(/^M21\.3647 13\.8647 C/)));
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "false");
    await waitFor(() => expect(path).toHaveAttribute("d", sun));
    expect(onPressedChange.mock.calls).toEqual([[true], [false]]);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("waits for the caller to update controlled state", async () => {
    const onPressedChange = vi.fn();
    const { rerender } = render(
      <IconToggle label="Dark mode" pressed={false} onPressedChange={onPressedChange} duration={0} />,
    );
    const button = screen.getByRole("button", { name: "Dark mode" });
    fireEvent.click(button);
    expect(onPressedChange).toHaveBeenLastCalledWith(true);
    expect(button).toHaveAttribute("aria-pressed", "false");

    rerender(<IconToggle label="Dark mode" pressed onPressedChange={onPressedChange} duration={0} />);
    expect(button).toHaveAttribute("aria-pressed", "true");
    await waitFor(() =>
      expect(button.querySelector("path")).toHaveAttribute(
        "d",
        expect.stringMatching(/^M21\.3647 13\.8647 C/),
      ),
    );
    fireEvent.click(button);
    expect(onPressedChange).toHaveBeenLastCalledWith(false);
  });

  it("renders the initial custom icon and prevents disabled toggles", () => {
    const onPressedChange = vi.fn();
    render(
      <IconToggle
        label="Toggle details"
        paths={[["M12 5 L12 19", "M5 12 L19 12"]]}
        defaultPressed
        disabled
        onPressedChange={onPressedChange}
      />,
    );
    const button = screen.getByRole("button", { name: "Toggle details" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button.querySelector("path")).toHaveAttribute("d", "M5 12 L19 12");
    fireEvent.click(button);
    expect(onPressedChange).not.toHaveBeenCalled();
  });
});
