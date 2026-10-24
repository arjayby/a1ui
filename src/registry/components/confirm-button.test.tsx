import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConfirmButton } from "./confirm-button";

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function advance(milliseconds: number) {
  act(() => vi.advanceTimersByTime(milliseconds));
}

describe("ConfirmButton", () => {
  it.each(["blur", "slide", "flip"] as const)("shows a success check for the %s preset", (animation) => {
    render(<ConfirmButton onConfirm={() => {}} animation={animation} transitionDuration={0} />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-animation", animation);
    expect(button.querySelector("svg")).toBeNull();
    fireEvent.keyDown(button, { key: "Enter" });
    advance(1600);
    expect(button).toHaveAccessibleName("Confirmed");
    expect(button.querySelector('[data-slot="confirm-button-icon"] svg')).not.toBeNull();
  });

  it.each([" ", "Enter"])("requires a full %s hold and fires once until release", (key) => {
    const onConfirm = vi.fn();
    render(<ConfirmButton onConfirm={onConfirm} duration={1} />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.keyDown(button, { key });
    advance(500);
    expect(button).toHaveAttribute("data-state", "holding");
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.keyUp(button, { key });
    advance(1500);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(button).toHaveAttribute("data-state", "idle");

    fireEvent.keyDown(button, { key });
    advance(1100);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(button).toHaveAccessibleName("Confirmed");
    expect(screen.getByRole("status")).toHaveTextContent("Confirmed");
    fireEvent.keyDown(button, { key, repeat: true });
    fireEvent.click(button);
    advance(2000);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.keyUp(button, { key });
    expect(button).toHaveAccessibleName("Confirmed");
    fireEvent.keyDown(button, { key });
    advance(1900);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(button).toHaveAccessibleName("Confirmed");
    expect(screen.getByRole("status")).toHaveTextContent("Confirmed");
    fireEvent.keyUp(button, { key });
    advance(100);
    expect(button).toHaveAccessibleName("Hold to confirm");
    fireEvent.keyDown(button, { key });
    advance(1100);
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });

  it.each(["Escape", "blur", "window blur", "hidden", "disabled", "duration", "direction", "unmount"])(
    "cancels an active hold on %s",
    (reason) => {
      const onConfirm = vi.fn();
      const { rerender, unmount } = render(<ConfirmButton onConfirm={onConfirm} />);
      const button = screen.getByRole("button");
      fireEvent.keyDown(button, { key: " " });
      advance(750);
      switch (reason) {
        case "Escape":
          fireEvent.keyDown(button, { key: "Escape" });
          break;
        case "blur":
          fireEvent.blur(button);
          break;
        case "window blur":
          fireEvent(window, new Event("blur"));
          break;
        case "hidden":
          vi.spyOn(document, "hidden", "get").mockReturnValue(true);
          fireEvent(document, new Event("visibilitychange"));
          break;
        case "disabled":
          rerender(<ConfirmButton onConfirm={onConfirm} disabled />);
          break;
        case "duration":
          rerender(<ConfirmButton onConfirm={onConfirm} duration={2} />);
          break;
        case "direction":
          rerender(<ConfirmButton onConfirm={onConfirm} direction="up" />);
          break;
        case "unmount":
          unmount();
          break;
      }
      advance(3000);
      expect(onConfirm).not.toHaveBeenCalled();
      if (reason !== "unmount") expect(button).toHaveAttribute("data-state", "idle");
    },
  );

  it("ignores disabled holds and ignores an unrelated key release", () => {
    const onConfirm = vi.fn();
    const { rerender } = render(<ConfirmButton onConfirm={onConfirm} disabled />);
    const button = screen.getByRole("button");
    fireEvent.keyDown(button, { key: "Enter" });
    advance(2000);
    expect(onConfirm).not.toHaveBeenCalled();
    rerender(<ConfirmButton onConfirm={onConfirm} />);
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.keyUp(button, { key: " " });
    advance(1600);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it.each([0, -1, NaN, Infinity])("uses the default hold time for duration %s", (duration) => {
    const onConfirm = vi.fn();
    render(<ConfirmButton onConfirm={onConfirm} duration={duration} />);
    const button = screen.getByRole("button");
    fireEvent.keyDown(button, { key: "Enter" });
    advance(1400);
    expect(onConfirm).not.toHaveBeenCalled();
    advance(200);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
