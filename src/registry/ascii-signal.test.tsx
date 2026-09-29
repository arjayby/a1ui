import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AsciiSignal } from "./ascii-signal";

let setVisible: (visible: boolean) => void;
let setReduced: (reduced: boolean) => void;

function picture() {
  return document.querySelector('[data-slot="ascii-signal-art"]')?.textContent;
}

beforeEach(() => {
  vi.useFakeTimers();
  const mediaEvents = new EventTarget();
  const media = {
    matches: false,
    addEventListener: mediaEvents.addEventListener.bind(mediaEvents),
    removeEventListener: mediaEvents.removeEventListener.bind(mediaEvents),
  };
  setReduced = (reduced) => {
    media.matches = reduced;
    act(() => mediaEvents.dispatchEvent(new Event("change")));
  };
  vi.stubGlobal("matchMedia", () => media);
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(private callback: (entries: { isIntersecting: boolean }[]) => void) {
        setVisible = (visible) => act(() => this.callback([{ isIntersecting: visible }]));
      }
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("AsciiSignal", () => {
  it("changes the waveform with status and resolves into a checkmark", () => {
    const { rerender } = render(<AsciiSignal status="idle" />);
    const idle = picture();
    expect(screen.getByRole("status")).toHaveTextContent("Standing by");
    act(() => vi.advanceTimersByTime(250));
    expect(picture()).not.toBe(idle);

    rerender(<AsciiSignal status="processing" label="Generating preview" />);
    expect(screen.getByRole("status")).toHaveTextContent("Generating preview");
    const processing = picture();
    act(() => vi.advanceTimersByTime(250));
    expect(picture()).not.toBe(processing);

    rerender(<AsciiSignal status="complete" label="Preview ready" />);
    expect(screen.getByRole("status")).toHaveTextContent("Preview ready");
    expect(picture()).not.toBe(idle);
    act(() => vi.advanceTimersByTime(650));
    const finished = picture();
    expect(finished).toContain("@");
    expect(vi.getTimerCount()).toBe(0);
    act(() => vi.advanceTimersByTime(1000));
    expect(picture()).toBe(finished);
  });

  it("stops offscreen, in reduced motion, when paused, and after unmount", () => {
    const { rerender, unmount } = render(<AsciiSignal status="processing" />);
    act(() => vi.advanceTimersByTime(100));
    setVisible(false);
    const offscreen = picture();
    expect(vi.getTimerCount()).toBe(0);
    act(() => vi.advanceTimersByTime(1000));
    expect(picture()).toBe(offscreen);
    setVisible(true);
    expect(vi.getTimerCount()).toBe(1);

    setReduced(true);
    expect(vi.getTimerCount()).toBe(0);
    const reduced = picture();
    act(() => vi.advanceTimersByTime(1000));
    expect(picture()).toBe(reduced);
    setReduced(false);
    rerender(<AsciiSignal status="processing" paused />);
    expect(vi.getTimerCount()).toBe(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
