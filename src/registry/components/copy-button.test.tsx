import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CopyButton } from "./copy-button";

describe("CopyButton duration", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it.each([0, -1])("switches without a transition for duration %s", async (duration) => {
    render(<CopyButton value="example" animation="blur" duration={duration} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: "Copied" })).toHaveTextContent(/^Copied$/);
        expect(screen.queryByText("Copy", { exact: true })).not.toBeInTheDocument();
      },
      { timeout: 150 },
    );
  });

  it("keeps outgoing content for a custom transition duration", async () => {
    render(<CopyButton value="example" animation="blur" duration={0.6} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await screen.findByRole("button", { name: "Copied" });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    expect(screen.getByText("Copy", { exact: true })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Copy", { exact: true })).not.toBeInTheDocument());
    expect(screen.getByText("Copied", { exact: true })).toHaveStyle({ filter: "blur(0px)" });
  });

  it("falls back to the default transition for a non-finite duration", async () => {
    render(<CopyButton value="example" animation="blur" duration={NaN} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await screen.findByRole("button", { name: "Copied" });
    await waitFor(() => expect(screen.queryByText("Copy", { exact: true })).not.toBeInTheDocument());
  });
});
