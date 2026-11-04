import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Switch } from "./switch";

describe("Switch", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("toggles from the switch and its label without submitting the form", () => {
    const onCheckedChange = vi.fn();
    const onSubmit = vi.fn((event) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Switch label="Notifications" onCheckedChange={onCheckedChange} />
      </form>,
    );
    const control = screen.getByRole("switch", { name: "Notifications" });
    expect(control).toHaveAttribute("aria-checked", "false");
    fireEvent.click(control);
    expect(control).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByText("Notifications"));
    expect(control).toHaveAttribute("aria-checked", "false");
    expect(onCheckedChange.mock.calls).toEqual([[true], [false]]);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("waits for the caller to update controlled state", () => {
    const onCheckedChange = vi.fn();
    const { rerender } = render(
      <Switch aria-label="Dark mode" checked={false} onCheckedChange={onCheckedChange} />,
    );
    const control = screen.getByRole("switch", { name: "Dark mode" });
    fireEvent.click(control);
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);
    expect(control).toHaveAttribute("aria-checked", "false");
    rerender(<Switch aria-label="Dark mode" checked onCheckedChange={onCheckedChange} />);
    expect(control).toHaveAttribute("aria-checked", "true");
  });

  it("swaps the visible thumb icon and ignores disabled presses", () => {
    const onCheckedChange = vi.fn();
    render(
      <Switch
        aria-label="Theme"
        defaultChecked
        thumbIcons={{ checked: <svg data-icon="moon" />, unchecked: <svg data-icon="sun" /> }}
      />,
    );
    expect(document.querySelectorAll('[data-slot="switch-icon"]')).toHaveLength(2);
    expect(document.querySelector('[data-icon="moon"]')).toBeInTheDocument();

    cleanup();
    render(<Switch aria-label="Sync" disabled onCheckedChange={onCheckedChange} />);
    const control = screen.getByRole("switch", { name: "Sync" });
    fireEvent.click(control);
    expect(onCheckedChange).not.toHaveBeenCalled();
    expect(control).toHaveAttribute("aria-checked", "false");
  });
});
