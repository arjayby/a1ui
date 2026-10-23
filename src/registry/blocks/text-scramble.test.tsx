import { act, cleanup, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TextScramble } from "./text-scramble";

let motion: EventTarget & { matches: boolean };

function elements() {
  const root = screen.getByTestId("scramble");
  const visual = root.querySelector('[aria-hidden="true"]');
  const accessible = root.querySelector(".sr-only");
  return { root, visual, accessible };
}

describe("TextScramble", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    motion = Object.assign(new EventTarget(), { matches: false });
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue(motion));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders the final text on the server without reading browser preferences", () => {
    const html = renderToString(<TextScramble text="READY" />);
    expect(html).toContain('<span class="sr-only">READY</span>');
    expect(html).toContain('aria-hidden="true"');
    expect(window.matchMedia).not.toHaveBeenCalled();
  });

  it("stays still on mount and when rerendered with the same text in Strict Mode", () => {
    const { rerender } = render(
      <StrictMode>
        <TextScramble data-testid="scramble" text="READY" />
      </StrictMode>,
    );
    rerender(
      <StrictMode>
        <TextScramble data-testid="scramble" text="READY" className="font-bold" />
      </StrictMode>,
    );

    const { root, visual } = elements();
    expect(visual).toHaveTextContent("READY");
    expect(root).toHaveAttribute("data-state", "idle");
    expect(root).not.toHaveAttribute("aria-live");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("exposes the final value immediately while every character resolves left to right", () => {
    const { rerender } = render(<TextScramble data-testid="scramble" text="A OLD" characters="#" />);
    rerender(
      <TextScramble
        data-testid="scramble"
        text="A NEW"
        characters="#"
        aria-live="polite"
        aria-atomic="true"
      />,
    );

    const { root, visual, accessible } = elements();
    expect(root).toHaveAttribute("data-state", "scrambling");
    expect(root).toHaveAttribute("aria-live", "polite");
    expect(accessible).toHaveTextContent("A NEW");
    expect(visual).toHaveTextContent("# ###");

    act(() => vi.advanceTimersByTime(460));
    expect(visual).toHaveTextContent("A ###");
    expect(accessible).toHaveTextContent("A NEW");

    act(() => vi.advanceTimersByTime(200));
    expect(visual).toHaveTextContent("A N##");
    act(() => vi.advanceTimersByTime(80));
    expect(visual).toHaveTextContent("A NE#");
    act(() => vi.advanceTimersByTime(80));
    expect(visual).toHaveTextContent("A NEW");
    expect(root).toHaveAttribute("data-state", "idle");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancels stale frames and resolves to the latest value after rapid changes", () => {
    const { rerender } = render(<TextScramble data-testid="scramble" text="ONE" characters="#" />);
    rerender(<TextScramble data-testid="scramble" text="TWO" characters="#" />);
    act(() => vi.advanceTimersByTime(500));
    rerender(<TextScramble data-testid="scramble" text="THREE" characters="#" />);

    const { visual, accessible } = elements();
    expect(visual).toHaveTextContent("#####");
    expect(accessible).toHaveTextContent("THREE");
    expect(vi.getTimerCount()).toBe(1);
    act(() => vi.advanceTimersByTime(400));
    expect(visual).not.toHaveTextContent("TWO");
    act(() => vi.advanceTimersByTime(420));
    expect(visual).toHaveTextContent("THREE");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps emoji, combining characters, and whitespace intact", () => {
    const { rerender } = render(<TextScramble data-testid="scramble" text={"👩‍💻 é\told\n"} characters="🧑🏽‍🚀" />);
    rerender(<TextScramble data-testid="scramble" text={"👩‍💻 é\tnew\n"} characters="🧑🏽‍🚀" />);

    const { visual } = elements();
    expect(visual?.textContent).toBe("🧑🏽‍🚀 🧑🏽‍🚀\t🧑🏽‍🚀🧑🏽‍🚀🧑🏽‍🚀\n");
    act(() => vi.advanceTimersByTime(820));
    expect(visual?.textContent).toBe("👩‍💻 é\tnew\n");
  });

  it("handles empty text, whitespace, trailing deletions, and text that looks like markup", () => {
    const { rerender } = render(<TextScramble data-testid="scramble" text="ABCD" />);
    rerender(<TextScramble data-testid="scramble" text="AB" characters="#" />);
    expect(elements().visual).toHaveTextContent("##");
    act(() => vi.advanceTimersByTime(820));
    expect(elements().visual).toHaveTextContent("AB");

    for (const text of ["", " \n\t"]) {
      rerender(<TextScramble data-testid="scramble" text={text} />);
      expect(elements().visual?.textContent).toBe(text);
      expect(vi.getTimerCount()).toBe(0);
    }

    rerender(<TextScramble data-testid="scramble" text="<b>text</b>" characters="<>" />);
    act(() => vi.advanceTimersByTime(820));
    expect(elements().visual?.textContent).toBe("<b>text</b>");
    expect(elements().root.querySelector("b")).toBeNull();
  });

  it("uses the requested letters, digits, and symbols as its default character pool", () => {
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&@$?/";
    const random = vi.spyOn(Math, "random");
    const { rerender } = render(<TextScramble data-testid="scramble" text="BEFORE" />);

    for (let index = 0; index < characters.length; index += 1) {
      random.mockReturnValue((index + 0.5) / characters.length);
      const text = String(index);
      rerender(<TextScramble data-testid="scramble" text={text} />);
      expect(elements().visual?.textContent).toBe(characters[index].repeat(text.length));
    }
  });

  it.each([{ disabled: true }, { duration: 0 }, { duration: -100 }, { characters: " \n\t" }])(
    "resolves immediately with %j",
    (props) => {
      const { rerender } = render(<TextScramble data-testid="scramble" text="BEFORE" {...props} />);
      rerender(<TextScramble data-testid="scramble" text="AFTER" {...props} />);
      expect(elements().visual).toHaveTextContent("AFTER");
      expect(elements().root).toHaveAttribute("data-state", "idle");
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("uses finite timing defaults and finishes even when the interval exceeds the duration", () => {
    const { rerender } = render(<TextScramble data-testid="scramble" text="A" />);
    rerender(<TextScramble data-testid="scramble" text="B" duration={NaN} interval={Infinity} />);
    act(() => vi.advanceTimersByTime(820));
    expect(elements().visual).toHaveTextContent("B");
    expect(vi.getTimerCount()).toBe(0);

    rerender(<TextScramble data-testid="scramble" text="C" duration={100} interval={1000} />);
    act(() => vi.advanceTimersByTime(120));
    expect(elements().visual).toHaveTextContent("C");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("skips motion when requested and stops immediately if the preference changes mid-animation", () => {
    motion.matches = true;
    const { rerender } = render(<TextScramble data-testid="scramble" text="FIRST" />);
    rerender(<TextScramble data-testid="scramble" text="SECOND" />);
    expect(elements().visual).toHaveTextContent("SECOND");
    expect(vi.getTimerCount()).toBe(0);

    motion.matches = false;
    rerender(<TextScramble data-testid="scramble" text="THIRD" characters="#" />);
    expect(elements().root).toHaveAttribute("data-state", "scrambling");
    act(() => {
      motion.matches = true;
      motion.dispatchEvent(new Event("change"));
    });
    expect(elements().visual).toHaveTextContent("THIRD");
    expect(elements().root).toHaveAttribute("data-state", "idle");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stops an active animation when disabled and cleans up frames and listeners on unmount", () => {
    const removeListener = vi.spyOn(motion, "removeEventListener");
    const { rerender, unmount } = render(<TextScramble data-testid="scramble" text="FIRST" />);
    rerender(<TextScramble data-testid="scramble" text="SECOND" />);
    rerender(<TextScramble data-testid="scramble" text="SECOND" disabled />);
    expect(elements().visual).toHaveTextContent("SECOND");
    expect(vi.getTimerCount()).toBe(0);
    expect(removeListener).toHaveBeenCalledTimes(1);

    rerender(<TextScramble data-testid="scramble" text="THIRD" />);
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(removeListener).toHaveBeenCalledTimes(2);
  });
});
