import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ConfirmationButton } from "./confirmation-button";

afterEach(cleanup);

describe("ConfirmationButton", () => {
  it("ignores pointer clicks and exposes an alternative to dragging", () => {
    const onConfirm = vi.fn();
    render(<ConfirmationButton onConfirm={onConfirm} />);
    const handle = screen.getByRole("button", { name: "Slide to confirm" });
    expect(handle).toHaveAccessibleDescription(/Enter or Space/);
    fireEvent.click(handle, { detail: 1 });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("waits for the action and blocks duplicate activation while pending and confirmed", async () => {
    let resolve!: () => void;
    const onConfirm = vi.fn(() => new Promise<void>((done) => (resolve = done)));
    const { container } = render(<ConfirmationButton onConfirm={onConfirm} />);
    const handle = screen.getByRole("button");
    fireEvent.click(handle, { detail: 0 });
    fireEvent.click(handle, { detail: 0 });
    expect(handle).toHaveAttribute("aria-busy", "true");
    expect(handle).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Confirming...");
    expect(container.querySelector('[data-state="confirmed"]')).toBeNull();
    await act(async () => resolve());
    expect(screen.getByRole("status")).toHaveTextContent("Confirmed");
    fireEvent.click(handle, { detail: 0 });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it.each(["throw", "reject"])("shows a retryable error when the action fails with %s", async (failure) => {
    const onConfirm = vi.fn((): void | Promise<void> => {
      if (failure === "throw") throw new Error("Failed");
      return Promise.reject(new Error("Failed"));
    });
    render(<ConfirmationButton onConfirm={onConfirm} errorLabel="Please try again." />);
    await act(async () => fireEvent.click(screen.getByRole("button")));
    expect(screen.getByRole("status")).toHaveTextContent("Please try again.");
    const handle = screen.getByRole("button", { name: "Slide to confirm" });
    expect(handle).toHaveAttribute("aria-disabled", "false");
    expect(handle).toHaveAccessibleDescription(/Please try again/);
    onConfirm.mockImplementation(() => {});
    await act(async () => fireEvent.click(handle));
    expect(screen.getByRole("status")).toHaveTextContent("Confirmed");
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });

  it("does not run disabled actions, and remounting starts a new confirmation", async () => {
    const onConfirm = vi.fn();
    const { rerender } = render(<ConfirmationButton key={0} onConfirm={onConfirm} disabled />);
    fireEvent.click(screen.getByRole("button"));
    expect(onConfirm).not.toHaveBeenCalled();
    rerender(<ConfirmationButton key={0} onConfirm={onConfirm} />);
    await act(async () => fireEvent.click(screen.getByRole("button")));
    expect(screen.getByRole("status")).toHaveTextContent("Confirmed");
    rerender(<ConfirmationButton key={1} onConfirm={onConfirm} />);
    expect(screen.getByRole("button", { name: "Slide to confirm" })).toHaveAttribute(
      "aria-disabled",
      "false",
    );
    await act(async () => fireEvent.click(screen.getByRole("button")));
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });
});
