import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Kbd, KbdGroup } from "./kbd";

const cap = (element: Element) => element.closest('[data-slot="kbd"]')!;

describe("Kbd", () => {
  let reduced = false;
  beforeEach(() => {
    reduced = false;
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: reduced }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    delete (navigator as { platform?: string }).platform;
  });

  it("presses while the watched key is held and releases on keyup or window blur", () => {
    const onPressedChange = vi.fn();
    render(<Kbd listen="k" onPressedChange={onPressedChange} />);
    const key = cap(screen.getByText("K"));
    expect(key.tagName).toBe("KBD");
    expect(key).not.toHaveAttribute("data-pressed");

    fireEvent.keyDown(window, { key: "k", code: "KeyK" });
    expect(key).toHaveAttribute("data-pressed", "true");
    fireEvent.keyUp(window, { key: "k", code: "KeyK" });
    expect(key).not.toHaveAttribute("data-pressed");

    // ⌥K reports a different character on a Mac but the same physical key.
    fireEvent.keyDown(window, { key: "˚", code: "KeyK", altKey: true });
    expect(key).toHaveAttribute("data-pressed", "true");
    fireEvent.blur(window);
    expect(key).not.toHaveAttribute("data-pressed");
    fireEvent.keyDown(window, { key: "j", code: "KeyJ" });
    expect(key).not.toHaveAttribute("data-pressed");
    expect(onPressedChange.mock.calls).toEqual([[true], [false], [true], [false]]);
  });

  it("tracks modifiers from event state and releases letters when ⌘ is let go", () => {
    render(
      <>
        <Kbd listen="Meta" platform="mac" />
        <Kbd listen="k" />
      </>,
    );
    const meta = cap(screen.getByText("Command"));
    const k = cap(screen.getByText("K"));
    fireEvent.keyDown(window, { key: "Meta", metaKey: true });
    fireEvent.keyDown(window, { key: "k", code: "KeyK", metaKey: true });
    expect(meta).toHaveAttribute("data-pressed", "true");
    expect(k).toHaveAttribute("data-pressed", "true");
    // macOS sends no keyup for K while ⌘ is down; releasing ⌘ must release both.
    fireEvent.keyUp(window, { key: "Meta", metaKey: false });
    expect(meta).not.toHaveAttribute("data-pressed");
    expect(k).not.toHaveAttribute("data-pressed");
  });

  it("removes its listeners on unmount", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<Kbd listen="Enter" />);
    unmount();
    const types = remove.mock.calls.map(([type]) => type);
    expect(types).toEqual(expect.arrayContaining(["keydown", "keyup", "blur"]));
    remove.mockRestore();
  });

  it("shows platform labels with spoken names", () => {
    render(
      <>
        <Kbd listen="mod" platform="mac" data-testid="mac" />
        <Kbd listen="mod" platform="other" data-testid="other" />
        <Kbd listen="Shift" platform="mac" data-testid="shift" />
        <Kbd>Esc</Kbd>
      </>,
    );
    expect(screen.getByTestId("mac")).toHaveTextContent("⌘Command");
    expect(screen.getByTestId("mac").querySelector('[aria-hidden="true"]')).toHaveTextContent("⌘");
    expect(screen.getByTestId("other").querySelector('[aria-hidden="true"]')).toHaveTextContent(/^Ctrl$/);
    expect(screen.getByTestId("other").querySelector(".sr-only")).toHaveTextContent("Control");
    expect(screen.getByTestId("shift").querySelector(".sr-only")).toHaveTextContent("Shift");
    expect(screen.getByText("Esc").closest("kbd")).toBeInTheDocument();
  });

  it("renders Ctrl on the server and switches to ⌘ after hydrating on a Mac", async () => {
    Object.defineProperty(navigator, "platform", { value: "MacIntel", configurable: true });
    const html = renderToString(<KbdGroup keys={["mod", "k"]} />);
    expect(html).toContain("Ctrl");
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.append(container);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const onRecoverableError = vi.fn();
    const root = await act(async () =>
      hydrateRoot(container, <KbdGroup keys={["mod", "k"]} />, { onRecoverableError }),
    );
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
    expect(container).toHaveTextContent("⌘Command+K");
    act(() => root.unmount());
    container.remove();
    errors.mockRestore();
  });

  it("presses each key of a group and reports the full combo once", () => {
    const onComplete = vi.fn();
    render(<KbdGroup keys={["mod", "shift", "p"]} listen platform="other" onComplete={onComplete} />);
    const group = document.querySelector('[data-slot="kbd-group"]')!;
    expect(group.tagName).toBe("KBD");
    expect(group.querySelectorAll('[data-slot="kbd"]')).toHaveLength(3);
    expect(group.querySelectorAll('[data-slot="kbd-separator"]')).toHaveLength(2);

    fireEvent.keyDown(window, { key: "Control", ctrlKey: true });
    fireEvent.keyDown(window, { key: "Shift", ctrlKey: true, shiftKey: true });
    expect(cap(screen.getByText("Ctrl"))).toHaveAttribute("data-pressed", "true");
    expect(group).not.toHaveAttribute("data-complete");
    fireEvent.keyDown(window, { key: "P", code: "KeyP", ctrlKey: true, shiftKey: true });
    expect(group).toHaveAttribute("data-complete", "true");
    fireEvent.keyDown(window, { key: "P", code: "KeyP", ctrlKey: true, shiftKey: true, repeat: true });
    expect(onComplete).toHaveBeenCalledTimes(1);
    fireEvent.keyUp(window, { key: "P", code: "KeyP", ctrlKey: true, shiftKey: true });
    expect(group).not.toHaveAttribute("data-complete");
  });

  it("presses on pointer down, releases on pointer up anywhere, and honors controlled state", () => {
    const { rerender } = render(<Kbd>A</Kbd>);
    const key = cap(screen.getByText("A"));
    fireEvent.pointerDown(key, { pointerType: "mouse", button: 0 });
    expect(key).toHaveAttribute("data-pressed", "true");
    fireEvent.pointerUp(window);
    expect(key).not.toHaveAttribute("data-pressed");
    fireEvent.pointerDown(key, { pointerType: "mouse", button: 2 });
    expect(key).not.toHaveAttribute("data-pressed");

    rerender(<Kbd pressed>A</Kbd>);
    expect(key).toHaveAttribute("data-pressed", "true");
    rerender(
      <Kbd pressed={false} listen="a">
        A
      </Kbd>,
    );
    fireEvent.keyDown(window, { key: "a", code: "KeyA" });
    expect(key).not.toHaveAttribute("data-pressed");
  });

  it("keeps the press state with reduced motion", () => {
    reduced = true;
    render(<KbdGroup keys={["alt", "enter"]} listen platform="mac" />);
    fireEvent.keyDown(window, { key: "Alt", altKey: true });
    fireEvent.keyDown(window, { key: "Enter", altKey: true });
    expect(document.querySelector('[data-slot="kbd-group"]')).toHaveAttribute("data-complete", "true");
    expect(cap(screen.getByText("Return"))).toHaveAttribute("data-pressed", "true");
  });
});
