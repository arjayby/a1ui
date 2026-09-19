import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PeelStack, type PeelStackItem } from "./peel-stack";

afterEach(cleanup);

const items: PeelStackItem[] = [
  { id: "form", title: "Form studies", content: <a href="#form">Open forms</a> },
  { id: "material", title: "Material notes", content: <a href="#material">Open materials</a> },
  { id: "sound", title: "Field recordings", content: <a href="#sound">Open recordings</a> },
];

function viewport() {
  return screen.getByRole("group", { name: /^Stack cards/ });
}

function pointer(
  target: HTMLElement,
  type: "pointerdown" | "pointerup" | "pointercancel" | "lostpointercapture",
  x: number,
  y = 50,
  pointerId = 1,
) {
  const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 });
  Object.defineProperties(event, { pointerId: { value: pointerId }, isPrimary: { value: true } });
  fireEvent(target, event);
}

function enablePointerCapture() {
  const element = viewport();
  element.setPointerCapture = vi.fn();
  element.hasPointerCapture = vi.fn(() => true);
  element.releasePointerCapture = vi.fn();
  return element;
}

describe("PeelStack", () => {
  it("loops forward and backward, announces the card, and calls back once per change", () => {
    const onActiveChange = vi.fn();
    render(<PeelStack items={items} onActiveChange={onActiveChange} />);
    expect(screen.getByRole("status")).toHaveTextContent("01 / 03Form studies");
    fireEvent.click(screen.getByRole("button", { name: "Previous card" }));
    expect(screen.getByRole("status")).toHaveTextContent("03 / 03Field recordings");
    fireEvent.click(screen.getByRole("button", { name: "Next card" }));
    expect(screen.getByRole("status")).toHaveTextContent("01 / 03Form studies");
    expect(onActiveChange.mock.calls).toEqual([["sound"], ["form"]]);
  });

  it("keeps a controlled selection until its owner changes the active ID", () => {
    const onActiveChange = vi.fn();
    const { rerender } = render(
      <PeelStack items={items} activeId="material" onActiveChange={onActiveChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Next card" }));
    expect(onActiveChange).toHaveBeenCalledWith("sound");
    expect(screen.getByRole("status")).toHaveTextContent("Material notes");
    rerender(<PeelStack items={items} activeId="sound" onActiveChange={onActiveChange} />);
    expect(screen.getByRole("status")).toHaveTextContent("Field recordings");
    expect(onActiveChange).toHaveBeenCalledTimes(1);
  });

  it("preserves selection across reordering and falls back when the selected card is removed", () => {
    const onActiveChange = vi.fn();
    const { rerender } = render(
      <PeelStack items={items} defaultActiveId="material" onActiveChange={onActiveChange} />,
    );
    rerender(<PeelStack items={[items[1], items[2], items[0]]} onActiveChange={onActiveChange} />);
    expect(screen.getByRole("status")).toHaveTextContent("01 / 03Material notes");
    rerender(<PeelStack items={[items[2], items[0]]} onActiveChange={onActiveChange} />);
    expect(screen.getByRole("status")).toHaveTextContent("01 / 02Field recordings");
    rerender(<PeelStack items={items} onActiveChange={onActiveChange} />);
    expect(screen.getByRole("status")).toHaveTextContent("03 / 03Field recordings");
    expect(onActiveChange).not.toHaveBeenCalled();
  });

  it("handles unknown IDs, empty lists, replenished lists, and a single card", () => {
    const onActiveChange = vi.fn();
    const { container, rerender } = render(
      <PeelStack items={items} activeId="missing" onActiveChange={onActiveChange} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Form studies");
    rerender(<PeelStack items={[]} onActiveChange={onActiveChange} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<PeelStack items={[items[2]]} onActiveChange={onActiveChange} />);
    expect(screen.getByRole("status")).toHaveTextContent("01 / 01Field recordings");
    for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled();
    fireEvent.keyDown(viewport(), { key: "ArrowRight" });
    expect(onActiveChange).not.toHaveBeenCalled();
    rerender(<PeelStack items={items} onActiveChange={onActiveChange} />);
    expect(screen.getByRole("status")).toHaveTextContent("03 / 03Field recordings");
  });

  it("supports keyboard navigation without taking arrow keys from content controls", () => {
    const withInput = [{ ...items[0], content: <input aria-label="Card note" /> }, ...items.slice(1)];
    const onActiveChange = vi.fn();
    render(<PeelStack items={withInput} onActiveChange={onActiveChange} />);
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "ArrowRight" });
    fireEvent.keyDown(viewport(), { key: "ArrowRight", altKey: true });
    fireEvent.keyDown(viewport(), { key: "Home" });
    expect(onActiveChange).not.toHaveBeenCalled();
    fireEvent.keyDown(viewport(), { key: "End" });
    expect(screen.getByRole("status")).toHaveTextContent("Field recordings");
    fireEvent.keyDown(viewport(), { key: "ArrowRight" });
    expect(screen.getByRole("status")).toHaveTextContent("Form studies");
    fireEvent.keyDown(viewport(), { key: "ArrowLeft" });
    expect(screen.getByRole("status")).toHaveTextContent("Field recordings");
    fireEvent.keyDown(viewport(), { key: "Home" });
    expect(screen.getByRole("status")).toHaveTextContent("Form studies");
  });

  it("exposes only the active card and returns focus if its content becomes inactive", () => {
    const { container, rerender } = render(<PeelStack items={items} activeId="form" />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    const link = screen.getByRole("link", { name: "Open forms" });
    link.focus();
    rerender(<PeelStack items={items} activeId="material" />);
    expect(viewport()).toHaveFocus();
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Open materials" })).toBeInTheDocument();
    expect(container.querySelector('[data-peel-stack-card="form"]')).toHaveAttribute("inert");
    expect(container.querySelector('[data-peel-stack-card="material"]')).not.toHaveAttribute("inert");
  });

  it("moves one card only after a horizontal swipe is released", () => {
    render(<PeelStack items={items} />);
    const stage = enablePointerCapture();
    pointer(stage, "pointerdown", 160);
    expect(screen.getByRole("status")).toHaveTextContent("Form studies");
    pointer(stage, "pointerup", 90);
    expect(screen.getByRole("status")).toHaveTextContent("Material notes");
    pointer(stage, "pointerdown", 90);
    pointer(stage, "pointerup", 160);
    expect(screen.getByRole("status")).toHaveTextContent("Form studies");
  });

  it("ignores taps, vertical gestures, interrupted gestures, and another pointer's release", () => {
    const onActiveChange = vi.fn();
    render(<PeelStack items={items} onActiveChange={onActiveChange} />);
    const stage = enablePointerCapture();
    pointer(stage, "pointerdown", 100);
    pointer(stage, "pointerup", 105);
    pointer(stage, "pointerdown", 100);
    pointer(stage, "pointerup", 150, 160);
    for (const interruption of ["pointercancel", "lostpointercapture"] as const) {
      pointer(stage, "pointerdown", 100);
      pointer(stage, interruption, 10);
      pointer(stage, "pointerup", 10);
    }
    pointer(stage, "pointerdown", 100);
    pointer(stage, "pointerup", 10, 50, 2);
    pointer(stage, "pointerup", 100);
    expect(onActiveChange).not.toHaveBeenCalled();
  });

  it("keeps gestures on links separate from stack navigation", () => {
    const onActiveChange = vi.fn();
    render(<PeelStack items={items} onActiveChange={onActiveChange} />);
    enablePointerCapture();
    const link = screen.getByRole("link", { name: "Open forms" });
    pointer(link, "pointerdown", 160);
    pointer(link, "pointerup", 20);
    expect(onActiveChange).not.toHaveBeenCalled();
  });
});
