import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ReorderList, ReorderListHandle, ReorderListItem } from "./reorder-list";

const fruit = ["Apple", "Banana", "Cherry", "Damson"];
// Banana is a taller row, so the geometry tests cover mixed heights.
const heights: Record<string, number> = { Banana: 80 };
const GAP = 8;

function List({
  handle = true,
  ...props
}: Partial<Parameters<typeof ReorderList<string>>[0]> & { handle?: boolean }) {
  return (
    <ReorderList label="Fruit" defaultItems={fruit} {...props}>
      {(item) => (
        <ReorderListItem>
          <span>{item}</span>
          {handle && <ReorderListHandle />}
        </ReorderListItem>
      )}
    </ReorderList>
  );
}

const order = () => screen.getAllByRole("listitem").map((row) => row.querySelector("span")?.textContent);
const handle = (name: string) => screen.getByRole("button", { name: `Reorder ${name}` });
const row = (name: string) => screen.getByText(name).closest("li") as HTMLLIElement;
const pointer = (y: number, x = 10) => ({ pointerId: 1, button: 0, clientX: x, clientY: y });

describe("ReorderList", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
    // jsdom has no layout, so rows are stacked by their place in the DOM.
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      let top = 0;
      let height = 0;
      if (this.matches('[data-slot="reorder-list-item"]')) {
        const rows = [...(this.parentElement?.children ?? [])];
        const size = (el: Element) => heights[el.querySelector("span")?.textContent ?? ""] ?? 40;
        for (const el of rows.slice(0, rows.indexOf(this))) top += size(el) + GAP;
        height = size(this);
      }
      return { top, height, bottom: top + height, left: 0, right: 300, width: 300, x: 0, y: top } as DOMRect;
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("moves a row with the keyboard and reports one reorder on drop", () => {
    const onReorder = vi.fn();
    render(<List onReorder={onReorder} />);
    expect(screen.getByRole("list", { name: "Fruit" })).toBeVisible();
    const apple = handle("Apple");
    expect(apple).toHaveAccessibleDescription(/Press Space to pick up/);
    apple.focus();
    fireEvent.keyDown(apple, { key: " " });
    expect(apple).toHaveAttribute("aria-pressed", "true");
    expect(row("Apple")).toHaveAttribute("data-lifted");
    expect(screen.getByText(/^Picked up Apple\. Position 1 of 4\./)).toBeInTheDocument();
    fireEvent.keyDown(apple, { key: "ArrowDown" });
    fireEvent.keyDown(apple, { key: "ArrowDown" });
    expect(screen.getByText("Apple moved to position 3 of 4.")).toBeInTheDocument();
    // The order is only previewed until the row is dropped.
    expect(order()).toEqual(fruit);
    expect(onReorder).not.toHaveBeenCalled();
    fireEvent.keyDown(apple, { key: " " });
    expect(order()).toEqual(["Banana", "Cherry", "Apple", "Damson"]);
    expect(onReorder).toHaveBeenCalledExactlyOnceWith(["Banana", "Cherry", "Apple", "Damson"], {
      from: 0,
      to: 2,
    });
    expect(screen.getByText("Apple dropped at position 3 of 4.")).toBeInTheDocument();
    expect(handle("Apple")).toHaveAttribute("aria-pressed", "false");
    expect(handle("Apple")).toHaveFocus();
  });

  it("jumps to either end, stops at the ends, and restores the order on Escape", () => {
    const onReorder = vi.fn();
    render(<List onReorder={onReorder} />);
    const cherry = handle("Cherry");
    cherry.focus();
    fireEvent.keyDown(cherry, { key: "Enter" });
    fireEvent.keyDown(cherry, { key: "End" });
    expect(screen.getByText("Cherry moved to position 4 of 4.")).toBeInTheDocument();
    fireEvent.keyDown(cherry, { key: "ArrowDown" });
    expect(screen.getByText("Cherry moved to position 4 of 4.")).toBeInTheDocument();
    fireEvent.keyDown(cherry, { key: "Home" });
    expect(screen.getByText("Cherry moved to position 1 of 4.")).toBeInTheDocument();
    fireEvent.keyDown(cherry, { key: "Escape" });
    expect(screen.getByText("Reorder cancelled. Cherry returned to position 3 of 4.")).toBeInTheDocument();
    expect(order()).toEqual(fruit);
    expect(onReorder).not.toHaveBeenCalled();
    expect(row("Cherry")).not.toHaveAttribute("data-lifted");
    // Arrow keys do nothing until a row is picked up.
    fireEvent.keyDown(cherry, { key: "ArrowUp" });
    fireEvent.keyDown(cherry, { key: " " });
    fireEvent.keyDown(cherry, { key: " ", repeat: true });
    expect(row("Cherry")).toHaveAttribute("data-lifted");
  });

  it("drops a held row when focus leaves it", () => {
    const onReorder = vi.fn();
    render(<List onReorder={onReorder} />);
    const damson = handle("Damson");
    damson.focus();
    fireEvent.keyDown(damson, { key: " " });
    fireEvent.keyDown(damson, { key: "ArrowUp" });
    fireEvent.blur(damson);
    expect(order()).toEqual(["Apple", "Banana", "Damson", "Cherry"]);
    expect(onReorder).toHaveBeenCalledTimes(1);
  });

  it("waits for a controlled parent and follows the order it is given", () => {
    const onReorder = vi.fn();
    const { rerender } = render(<List items={fruit} onReorder={onReorder} />);
    const apple = handle("Apple");
    fireEvent.keyDown(apple, { key: " " });
    fireEvent.keyDown(apple, { key: "ArrowDown" });
    fireEvent.keyDown(apple, { key: " " });
    expect(onReorder).toHaveBeenCalledWith(["Banana", "Apple", "Cherry", "Damson"], { from: 0, to: 1 });
    expect(order()).toEqual(fruit);
    rerender(<List items={["Damson", "Cherry", "Banana", "Apple"]} onReorder={onReorder} />);
    expect(order()).toEqual(["Damson", "Cherry", "Banana", "Apple"]);
  });

  it("keys object items by id and names them with getLabel", () => {
    function Tasks() {
      const [tasks, setTasks] = useState([
        { id: "a", title: "Write" },
        { id: "b", title: "Review" },
      ]);
      return (
        <ReorderList label="Tasks" items={tasks} onReorder={setTasks} getLabel={(task) => task.title}>
          {(task) => (
            <ReorderListItem>
              <span>{task.title}</span>
              <ReorderListHandle />
            </ReorderListItem>
          )}
        </ReorderList>
      );
    }
    render(<Tasks />);
    const review = handle("Review");
    fireEvent.keyDown(review, { key: " " });
    fireEvent.keyDown(review, { key: "ArrowUp" });
    fireEvent.keyDown(review, { key: " " });
    expect(order()).toEqual(["Review", "Write"]);
    expect(screen.getByText("Review dropped at position 1 of 2.")).toBeInTheDocument();
  });

  it("drags a row by its handle past rows of different heights", () => {
    const onReorder = vi.fn();
    render(<List onReorder={onReorder} />);
    // Apple spans 0 to 40, Banana 48 to 128, Cherry 136 to 176, Damson 184 to 224.
    fireEvent.pointerDown(handle("Apple"), pointer(20));
    expect(row("Apple")).toHaveAttribute("data-lifted");
    expect(screen.getByRole("list").parentElement).toHaveAttribute("data-dragging");
    // Apple's bottom edge has to pass Banana's centre at 88 before Banana gives way.
    fireEvent.pointerMove(document, pointer(50));
    fireEvent.pointerMove(document, pointer(66));
    fireEvent.pointerUp(document, pointer(66));
    expect(order()).toEqual(fruit);
    expect(onReorder).not.toHaveBeenCalled();
    fireEvent.pointerDown(handle("Apple"), pointer(20));
    fireEvent.pointerMove(document, pointer(150));
    fireEvent.pointerUp(document, pointer(150));
    expect(order()).toEqual(["Banana", "Cherry", "Apple", "Damson"]);
    expect(onReorder).toHaveBeenCalledExactlyOnceWith(["Banana", "Cherry", "Apple", "Damson"], {
      from: 0,
      to: 2,
    });
    expect(screen.getByText("Apple moved to position 3 of 4.")).toBeInTheDocument();
    expect(screen.getByRole("list").parentElement).not.toHaveAttribute("data-dragging");
  });

  it("restores the order when a drag is cancelled", () => {
    const onReorder = vi.fn();
    render(<List onReorder={onReorder} />);
    fireEvent.pointerDown(handle("Damson"), pointer(200));
    fireEvent.pointerMove(document, pointer(10));
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.pointerUp(document, pointer(10));
    expect(order()).toEqual(fruit);
    fireEvent.pointerDown(handle("Damson"), pointer(200));
    fireEvent.pointerMove(document, pointer(10));
    fireEvent.pointerCancel(document, pointer(10));
    expect(order()).toEqual(fruit);
    expect(onReorder).not.toHaveBeenCalled();
    expect(row("Damson")).not.toHaveAttribute("data-lifted");
  });

  it("drags the whole row when there is no handle, after a vertical threshold", () => {
    const onReorder = vi.fn();
    render(
      <ReorderList label="Fruit" defaultItems={fruit} onReorder={onReorder}>
        {(item) => (
          <ReorderListItem>
            <span>{item}</span>
            <button type="button">Edit {item}</button>
          </ReorderListItem>
        )}
      </ReorderList>,
    );
    expect(screen.queryByRole("button", { name: /Reorder/ })).not.toBeInTheDocument();
    expect(row("Apple")).toHaveAttribute("tabindex", "0");
    const root = screen.getByRole("list").parentElement;
    // A press lifts the row at once, but a few pixels of travel are not a drag yet.
    fireEvent.pointerDown(row("Apple"), pointer(20));
    expect(row("Apple")).toHaveAttribute("data-lifted");
    fireEvent.pointerMove(document, pointer(23));
    expect(root).not.toHaveAttribute("data-dragging");
    fireEvent.pointerUp(document, pointer(23));
    expect(row("Apple")).not.toHaveAttribute("data-lifted");
    // Leaving sideways is text selection, so the row lets go.
    fireEvent.pointerDown(row("Apple"), pointer(20));
    fireEvent.pointerMove(document, pointer(22, 40));
    expect(row("Apple")).not.toHaveAttribute("data-lifted");
    fireEvent.pointerMove(document, pointer(150, 40));
    fireEvent.pointerUp(document, pointer(150, 40));
    expect(order()).toEqual(fruit);
    // Controls inside the row keep their own presses.
    fireEvent.pointerDown(screen.getByRole("button", { name: "Edit Apple" }), pointer(20));
    expect(row("Apple")).not.toHaveAttribute("data-lifted");
    fireEvent.pointerUp(document, pointer(20));
    // Vertical travel past the threshold starts the drag.
    fireEvent.pointerDown(row("Damson"), pointer(200));
    fireEvent.pointerMove(document, pointer(190));
    expect(root).toHaveAttribute("data-dragging");
    fireEvent.pointerMove(document, pointer(30));
    fireEvent.pointerUp(document, pointer(30));
    expect(order()).toEqual(["Damson", "Apple", "Banana", "Cherry"]);
    // The row itself takes the keyboard when it has no handle.
    fireEvent.keyDown(row("Damson"), { key: " " });
    fireEvent.keyDown(row("Damson"), { key: "ArrowDown" });
    fireEvent.keyDown(row("Damson"), { key: " " });
    expect(order()).toEqual(["Apple", "Damson", "Banana", "Cherry"]);
    expect(onReorder).toHaveBeenCalledTimes(2);
  });

  it("moves focus off the row once it has a handle, and ignores input when disabled", () => {
    const onReorder = vi.fn();
    const { rerender } = render(<List onReorder={onReorder} />);
    expect(row("Apple")).not.toHaveAttribute("tabindex");
    rerender(<List onReorder={onReorder} disabled />);
    expect(handle("Apple")).toBeDisabled();
    fireEvent.pointerDown(handle("Apple"), pointer(20));
    fireEvent.keyDown(handle("Apple"), { key: " " });
    expect(row("Apple")).not.toHaveAttribute("data-lifted");
    rerender(<List onReorder={onReorder} disabled handle={false} />);
    expect(row("Apple")).not.toHaveAttribute("tabindex");
    fireEvent.pointerDown(row("Apple"), pointer(20));
    expect(row("Apple")).not.toHaveAttribute("data-lifted");
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("rejects parts rendered outside a list", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ReorderListItem>Alone</ReorderListItem>)).toThrow("inside ReorderList");
    expect(() => render(<ReorderListHandle />)).toThrow("inside ReorderList");
  });
});
