import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LoadingButton } from "./loading-button";

describe("LoadingButton", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("waits for the action and prevents duplicate activation until success resets", async () => {
    const request = Promise.withResolvers<void>();
    const onClick = vi.fn(() => request.promise);
    render(<LoadingButton onClick={onClick} duration={0} />);
    const button = screen.getByRole("button", { name: "Submit" });

    fireEvent.click(button);
    fireEvent.click(button);
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAccessibleName("Loading...");
    expect(screen.getByRole("status")).toHaveTextContent("Loading...");
    expect(onClick).toHaveBeenCalledTimes(1);

    expect(button).toHaveAttribute("data-state", "loading");
    await act(async () => request.resolve());
    expect(button).toHaveAccessibleName("Done");
    expect(button).toHaveAttribute("aria-busy", "false");
    expect(screen.getByRole("status")).toHaveTextContent("Done");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);

    await waitFor(() => expect(button).toHaveAccessibleName("Submit"), { timeout: 2500 });
    expect(button).toBeEnabled();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    await act(async () => fireEvent.click(button));
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it.each(["throw", "reject"])("shows a retryable error when the action fails with %s", async (failure) => {
    const onClick = vi.fn((): void | Promise<void> => {
      if (failure === "throw") throw new Error("Failed");
      return Promise.reject(new Error("Failed"));
    });
    render(<LoadingButton onClick={onClick} errorLabel="Couldn't save. Try again." duration={0} />);
    const button = screen.getByRole("button");
    await act(async () => fireEvent.click(button));
    expect(button).toHaveAttribute("data-state", "error");
    expect(button).toBeEnabled();
    expect(button).toHaveAccessibleName("Couldn't save. Try again.");
    expect(button).toHaveAccessibleDescription("Couldn't save. Try again.");
    await waitFor(() => expect(button).toHaveTextContent(/^Couldn't save. Try again.$/));
    expect(screen.getByRole("status")).toHaveClass("sr-only");

    onClick.mockResolvedValue(undefined);
    await act(async () => fireEvent.click(button));
    expect(button).toHaveAttribute("data-state", "success");
    expect(screen.getByRole("status")).toHaveTextContent("Done");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("respects disabled and preserves custom labels and the idle icon", async () => {
    const request = Promise.withResolvers<void>();
    const onClick = vi.fn(() => request.promise);
    const props = {
      onClick,
      label: "Upload",
      loadingLabel: "Uploading...",
      successLabel: "Uploaded",
      icon: <span data-testid="upload-icon">↑</span>,
      duration: 0,
    };
    const { rerender } = render(<LoadingButton {...props} disabled />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByTestId("upload-icon")).toBeInTheDocument();
    rerender(<LoadingButton {...props} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveAccessibleName("Uploading...");
    await act(async () => request.resolve());
    expect(screen.getByRole("button")).toHaveAccessibleName("Uploaded");
  });

  it.each([0, -1, NaN])("settles animated content for duration %s", async (duration) => {
    render(<LoadingButton onClick={async () => {}} animation="blur" duration={duration} />);
    await act(async () => fireEvent.click(screen.getByRole("button")));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Done" })).toHaveTextContent(/^Done$/);
      expect(screen.getByText("Done", { selector: '[aria-hidden="true"] > span' })).toHaveStyle({
        filter: "blur(0px)",
      });
    });
  });
});
