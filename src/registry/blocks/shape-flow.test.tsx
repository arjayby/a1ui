import { prepareWithSegments } from "@chenglou/pretext";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ShapeFlow } from "./shape-flow";

// Browser tests cover real font metrics and X collisions. These tests isolate
// the component's loading, accessibility, caching, and cleanup contracts.
vi.mock("@chenglou/pretext", () => ({
  prepareWithSegments: vi.fn((text: string) => ({ segments: [text] })),
  layoutNextLineRange: vi.fn((_prepared, cursor) =>
    cursor.segmentIndex === 0
      ? { start: cursor, end: { segmentIndex: 1, graphemeIndex: 0 }, width: 80 }
      : null,
  ),
  materializeLineRange: vi.fn((prepared) => ({ text: prepared.segments.join("") })),
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

describe("ShapeFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(screen.getByRole("button", { name: "Move X" })).toHaveAccessibleDescription(
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
    const handle = screen.getByRole("button", { name: "Move X" });
    const start = handle.style.left;
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(handle.style.left).not.toBe(start);
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
});
