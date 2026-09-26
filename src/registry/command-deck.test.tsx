import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CommandDeck, type CommandDeckAction } from "./command-deck";

afterEach(cleanup);

const actions: CommandDeckAction[] = [
  { id: "open", label: "Open components", shortcut: "G C" },
  { id: "browse", label: "Browse categories", keywords: ["discover"] },
  { id: "locked", label: "Locked action", disabled: true },
  { id: "theme", label: "Toggle appearance", shortcut: "T" },
];

describe("CommandDeck", () => {
  it("searches labels and keywords and reports the selected action", () => {
    const onAction = vi.fn();
    render(<CommandDeck actions={actions} onAction={onAction} />);
    const input = screen.getByRole("combobox", { name: "Find an action" });
    fireEvent.change(input, { target: { value: "discover" } });
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("option", { name: "Browse categories" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onAction).toHaveBeenCalledWith(actions[1]);
    expect(screen.getByRole("status")).toHaveTextContent("Browse categories selected");
  });

  it("wraps arrow navigation over enabled actions and skips disabled actions", () => {
    const onAction = vi.fn();
    render(<CommandDeck actions={actions} onAction={onAction} />);
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(screen.getByRole("option", { name: "Toggle appearance" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getByRole("option", { name: "Browse categories" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    fireEvent.click(screen.getByRole("option", { name: "Locked action" }));
    expect(onAction).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onAction).toHaveBeenCalledWith(actions[1]);
  });

  it("clears search with Escape, then releases focus", () => {
    render(<CommandDeck actions={actions} />);
    const input = screen.getByRole("combobox");
    input.focus();
    fireEvent.change(input, { target: { value: "missing" } });
    expect(screen.getByText("No matching actions")).toBeInTheDocument();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input).toHaveValue("");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input).not.toHaveFocus();
  });

  it("focuses the input with Command/Ctrl+K when enabled", () => {
    render(<CommandDeck actions={actions} enableGlobalShortcut />);
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(input).toHaveFocus();
    input.blur();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(input).toHaveFocus();
  });
});
