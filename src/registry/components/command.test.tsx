import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
  type CommandDialogProps,
  type CommandProps,
} from "./command";

function Palette({ onBilling, ...props }: CommandProps & { onBilling?: () => void }) {
  return (
    <Command duration={0} {...props}>
      <CommandInput />
      <CommandList>
        <CommandEmpty>Nothing matches.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem value="Calendar" keywords={["schedule"]}>
            Calendar
          </CommandItem>
          <CommandItem value="Calculator">Calculator</CommandItem>
        </CommandGroup>
        <CommandGroup heading="Settings">
          <CommandItem value="Billing" onSelect={onBilling}>
            Billing
            <CommandShortcut>⌘B</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

const items = () => screen.queryAllByRole("option").map((option) => option.textContent);
const highlights = () => document.querySelectorAll('[data-slot="command-highlight"]');

describe("Command", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("filters by value and keywords, hides empty groups, and shows the empty state", async () => {
    render(<Palette />);
    const input = screen.getByRole("combobox", { name: "Search commands" });
    expect(items()).toEqual(["Calendar", "Calculator", "Billing⌘B"]);
    expect(screen.getByText("Suggestions")).toBeInTheDocument();
    expect(screen.queryByText("Nothing matches.")).toBeNull();
    expect(screen.getByText("⌘B").tagName).toBe("KBD");

    fireEvent.change(input, { target: { value: "sched" } });
    await waitFor(() => expect(items()).toEqual(["Calendar"]));
    await waitFor(() => expect(screen.queryByText("Settings")).toBeNull());

    fireEvent.change(input, { target: { value: "zzz" } });
    await waitFor(() => expect(items()).toEqual([]));
    expect(screen.getByRole("status")).toHaveTextContent("Nothing matches.");
  });

  it("keeps one highlight that follows the arrow keys", async () => {
    render(<Palette />);
    const input = screen.getByRole("combobox");
    input.focus();
    await waitFor(() => expect(highlights()).toHaveLength(1));
    expect(screen.getByRole("option", { name: "Calendar" })).toContainElement(highlights()[0] as HTMLElement);

    fireEvent.keyDown(input, { key: "ArrowDown" });
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Calculator" })).toContainElement(
        highlights()[0] as HTMLElement,
      ),
    );
    expect(highlights()).toHaveLength(1);
  });

  it("runs the highlighted item with Enter without copying its label into the search", async () => {
    const onSelect = vi.fn();
    const onBilling = vi.fn();
    render(<Palette onSelect={onSelect} onBilling={onBilling} />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "bill" } });
    await waitFor(() => expect(items()).toEqual(["Billing⌘B"]));
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onBilling).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenLastCalledWith("Billing");
    expect(input).toHaveValue("bill");

    fireEvent.click(screen.getByRole("option", { name: /Billing/ }));
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it("waits for the caller to update a controlled search", () => {
    const onSearchChange = vi.fn();
    const { rerender } = render(<Palette search="" onSearchChange={onSearchChange} />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "cal" } });
    expect(onSearchChange).toHaveBeenLastCalledWith("cal");
    expect(items()).toHaveLength(3);

    rerender(<Palette search="calc" onSearchChange={onSearchChange} />);
    expect(input).toHaveValue("calc");
    expect(items()).toEqual(["Calculator"]);
  });

  it("requires the Command root", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<CommandItem value="orphan">Orphan</CommandItem>)).toThrow(
      "CommandItem must be used within Command.",
    );
  });
});

describe("CommandDialog", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  function Example(props: CommandDialogProps & { onSelect?: (value: string) => void }) {
    const { onSelect, ...dialog } = props;
    return (
      <CommandDialog duration={0} {...dialog}>
        <Palette onSelect={onSelect} />
      </CommandDialog>
    );
  }

  it("opens on Ctrl+K, focuses the search, and closes after a command runs", async () => {
    const onOpenChange = vi.fn();
    const onSelect = vi.fn();
    render(<Example shortcut onOpenChange={onOpenChange} onSelect={onSelect} />);
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    const dialog = await screen.findByRole("dialog", { name: "Command palette" });
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    await waitFor(() => expect(screen.getByRole("combobox")).toHaveFocus());

    fireEvent.click(screen.getByRole("option", { name: "Calculator" }));
    expect(onSelect).toHaveBeenLastCalledWith("Calculator");
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
  });

  it("ignores the shortcut unless enabled and follows a custom key", async () => {
    const { rerender } = render(<Example />);
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(screen.queryByRole("dialog")).toBeNull();

    rerender(<Example shortcut="j" />);
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.keyDown(window, { key: "j", metaKey: true });
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});
