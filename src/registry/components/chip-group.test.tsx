import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChipGroup, ChipGroupItem, type ChipGroupProps } from "./chip-group";

function Example(props: ChipGroupProps) {
  return (
    <ChipGroup aria-label="View" duration={0} {...props}>
      <ChipGroupItem value="list">List</ChipGroupItem>
      <ChipGroupItem value="board">Board</ChipGroupItem>
      <ChipGroupItem value="calendar" disabled>
        Calendar
      </ChipGroupItem>
    </ChipGroup>
  );
}

describe("ChipGroup", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("waits for the caller in controlled mode and ignores disabled items", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<Example value={["list"]} onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Board" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["list", "board"]);
    expect(screen.getByRole("button", { name: "Board" })).toHaveAttribute("aria-pressed", "false");

    rerender(<Example value={["list", "board"]} onValueChange={onValueChange} />);
    expect(screen.getByRole("button", { name: "Board" })).toHaveAttribute("aria-pressed", "true");

    onValueChange.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Calendar" }));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("presses chips independently with a fill and a check, and can empty", () => {
    const onValueChange = vi.fn();
    render(<Example variant="outline" defaultValue={["list"]} onValueChange={onValueChange} />);
    const list = screen.getByRole("button", { name: "List" });
    const board = screen.getByRole("button", { name: "Board" });
    expect(list.querySelector('[data-slot="chip-group-fill"]')).not.toBeNull();
    expect(list.querySelector('[data-slot="chip-group-check"]')).not.toBeNull();

    fireEvent.click(board);
    expect(onValueChange).toHaveBeenLastCalledWith(["list", "board"]);
    expect(list).toHaveAttribute("aria-pressed", "true");
    expect(board).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(list);
    expect(onValueChange).toHaveBeenLastCalledWith(["board"]);
    expect(list).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(board);
    expect(onValueChange).toHaveBeenLastCalledWith([]);
    expect(board).toHaveAttribute("aria-pressed", "false");
  });

  it("names icon-only items with aria-label and warns when it is missing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <ChipGroup aria-label="Alignment" duration={0} defaultValue={["left"]}>
        <ChipGroupItem value="left" aria-label="Align left">
          <svg />
        </ChipGroupItem>
        <ChipGroupItem value="center">
          <svg />
        </ChipGroupItem>
      </ChipGroup>,
    );
    expect(screen.getByRole("button", { name: "Align left" })).toHaveAttribute("data-icon-only");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('"center"');
  });

  it("requires the ChipGroup root", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ChipGroupItem value="orphan">Orphan</ChipGroupItem>)).toThrow(
      "ChipGroupItem must be used within ChipGroup.",
    );
  });
});
