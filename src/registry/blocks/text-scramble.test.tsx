import { act, cleanup, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TextScramble } from "./text-scramble";

// Motion's frame loop captures requestAnimationFrame when it loads, so give it a stand-in before
// imports that forwards to whichever timers are installed when a frame is requested.
vi.hoisted(() => {
  globalThis.requestAnimationFrame = (callback) =>
    setTimeout(() => callback(performance.now()), 16) as unknown as number;
});

// Motion reads the reduced-motion query once per page, so tests flip the hook directly.
const motionPreference = vi.hoisted(() => ({ reduced: false }));
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotion: () => motionPreference.reduced,
}));

function elements() {
  const root = screen.getByTestId("scramble");
  const visual = root.querySelector<HTMLElement>('[aria-hidden="true"]')!;
  const accessible = root.querySelector(".sr-only");
  return { root, visual, accessible };
}

/**
 * Frames land every 16ms. Advancing asynchronously lets microtasks run between them, which is
 * when Motion drops the timestamp it caches for the current frame.
 */
const advance = (milliseconds: number) => act(() => vi.advanceTimersByTimeAsync(milliseconds));

/** Motion's shared loop runs one empty frame after its last animation ends, then goes idle. */
async function expectIdleLoop() {
  await advance(32);
  expect(vi.getTimerCount()).toBe(0);
}

describe("TextScramble", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    // Let Motion's loop drain its last requested frame so the next test starts idle.
    vi.advanceTimersByTime(64);
    vi.useRealTimers();
    vi.restoreAllMocks();
    motionPreference.reduced = false;
  });

  it("renders the final text on the server", () => {
    const html = renderToString(<TextScramble text="READY" />);
    expect(html).toContain('<span class="sr-only">READY</span>');
    expect(html).toContain('<span aria-hidden="true" class="whitespace-pre-wrap">READY</span>');
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

  it("exposes the final value immediately while every character resolves left to right", async () => {
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

    // Four characters resolve at 350, 500, 650, and 800ms of the default 800ms.
    await advance(336);
    expect(visual).toHaveTextContent("# ###");
    await advance(16);
    expect(visual).toHaveTextContent("A ###");
    expect(accessible).toHaveTextContent("A NEW");

    await advance(160);
    expect(visual).toHaveTextContent("A N##");
    await advance(144);
    expect(visual).toHaveTextContent("A NE#");
    await advance(128);
    expect(visual).toHaveTextContent("A NE#");
    expect(root).toHaveAttribute("data-state", "scrambling");
    await advance(16);
    expect(visual).toHaveTextContent("A NEW");
    expect(root).toHaveAttribute("data-state", "idle");
    await expectIdleLoop();
  });

  it("changes the noise once per interval and resolves characters on the frame they are due", async () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    const { rerender } = render(<TextScramble data-testid="scramble" text="AAAA" characters="01" />);
    rerender(<TextScramble data-testid="scramble" text="BBBB" characters="01" interval={100} />);
    const { visual } = elements();
    expect(visual).toHaveTextContent("0000");

    random.mockReturnValue(0.99);
    await advance(96);
    expect(visual).toHaveTextContent("0000");
    await advance(16);
    expect(visual).toHaveTextContent("1111");

    // The first character is due at 350ms, between two shuffles.
    random.mockReturnValue(0);
    await advance(224);
    expect(visual).toHaveTextContent("0000");
    await advance(16);
    expect(visual).toHaveTextContent("B000");
  });

  it("retargets from the noise on screen when the text changes mid-scramble", async () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    const { rerender } = render(<TextScramble data-testid="scramble" text="AAAA" characters="01" />);
    rerender(<TextScramble data-testid="scramble" text="BBBB" characters="01" />);
    await advance(520);
    const { root, visual, accessible } = elements();
    expect(visual).toHaveTextContent("BB00");

    // Resolved characters dissolve into fresh noise; the ones still scrambling keep their glyph.
    random.mockReturnValue(0.99);
    rerender(<TextScramble data-testid="scramble" text="CCCCCC" characters="01" />);
    expect(accessible).toHaveTextContent("CCCCCC");
    expect(visual).toHaveTextContent("110011");
    expect(root).toHaveAttribute("data-state", "scrambling");

    // The shuffle keeps its rhythm instead of starting a new interval.
    await advance(16);
    expect(visual).toHaveTextContent("111111");

    // The new run takes the full duration from the change, which fell between two frames.
    await advance(768);
    expect(root).toHaveAttribute("data-state", "scrambling");
    await advance(32);
    expect(visual).toHaveTextContent("CCCCCC");
    expect(root).toHaveAttribute("data-state", "idle");
  });

  it("stops the stale run and resolves to the latest value after rapid changes", async () => {
    const { rerender } = render(<TextScramble data-testid="scramble" text="ONE" characters="#" />);
    rerender(<TextScramble data-testid="scramble" text="TWO" characters="#" />);
    await advance(500);
    rerender(<TextScramble data-testid="scramble" text="THREE" characters="#" />);

    const { visual, accessible } = elements();
    expect(visual).toHaveTextContent("#####");
    expect(accessible).toHaveTextContent("THREE");
    // Both runs share Motion's one frame loop.
    expect(vi.getTimerCount()).toBe(1);
    await advance(400);
    expect(visual).not.toHaveTextContent("TWO");
    await advance(416);
    expect(visual).toHaveTextContent("THREE");
    await expectIdleLoop();
  });

  it("keeps emoji, combining characters, and whitespace intact", async () => {
    const { rerender } = render(<TextScramble data-testid="scramble" text={"👩‍💻 é\told\n"} characters="🧑🏽‍🚀" />);
    rerender(<TextScramble data-testid="scramble" text={"👩‍💻 é\tnew\n"} characters="🧑🏽‍🚀" />);

    const { visual } = elements();
    expect(visual.textContent).toBe("🧑🏽‍🚀 🧑🏽‍🚀\t🧑🏽‍🚀🧑🏽‍🚀🧑🏽‍🚀\n");
    await advance(800);
    expect(visual.textContent).toBe("👩‍💻 é\tnew\n");
  });

  it("handles empty text, whitespace, trailing deletions, and text that looks like markup", async () => {
    const { rerender } = render(<TextScramble data-testid="scramble" text="ABCD" />);
    rerender(<TextScramble data-testid="scramble" text="AB" characters="#" />);
    expect(elements().visual).toHaveTextContent("##");
    await advance(800);
    expect(elements().visual).toHaveTextContent("AB");
    await expectIdleLoop();

    for (const text of ["", " \n\t"]) {
      rerender(<TextScramble data-testid="scramble" text={text} />);
      expect(elements().visual.textContent).toBe(text);
      expect(vi.getTimerCount()).toBe(0);
    }

    rerender(<TextScramble data-testid="scramble" text="<b>text</b>" characters="<>" />);
    await advance(800);
    expect(elements().visual.textContent).toBe("<b>text</b>");
    expect(elements().root.querySelector("b")).toBeNull();
  });

  it("uses the requested letters, digits, and symbols as its default character pool", async () => {
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&@$?/";
    const random = vi.spyOn(Math, "random");
    const { rerender } = render(<TextScramble data-testid="scramble" text="BEFORE" />);

    for (let index = 0; index < characters.length; index += 1) {
      random.mockReturnValue((index + 0.5) / characters.length);
      const text = String(index);
      rerender(<TextScramble data-testid="scramble" text={text} />);
      expect(elements().visual.textContent).toBe(characters[index].repeat(text.length));
      await advance(800);
      expect(elements().visual.textContent).toBe(text);
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

  it("uses finite timing defaults and finishes even when the interval exceeds the duration", async () => {
    const { rerender } = render(<TextScramble data-testid="scramble" text="A" />);
    rerender(<TextScramble data-testid="scramble" text="B" duration={NaN} interval={Infinity} />);
    await advance(784);
    expect(elements().root).toHaveAttribute("data-state", "scrambling");
    await advance(16);
    expect(elements().visual).toHaveTextContent("B");
    await expectIdleLoop();

    rerender(<TextScramble data-testid="scramble" text="C" duration={100} interval={1000} />);
    await advance(128);
    expect(elements().visual).toHaveTextContent("C");
    await expectIdleLoop();
  });

  it("fades the new text in at once, without scrambling, under reduced motion", async () => {
    motionPreference.reduced = true;
    const { rerender } = render(<TextScramble data-testid="scramble" text="FIRST" />);
    const { root, visual } = elements();
    expect(visual.style.opacity).toBe("");

    rerender(<TextScramble data-testid="scramble" text="SECOND" />);
    expect(visual).toHaveTextContent("SECOND");
    expect(root).toHaveAttribute("data-state", "idle");
    await advance(96);
    const midway = Number(visual.style.opacity);
    expect(midway).toBeGreaterThan(0.3);
    expect(midway).toBeLessThan(0.7);

    // A change during the fade swaps the text and lets the fade carry on rather than restart.
    rerender(<TextScramble data-testid="scramble" text="THIRD" />);
    expect(visual).toHaveTextContent("THIRD");
    await advance(16);
    expect(Number(visual.style.opacity)).toBeGreaterThan(midway);
    await advance(96);
    expect(visual.style.opacity).toBe("1");
    await expectIdleLoop();

    // Once it has settled, the next change fades in again.
    rerender(<TextScramble data-testid="scramble" text="FOURTH" />);
    expect(visual).toHaveTextContent("FOURTH");
    await advance(96);
    expect(Number(visual.style.opacity)).toBeLessThan(0.7);
    await advance(112);
    expect(visual.style.opacity).toBe("1");
  });

  it("skips the fade when disabled and completes one that is under way", async () => {
    motionPreference.reduced = true;
    const { rerender } = render(<TextScramble data-testid="scramble" text="FIRST" />);
    rerender(<TextScramble data-testid="scramble" text="SECOND" />);
    await advance(96);
    rerender(<TextScramble data-testid="scramble" text="THIRD" disabled />);
    const { visual } = elements();
    expect(visual).toHaveTextContent("THIRD");
    await advance(16);
    expect(visual.style.opacity).toBe("1");

    rerender(<TextScramble data-testid="scramble" text="FOURTH" disabled />);
    await advance(16);
    expect(visual).toHaveTextContent("FOURTH");
    expect(visual.style.opacity).toBe("1");
  });

  it("stops an active animation when disabled or unmounted", async () => {
    const { rerender, unmount } = render(<TextScramble data-testid="scramble" text="FIRST" />);
    rerender(<TextScramble data-testid="scramble" text="SECOND" />);
    rerender(<TextScramble data-testid="scramble" text="SECOND" disabled />);
    const { root, visual } = elements();
    expect(visual).toHaveTextContent("SECOND");
    expect(root).toHaveAttribute("data-state", "idle");
    await expectIdleLoop();

    rerender(<TextScramble data-testid="scramble" text="THIRD" characters="#" />);
    expect(vi.getTimerCount()).toBe(1);
    await advance(160);
    unmount();
    await advance(800);
    expect(visual).toHaveTextContent("#####");
    expect(vi.getTimerCount()).toBe(0);
  });
});
