import { prepareWithSegments } from "@chenglou/pretext";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ShapeFlow } from "./shape-flow";

// Browser tests cover real font metrics and duck collisions. These tests isolate
// the component's loading, accessibility, caching, movement, and cleanup contracts.
vi.mock("@chenglou/pretext", () => ({
  prepareWithSegments: vi.fn((text: string) => ({ segments: [text] })),
  layoutNextLineRange: vi.fn((_prepared, cursor) =>
    cursor.segmentIndex === 0
      ? { start: cursor, end: { segmentIndex: 1, graphemeIndex: 0 }, width: 80 }
      : null,
  ),
  materializeLineRange: vi.fn((prepared) => ({ text: prepared.segments.join("") })),
}));

// Motion reads the reduced-motion query once per page, so tests flip the hook directly.
const motionPreference = vi.hoisted(() => ({ reduced: false }));
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotion: () => motionPreference.reduced,
}));

const originalFonts = Object.getOwnPropertyDescriptor(document, "fonts");
let loadFont: ReturnType<typeof vi.fn<(font: string, text?: string) => Promise<FontFace[]>>>;
let resize: ResizeObserverCallback;
let disconnect: ReturnType<typeof vi.fn>;

function pendingFont() {
  let resolve!: (fonts: FontFace[]) => void;
  const promise = new Promise<FontFace[]>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

function resizeTo(width: number) {
  act(() => resize([{ contentRect: { width } } as ResizeObserverEntry], {} as ResizeObserver));
}

/**
 * Dispatches a pointer event at a set time, because release velocity is measured from timestamps.
 * Times count from one second in, as React reads a timestamp of zero as missing.
 */
function pointer(type: string, target: Element, x: number, y: number, time: number) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: y });
  Object.defineProperties(event, {
    pointerId: { value: 1 },
    isPrimary: { value: true },
    timeStamp: { value: 1000 + time },
  });
  fireEvent(target, event);
}

/** Presses at `from`, moves through each `[x, y, time]` point, and lifts at `liftAt`. */
function drag(
  target: Element,
  from: [x: number, y: number],
  points: [x: number, y: number, time: number][],
  liftAt?: number,
) {
  pointer("pointerdown", target, from[0], from[1], 0);
  for (const [x, y, time] of points) pointer("pointermove", target, x, y, time);
  const [x, y] = points[points.length - 1];
  if (liftAt !== undefined) pointer("pointerup", target, x, y, liftAt);
}

/** The duck is moved by its transform alone, so its place is read from there. */
function offset(handle: HTMLElement) {
  const [, x, y] = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(handle.style.transform)!;
  return { x: Number(x), y: Number(y) };
}

/** Waits for the duck to come to rest at an offset. A spring's last step lands exactly on its target. */
function expectRest(handle: HTMLElement, x: number, y: number) {
  return waitFor(() => {
    expect(offset(handle).x).toBeCloseTo(x, 5);
    expect(offset(handle).y).toBeCloseTo(y, 5);
  });
}

/** Lets Motion's frame loop run, to show that nothing is still moving. */
async function frames(count = 6) {
  for (let index = 0; index < count; index += 1) {
    await act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  }
}

/**
 * A 500px wide, 320px tall paragraph with an 80px duck: 340px of travel across and 160px down,
 * so the duck starts at an offset of 170, 80.
 */
async function renderDuck() {
  const view = render(<ShapeFlow text="Give words room." />);
  resizeTo(500);
  await flush();
  const handle = screen.getByRole("button", { name: "Move duck" });
  return { ...view, handle, duck: handle.querySelector<SVGGElement>('[data-slot="shape-flow-duck"]')! };
}

describe("ShapeFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    motionPreference.reduced = false;
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
    // jsdom has no pointer capture.
    Object.assign(HTMLElement.prototype, {
      setPointerCapture: vi.fn(),
      releasePointerCapture: vi.fn(),
      hasPointerCapture: vi.fn(() => true),
    });
    loadFont = vi.fn<(font: string, text?: string) => Promise<FontFace[]>>().mockResolvedValue([]);
    Object.defineProperty(document, "fonts", { configurable: true, value: { load: loadFont } });
    disconnect = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: ResizeObserverCallback) {
          resize = callback;
        }
        observe = vi.fn();
        disconnect = disconnect;
      },
    );
  });

  afterEach(() => {
    cleanup();
    if (originalFonts) Object.defineProperty(document, "fonts", originalFonts);
    else Reflect.deleteProperty(document, "fonts");
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders readable, escaped text on the server without measuring it", () => {
    const html = renderToString(<ShapeFlow text="A <b>story</b>." />);
    expect(html).toContain("A &lt;b&gt;story&lt;/b&gt;.");
    expect(html).toContain('data-state="fallback"');
    expect(html).not.toContain("<button");
    expect(loadFont).not.toHaveBeenCalled();
    expect(prepareWithSegments).not.toHaveBeenCalled();
  });

  it("keeps the paragraph readable until its font and container are ready", async () => {
    const font = pendingFont();
    loadFont.mockReturnValue(font.promise);
    const { container } = render(<ShapeFlow text="Give words room." />);
    const paragraph = screen.getByText("Give words room.");
    resizeTo(500);
    expect(paragraph).not.toHaveClass("sr-only");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(prepareWithSegments).not.toHaveBeenCalled();

    await act(async () => font.resolve([]));
    expect(paragraph).toHaveClass("sr-only");
    expect(container.querySelector('[data-slot="shape-flow-line"]')?.parentElement).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(screen.getByRole("button", { name: "Move duck" })).toHaveAccessibleDescription(
      /arrow keys.*Home to reset/,
    );
  });

  it.each(["font loading", "measurement"])("preserves readable text when %s fails", async (failure) => {
    if (failure === "font loading") loadFont.mockRejectedValue(new Error("Font unavailable"));
    else
      vi.mocked(prepareWithSegments).mockImplementationOnce(() => {
        throw new Error("No canvas");
      });
    const { container } = render(<ShapeFlow text="Still readable." />);
    resizeTo(500);
    await flush();
    expect(screen.getByText("Still readable.")).not.toHaveClass("sr-only");
    expect(container.firstChild).toHaveAttribute("data-state", "fallback");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("falls back when Intl.Segmenter is unavailable", async () => {
    vi.stubGlobal("Intl", Object.create(Intl, { Segmenter: { value: undefined } }));
    render(<ShapeFlow text="Read in any browser." />);
    resizeTo(500);
    await flush();
    expect(screen.getByText("Read in any browser.")).not.toHaveClass("sr-only");
    expect(prepareWithSegments).not.toHaveBeenCalled();
  });

  it("ignores stale font loads after text and typography change", async () => {
    const oldFont = pendingFont();
    const newFont = pendingFont();
    loadFont.mockReturnValueOnce(oldFont.promise).mockReturnValueOnce(newFont.promise);
    const { rerender, container } = render(<ShapeFlow text="Old story." />);
    resizeTo(500);
    rerender(<ShapeFlow text="New story." fontFamily="Arial" fontSize={20} />);
    expect(screen.getByText("New story.")).not.toHaveClass("sr-only");

    await act(async () => newFont.resolve([]));
    await act(async () => oldFont.resolve([]));
    expect(prepareWithSegments).toHaveBeenCalledExactlyOnceWith("New story.", "400 20px Arial");
    expect(container.querySelector('[data-slot="shape-flow-line"]')).toHaveTextContent("New story.");
    expect(screen.queryByText("Old story.")).not.toBeInTheDocument();

    const nextFont = pendingFont();
    loadFont.mockReturnValueOnce(nextFont.promise);
    rerender(<ShapeFlow text="Latest story." fontFamily="Arial" fontSize={20} />);
    expect(screen.getByText("Latest story.")).not.toHaveClass("sr-only");
    expect(container.querySelector('[data-slot="shape-flow-line"]')).toBeNull();
    await act(async () => nextFont.resolve([]));
    expect(container.querySelector('[data-slot="shape-flow-line"]')).toHaveTextContent("Latest story.");
  });

  it("reuses prepared text during resizing, movement, and layout-only prop changes", async () => {
    const { rerender } = render(<ShapeFlow text="Measure once." />);
    resizeTo(500);
    await flush();
    const handle = screen.getByRole("button", { name: "Move duck" });
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    await expectRest(handle, 178, 80);
    resizeTo(320);
    rerender(<ShapeFlow text="Measure once." radius={40} gap={20} height={400} className="max-w-xl" />);
    await flush();
    expect(prepareWithSegments).toHaveBeenCalledTimes(1);
    expect(loadFont).toHaveBeenCalledTimes(1);
    expect(handle).toBeInTheDocument();
  });

  it("disconnects observers and discards pending measurement on unmount in Strict Mode", async () => {
    const font = pendingFont();
    loadFont.mockReturnValue(font.promise);
    const { unmount } = render(
      <StrictMode>
        <ShapeFlow text="Pending." />
      </StrictMode>,
    );
    expect(disconnect).toHaveBeenCalledTimes(1);
    unmount();
    expect(disconnect).toHaveBeenCalledTimes(2);
    await act(async () => font.resolve([]));
    expect(prepareWithSegments).not.toHaveBeenCalled();
  });

  it("moves the duck with its transform, starting from the middle", async () => {
    const { handle } = await renderDuck();
    expect(offset(handle)).toEqual({ x: 170, y: 80 });
    expect(handle.style.left).toBe("");
    expect(handle.style.top).toBe("");
  });

  it("lifts on pointer-down and tracks the pointer 1:1 from where it was grabbed", async () => {
    const { handle, duck } = await renderDuck();
    pointer("pointerdown", handle, 200, 100, 0);
    expect(handle).toHaveAttribute("data-dragging", "true");
    expect(handle.setPointerCapture).toHaveBeenCalledWith(1);
    await waitFor(() => expect(duck.style.transform).toContain("scale(1.04)"));
    // Nothing moves until the pointer does: the duck does not snap its centre to the pointer.
    expect(offset(handle)).toEqual({ x: 170, y: 80 });

    pointer("pointermove", handle, 230, 120, 16);
    await expectRest(handle, 200, 100);
    pointer("pointermove", handle, 150, 60, 32);
    await expectRest(handle, 120, 40);

    // A pointer that pauses before lifting throws nothing, and the duck sets down where it is.
    pointer("pointerup", handle, 150, 60, 500);
    expect(handle).toHaveAttribute("data-dragging", "false");
    expect(handle.releasePointerCapture).toHaveBeenCalledWith(1);
    await waitFor(() => expect(duck.style.transform).toBe("none"));
    await frames();
    expect(offset(handle)).toEqual({ x: 120, y: 40 });
  });

  it("carries a flick past the release point on each axis, and settles where momentum sends it", async () => {
    const { handle } = await renderDuck();
    // 60px in 48ms is 1250px/s to the right: the projected resting point is past the right edge.
    drag(
      handle,
      [200, 100],
      [
        [220, 100, 16],
        [240, 100, 32],
        [260, 100, 48],
      ],
      50,
    );
    await waitFor(() => expect(offset(handle).x).toBeGreaterThan(240));
    await expectRest(handle, 340, 80);

    // A slower diagonal flick comes to rest inside the paragraph, further along than it was let go:
    // 300px/s to the left coasts 150px, and 60px/s down coasts 30px.
    fireEvent.keyDown(handle, { key: "Home" });
    await expectRest(handle, 170, 80);
    drag(
      handle,
      [200, 100],
      [
        [195, 101, 16],
        [190, 102, 32],
        [185, 103, 48],
      ],
      50,
    );
    await waitFor(() => expect(offset(handle).x).toBeLessThan(150));
    await waitFor(() => {
      expect(offset(handle).x).toBeCloseTo(170 - 15 - 150 * 0.998, 5);
      expect(offset(handle).y).toBeCloseTo(80 + 3 + 30 * 0.998, 5);
    });
  });

  it("rubber-bands past an edge and eases back inside when it is let go", async () => {
    const { handle } = await renderDuck();
    // 400px to the right is 230px past the edge at 340.
    drag(handle, [200, 100], [[600, 100, 16]]);
    await waitFor(() => expect(offset(handle).x).toBeGreaterThan(340));
    await frames();
    const held = offset(handle).x;
    expect(held).toBeCloseTo(340 + (230 * 80 * 0.55) / (80 + 0.55 * 230), 5);

    // Pulling further still moves it, by less and less.
    pointer("pointermove", handle, 800, 100, 400);
    await waitFor(() => expect(offset(handle).x).toBeGreaterThan(held));
    expect(offset(handle).x).toBeLessThan(340 + 80);

    pointer("pointercancel", handle, 800, 100, 800);
    await expectRest(handle, 340, 80);
  });

  it("catches a duck in flight where it is and carries on from there", async () => {
    const { handle } = await renderDuck();
    drag(
      handle,
      [200, 100],
      [
        [220, 100, 16],
        [240, 100, 32],
        [260, 100, 48],
      ],
      50,
    );
    await waitFor(() => expect(offset(handle).x).toBeGreaterThan(250));

    // Motion stops each spring on its value at that instant, which the next frame shows.
    pointer("pointerdown", handle, 300, 100, 200);
    await frames(2);
    const caught = offset(handle);
    expect(caught.x).toBeGreaterThan(250);
    expect(caught.y).toBe(80);
    await frames();
    expect(offset(handle)).toEqual(caught);

    pointer("pointermove", handle, 290, 110, 216);
    await expectRest(handle, caught.x - 10, 90);
  });

  it("steps and resets with the keyboard, adding up steps while the duck is still moving", async () => {
    const { handle } = await renderDuck();
    for (let press = 0; press < 3; press += 1) fireEvent.keyDown(handle, { key: "ArrowRight" });
    await expectRest(handle, 194, 80);
    fireEvent.keyDown(handle, { key: "ArrowUp", shiftKey: true });
    await expectRest(handle, 194, 48);
    fireEvent.keyDown(handle, { key: "Home" });
    await waitFor(() => expect(offset(handle).x).toBeLessThan(194));
    await expectRest(handle, 170, 80);
    // The bounds hold: no step leaves the paragraph.
    for (let press = 0; press < 8; press += 1) fireEvent.keyDown(handle, { key: "ArrowUp", shiftKey: true });
    await expectRest(handle, 170, 0);
  });

  it("places the duck without springs, bounce or lift under reduced motion", async () => {
    motionPreference.reduced = true;
    const { handle, duck } = await renderDuck();
    fireEvent.keyDown(handle, { key: "ArrowRight", shiftKey: true });
    await frames(2);
    expect(offset(handle)).toEqual({ x: 202, y: 80 });
    fireEvent.keyDown(handle, { key: "Home" });
    await frames(2);
    expect(offset(handle)).toEqual({ x: 170, y: 80 });

    // The held duck dims instead of lifting, and a flick leaves it where it was let go.
    drag(
      handle,
      [200, 100],
      [
        [220, 100, 16],
        [240, 100, 32],
        [260, 100, 48],
      ],
    );
    await waitFor(() => expect(duck.style.opacity).toBe("0.75"));
    expect(duck.style.transform).not.toContain("scale");
    pointer("pointerup", handle, 260, 100, 50);
    await waitFor(() => expect(duck.style.opacity).toBe("1"));
    await frames();
    expect(offset(handle)).toEqual({ x: 230, y: 80 });

    // An edge stops the duck instead of stretching.
    drag(handle, [260, 100], [[900, 100, 16]], 600);
    await frames();
    expect(offset(handle)).toEqual({ x: 340, y: 80 });
  });
});
