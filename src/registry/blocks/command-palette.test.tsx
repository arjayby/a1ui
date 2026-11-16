import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CommandPalette,
  matchCommand,
  type CommandPaletteItem,
  type CommandPaletteProps,
} from "./command-palette";

const openDocs = vi.fn();

const items: CommandPaletteItem[] = [
  { id: "docs", group: "Go to", label: "Documentation", keywords: ["guide"], onSelect: openDocs },
  { id: "blocks", group: "Go to", label: "Blocks", description: "Ready-made compositions" },
  { id: "new", group: "Actions", label: "New project", shortcut: ["⌘", "N"] },
  { id: "delete", group: "Actions", label: "Delete project", disabled: true },
  {
    id: "theme",
    group: "Actions",
    label: "Change theme",
    keywords: ["appearance"],
    children: [
      { id: "light", label: "Light" },
      { id: "dark", label: "Dark" },
    ],
  },
  { id: "feedback", group: "Help", label: "Send feedback" },
];

function Example(props: Partial<CommandPaletteProps>) {
  return <CommandPalette items={items} {...props} />;
}

const labels = () => screen.getAllByRole("option").map((option) => option.getAttribute("aria-labelledby"));
const names = () => labels().map((id) => document.getElementById(id!)?.textContent);
const activeName = () => {
  const id = screen.getByRole("combobox").getAttribute("aria-activedescendant");
  return id ? document.getElementById(`${id}-label`)?.textContent : null;
};

async function openPalette() {
  fireEvent.click(screen.getByRole("button", { name: /Search/ }));
  return screen.findByRole("combobox");
}

describe("matchCommand", () => {
  it("matches characters in order, case-insensitively, and rejects missing ones", () => {
    expect(matchCommand("NP", "New project")?.indices).toEqual([0, 4]);
    expect(matchCommand("xyz", "New project")).toBeNull();
    expect(matchCommand("projectnew", "New project")).toBeNull();
    expect(matchCommand("", "New project")).toEqual({ score: 0, indices: [] });
  });

  it("prefers word starts and unbroken runs over scattered letters", () => {
    // The p of "path" starts a word; the p of "Copy" does not.
    expect(matchCommand("cp", "Copy path")?.indices).toEqual([0, 5]);
    expect(matchCommand("the", "Change theme")?.indices).toEqual([7, 8, 9]);
    const prefix = matchCommand("bl", "Blocks")!;
    const scattered = matchCommand("bl", "Keyboard labels")!;
    expect(prefix.score).toBeGreaterThan(scattered.score);
  });

  it("ignores spaces in the query", () => {
    expect(matchCommand("new pro", "New project")?.indices).toEqual([0, 1, 2, 4, 5, 6]);
  });
});

describe("CommandPalette", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
    openDocs.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("opens from its trigger as a combobox that owns a grouped listbox", async () => {
    const onOpenChange = vi.fn();
    render(<Example onOpenChange={onOpenChange} />);
    expect(screen.queryByRole("dialog")).toBeNull();

    const input = await openPalette();
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole("dialog", { name: "Command palette" })).toHaveAttribute("data-state", "open");

    const listbox = screen.getByRole("listbox", { name: "Command palette" });
    expect(input).toHaveAttribute("aria-controls", listbox.id);
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(
      within(listbox)
        .getAllByRole("group")
        .map((group) => group.getAttribute("aria-labelledby")),
    ).toHaveLength(3);
    expect(within(listbox).getByRole("group", { name: "Go to" })).toContainElement(
      screen.getByRole("option", { name: "Documentation" }),
    );
    expect(screen.getByRole("option", { name: "Blocks" })).toHaveAccessibleDescription(
      "Ready-made compositions",
    );
    expect(screen.getByRole("option", { name: "Delete project" })).toHaveAttribute("aria-disabled", "true");

    // The first row is active from the start, and only the active row holds the highlight.
    expect(activeName()).toBe("Documentation");
    expect(screen.getByRole("option", { name: "Documentation" })).toHaveAttribute("aria-selected", "true");
    expect(document.querySelectorAll('[data-slot="command-palette-highlight"]')).toHaveLength(1);
    await waitFor(() => expect(input).toHaveFocus());
  });

  it("toggles with ⌘K and Ctrl+K, and not when the shortcut is off", async () => {
    const { rerender } = render(<Example />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(await screen.findByRole("combobox")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "K", ctrlKey: true });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    // Other chords that include K are left alone.
    fireEvent.keyDown(document, { key: "k", metaKey: true, shiftKey: true });
    fireEvent.keyDown(document, { key: "k" });
    expect(screen.queryByRole("dialog")).toBeNull();

    rerender(<Example shortcut={false} />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(screen.queryByRole("dialog")).toBeNull();

    rerender(<Example shortcut="j" />);
    fireEvent.keyDown(document, { key: "j", ctrlKey: true });
    expect(await screen.findByRole("combobox")).toBeInTheDocument();
  });

  it("filters by label and keywords, ranks the best match first, and marks matched characters", async () => {
    render(<Example />);
    const input = await openPalette();

    fireEvent.change(input, { target: { value: "pro" } });
    await waitFor(() => expect(names()).toEqual(["New project", "Delete project"]));
    const marks = within(screen.getByRole("option", { name: "New project" })).getAllByText("pro");
    expect(marks[0].tagName).toBe("MARK");
    // Groups without a match leave with their heading.
    await waitFor(() => expect(screen.getAllByRole("group")).toHaveLength(1));
    expect(screen.getByRole("status")).toHaveTextContent("2 results");

    // A keyword match lists the item without marking its label.
    fireEvent.change(input, { target: { value: "appear" } });
    await waitFor(() => expect(names()).toEqual(["Change theme"]));
    expect(screen.getByRole("option", { name: "Change theme" }).querySelector("mark")).toBeNull();

    // The better match moves to the top, and the highlight goes with it.
    fireEvent.change(input, { target: { value: "d" } });
    await waitFor(() => expect(names()[0]).toBe("Documentation"));
    expect(activeName()).toBe("Documentation");

    fireEvent.change(input, { target: { value: "zzz" } });
    await waitFor(() => expect(screen.queryAllByRole("option")).toHaveLength(0));
    expect(screen.getByText("No results for “zzz”")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("No results");
    expect(input).not.toHaveAttribute("aria-activedescendant");
  });

  it("moves the active row with the arrow keys, Home, and End, skipping disabled rows", async () => {
    render(<Example />);
    const input = await openPalette();

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(activeName()).toBe("Blocks");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    // "Delete project" is disabled, so the highlight steps over it.
    expect(activeName()).toBe("Change theme");
    fireEvent.keyDown(input, { key: "End" });
    expect(activeName()).toBe("Send feedback");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(activeName()).toBe("Send feedback");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(activeName()).toBe("Change theme");
    fireEvent.keyDown(input, { key: "Home" });
    expect(activeName()).toBe("Documentation");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(activeName()).toBe("Documentation");
    expect(screen.getAllByRole("option", { selected: true })).toHaveLength(1);
    expect(input).toHaveFocus();
  });

  it("runs the active item with Enter, calls both callbacks, and closes", async () => {
    const onSelect = vi.fn();
    render(<Example onSelect={onSelect} />);
    const input = await openPalette();

    // Enter confirms an IME composition before it runs anything.
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(onSelect).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Enter" });
    expect(openDocs).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "docs" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("follows a moving pointer, ignores a resting one, and runs a row on click", async () => {
    const onSelect = vi.fn();
    render(<Example onSelect={onSelect} />);
    const input = await openPalette();
    const feedback = screen.getByRole("option", { name: "Send feedback" });
    const blocks = screen.getByRole("option", { name: "Blocks" });

    // The first event only tells the palette where the pointer rests.
    fireEvent.pointerMove(feedback, { clientX: 40, clientY: 200 });
    expect(activeName()).toBe("Documentation");
    fireEvent.pointerMove(feedback, { clientX: 41, clientY: 201 });
    expect(activeName()).toBe("Send feedback");

    // The keyboard takes over, and rows passing under the resting pointer do not take it back.
    fireEvent.keyDown(input, { key: "Home" });
    fireEvent.pointerMove(blocks, { clientX: 41, clientY: 201 });
    expect(activeName()).toBe("Documentation");
    fireEvent.pointerMove(blocks, { clientX: 44, clientY: 190 });
    expect(activeName()).toBe("Blocks");

    // Disabled rows never take the highlight or run.
    const disabled = screen.getByRole("option", { name: "Delete project" });
    fireEvent.pointerMove(disabled, { clientX: 50, clientY: 150 });
    fireEvent.pointerDown(disabled);
    fireEvent.click(disabled);
    expect(activeName()).toBe("Blocks");
    expect(onSelect).not.toHaveBeenCalled();

    // A press lands the highlight before the click commits.
    const project = screen.getByRole("option", { name: "New project" });
    fireEvent.pointerDown(project);
    expect(activeName()).toBe("New project");
    fireEvent.click(project);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "new" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("opens a nested page and goes back with Backspace on an empty query or the back button", async () => {
    const onSelect = vi.fn();
    render(<Example onSelect={onSelect} />);
    const input = await openPalette();

    fireEvent.change(input, { target: { value: "theme" } });
    await waitFor(() => expect(names()).toEqual(["Change theme"]));
    expect(screen.getByRole("option", { name: "Change theme" })).toHaveAccessibleDescription("Opens a list");
    fireEvent.keyDown(input, { key: "Enter" });

    // The page replaces the list, clears the query, and nothing has run yet.
    await waitFor(() => expect(names()).toEqual(["Light", "Dark"]));
    expect(input).toHaveValue("");
    expect(input).toHaveAccessibleName("Search Change theme");
    expect(screen.getByRole("listbox", { name: "Change theme" })).toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Backspace edits the query first. Only an empty query goes back.
    fireEvent.change(input, { target: { value: "d" } });
    fireEvent.keyDown(input, { key: "Backspace" });
    expect(screen.getByRole("listbox", { name: "Change theme" })).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.keyDown(input, { key: "Backspace" });
    await waitFor(() => expect(names()).toContain("Documentation"));
    // It lands on the item the page was opened from.
    expect(activeName()).toBe("Change theme");

    fireEvent.click(screen.getByRole("option", { name: "Change theme" }));
    await waitFor(() => expect(names()).toEqual(["Light", "Dark"]));
    fireEvent.click(screen.getByRole("button", { name: "Back from Change theme" }));
    await waitFor(() => expect(names()).toContain("Documentation"));

    fireEvent.click(screen.getByRole("option", { name: "Change theme" }));
    await waitFor(() => expect(names()).toEqual(["Light", "Dark"]));
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "dark" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("closes with Escape, returns focus to the trigger, and starts over on the next open", async () => {
    render(<Example />);
    const trigger = screen.getByRole("button", { name: /Search/ });
    trigger.focus();
    const input = await openPalette();
    await waitFor(() => expect(input).toHaveFocus());
    fireEvent.change(input, { target: { value: "pro" } });

    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());

    const reopened = await openPalette();
    expect(reopened).toHaveValue("");
    expect(activeName()).toBe("Documentation");
  });

  it("turns the same dialog around when the shortcut is pressed again before its exit ends", async () => {
    render(<Example />);
    const input = await openPalette();
    await waitFor(() => expect(input).toHaveFocus());
    fireEvent.change(input, { target: { value: "pro" } });
    const dialog = screen.getByRole("dialog");

    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(dialog).toHaveAttribute("data-state", "closed");
    // While it leaves it is still drawn, but out of reach.
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("inert");

    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(dialog).toHaveAttribute("data-state", "open");
    expect(dialog).not.toHaveAttribute("inert");

    // The exit it was part-way through never finishes, so nothing unmounts it afterwards.
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(screen.getByRole("dialog")).toBe(dialog);
    expect(screen.getByRole("combobox")).toHaveValue("pro");
  });

  it("can be controlled without the built-in trigger", async () => {
    function Controlled() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open commands
          </button>
          <CommandPalette items={items} open={open} onOpenChange={setOpen} trigger={false} label="Commands" />
        </>
      );
    }
    render(<Controlled />);
    expect(screen.queryByRole("button", { name: /Search/ })).toBeNull();

    const opener = screen.getByRole("button", { name: "Open commands" });
    opener.focus();
    fireEvent.click(opener);
    const input = await screen.findByRole("combobox");
    expect(screen.getByRole("dialog", { name: "Commands" })).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    // With no trigger of its own, focus goes back to the control that opened it.
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("stays open when a controlling parent ignores the request to close", async () => {
    const onOpenChange = vi.fn();
    render(<Example open onOpenChange={onOpenChange} />);
    const input = await screen.findByRole("combobox");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole("dialog")).toHaveAttribute("data-state", "open");
  });
});
