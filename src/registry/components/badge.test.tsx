import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Badge } from "./badge";

const motionPreference = vi.hoisted(() => ({ reduced: false }));
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotion: () => motionPreference.reduced,
}));

const liveRegion = () => document.querySelector('[data-slot="badge-live"]');
const digits = () => document.querySelector('[data-slot="badge-count"]');

describe("Badge", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    motionPreference.reduced = false;
  });

  it("renders a static label in each variant without a live region", () => {
    render(
      <>
        <Badge>New</Badge>
        <Badge variant="destructive">Failed</Badge>
      </>,
    );
    expect(screen.getByText("New")).toHaveAttribute("data-variant", "default");
    expect(screen.getByText("Failed")).toHaveAttribute("data-variant", "destructive");
    expect(liveRegion()).toBeNull();
  });

  it("announces counts politely and caps them at max", () => {
    const { rerender } = render(<Badge count={5} max={99} countLabel="unread messages" />);
    const region = liveRegion();
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveAttribute("aria-atomic", "true");
    expect(region).toHaveTextContent("5 unread messages");
    expect(digits()).toHaveAttribute("aria-hidden", "true");

    rerender(<Badge count={150} max={99} countLabel="unread messages" />);
    expect(screen.getByText("99+ unread messages")).toHaveClass("sr-only");

    cleanup();
    render(<Badge count={-3.7} showZero />);
    expect(liveRegion()).toHaveTextContent("0");
  });

  it("hides at zero unless showZero is set", () => {
    const { rerender } = render(<Badge count={0} />);
    expect(document.querySelector('[data-slot="badge"]')).toBeNull();
    rerender(<Badge count={2} />);
    expect(document.querySelector('[data-slot="badge"]')).toBeInTheDocument();
    expect(liveRegion()).toHaveTextContent("2");

    cleanup();
    render(<Badge count={0} showZero />);
    expect(liveRegion()).toHaveTextContent("0");
  });

  it("shows a status dot that only pulses when live", () => {
    const { rerender } = render(<Badge dot>Online</Badge>);
    expect(document.querySelector('[data-slot="badge-dot"]')).toHaveAttribute("aria-hidden", "true");
    expect(document.querySelector('[data-slot="badge-pulse"]')).toBeNull();
    rerender(
      <Badge dot live>
        Online
      </Badge>,
    );
    expect(document.querySelector('[data-slot="badge-pulse"]')).toBeInTheDocument();
  });

  it("swaps digits instantly and drops the pulse with reduced motion", async () => {
    motionPreference.reduced = true;
    const { rerender } = render(
      <Badge count={9} dot live>
        Inbox
      </Badge>,
    );
    expect(document.querySelector('[data-slot="badge-pulse"]')).toBeNull();
    rerender(
      <Badge count={10} dot live>
        Inbox
      </Badge>,
    );
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    const shown = [...document.querySelectorAll('[data-slot="badge-digit"]')].map(
      (digit) => digit.textContent,
    );
    expect(shown).toEqual(["1", "0"]);
  });
});
