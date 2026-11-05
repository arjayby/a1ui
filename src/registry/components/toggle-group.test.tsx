import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ToggleGroup, ToggleGroupItem, type ToggleGroupProps } from "./toggle-group";

function Example(props: ToggleGroupProps) {
  return (
    <ToggleGroup aria-label="View" duration={0} {...props}>
      <ToggleGroupItem value="list">List</ToggleGroupItem>
      <ToggleGroupItem value="board">Board</ToggleGroupItem>
      <ToggleGroupItem value="calendar" disabled>
        Calendar
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

describe("ToggleGroup", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("moves one sliding surface between items and keeps a pressed item pressed", () => {
    const onValueChange = vi.fn();
    render(<Example defaultValue={["list"]} onValueChange={onValueChange} />);
    expect(screen.getByRole("group", { name: "View" })).toBeInTheDocument();
    const list = screen.getByRole("button", { name: "List" });
    const board = screen.getByRole("button", { name: "Board" });
    expect(list).toHaveAttribute("aria-pressed", "true");
    expect(list.querySelector('[data-slot="toggle-group-indicator"]')).not.toBeNull();

    fireEvent.click(board);
    expect(onValueChange).toHaveBeenLastCalledWith(["board"]);
    expect(board).toHaveAttribute("aria-pressed", "true");
    expect(list).toHaveAttribute("aria-pressed", "false");
    expect(document.querySelectorAll('[data-slot="toggle-group-indicator"]')).toHaveLength(1);
    expect(board.querySelector('[data-slot="toggle-group-indicator"]')).not.toBeNull();

    onValueChange.mockClear();
    fireEvent.click(board);
    expect(onValueChange).not.toHaveBeenCalled();
    expect(board).toHaveAttribute("aria-pressed", "true");
  });

  it("waits for the caller in controlled mode and ignores disabled items", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<Example value={["list"]} onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Board" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["board"]);
    expect(screen.getByRole("button", { name: "List" })).toHaveAttribute("aria-pressed", "true");

    rerender(<Example value={["board"]} onValueChange={onValueChange} />);
    expect(screen.getByRole("button", { name: "Board" })).toHaveAttribute("aria-pressed", "true");

    onValueChange.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Calendar" }));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("presses chips independently with a fill and check in multiple mode", () => {
    const onValueChange = vi.fn();
    render(<Example multiple variant="outline" defaultValue={["list"]} onValueChange={onValueChange} />);
    const list = screen.getByRole("button", { name: "List" });
    const board = screen.getByRole("button", { name: "Board" });
    expect(screen.getByRole("group")).toHaveAttribute("data-multiple");
    expect(list.querySelector('[data-slot="toggle-group-fill"]')).not.toBeNull();
    expect(list.querySelector('[data-slot="toggle-group-check"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="toggle-group-indicator"]')).toBeNull();

    fireEvent.click(board);
    expect(onValueChange).toHaveBeenLastCalledWith(["list", "board"]);
    expect(list).toHaveAttribute("aria-pressed", "true");
    expect(board).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(list);
    expect(onValueChange).toHaveBeenLastCalledWith(["board"]);
    expect(list).toHaveAttribute("aria-pressed", "false");
  });

  it("names icon-only items with aria-label and warns when it is missing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <ToggleGroup aria-label="Alignment" duration={0} defaultValue={["left"]}>
        <ToggleGroupItem value="left" aria-label="Align left">
          <svg />
        </ToggleGroupItem>
        <ToggleGroupItem value="center">
          <svg />
        </ToggleGroupItem>
      </ToggleGroup>,
    );
    expect(screen.getByRole("button", { name: "Align left" })).toHaveAttribute("data-icon-only");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('"center"');
  });

  it("requires the ToggleGroup root", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ToggleGroupItem value="orphan">Orphan</ToggleGroupItem>)).toThrow(
      "ToggleGroupItem must be used within ToggleGroup.",
    );
  });
});
