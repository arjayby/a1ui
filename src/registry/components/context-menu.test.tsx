import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState, type ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "./context-menu";

function Files({
  onAction = () => {},
  ...props
}: Partial<ComponentProps<typeof ContextMenu>> & { onAction?: (action: string) => void }) {
  const [pinned, setPinned] = useState(false);
  const [sort, setSort] = useState("name");

  return (
    <ContextMenu duration={0} {...props}>
      <ContextMenuTrigger tabIndex={0} data-testid="trigger">
        <button type="button">Report</button>
      </ContextMenuTrigger>
      <ContextMenuContent aria-label="File actions">
        <ContextMenuItem onClick={() => onAction("open")}>
          Open
          <ContextMenuShortcut>⌘O</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem disabled onClick={() => onAction("archive")}>
          Archive
        </ContextMenuItem>
        <ContextMenuSub duration={0}>
          <ContextMenuSubTrigger>Share</ContextMenuSubTrigger>
          <ContextMenuSubContent aria-label="Share">
            <ContextMenuItem onClick={() => onAction("copy")}>Copy link</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuCheckboxItem checked={pinned} onCheckedChange={setPinned}>
          Pinned
        </ContextMenuCheckboxItem>
        <ContextMenuGroup>
          <ContextMenuLabel>Sort by</ContextMenuLabel>
          <ContextMenuRadioGroup value={sort} onValueChange={setSort}>
            <ContextMenuRadioItem value="name">Name</ContextMenuRadioItem>
            <ContextMenuRadioItem value="size">Size</ContextMenuRadioItem>
          </ContextMenuRadioGroup>
        </ContextMenuGroup>
        <ContextMenuItem variant="destructive" onClick={() => onAction("delete")}>
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

const origin = () =>
  document
    .querySelector<HTMLElement>('[data-slot="context-menu-content"]')
    ?.parentElement?.style.getPropertyValue("--context-menu-origin");

describe("ContextMenu", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("opens at the pointer, grows from it, and runs an item", async () => {
    const onAction = vi.fn();
    const onOpenChange = vi.fn();
    render(<Files onAction={onAction} onOpenChange={onOpenChange} />);
    const trigger = screen.getByTestId("trigger");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.contextMenu(trigger, { clientX: 40, clientY: 60, button: 2 });
    const menu = await screen.findByRole("menu", { name: "File actions" });
    expect(onOpenChange).toHaveBeenLastCalledWith(true, expect.objectContaining({ reason: "trigger-press" }));
    expect(trigger).toHaveAttribute("data-popup-open");
    // jsdom lays the menu out at the viewport origin, so the pointer is its own offset.
    await waitFor(() => expect(origin()).toBe("40px 60px"));
    expect(menu.querySelector('[data-slot="context-menu-separator"]')).toHaveAttribute("role", "separator");
    expect(screen.getByRole("group", { name: "Sort by" })).toBeInTheDocument();
    expect(menu.querySelector('[data-slot="context-menu-shortcut"]')).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveAttribute("data-variant", "destructive");

    const open = screen.getByRole("menuitem", { name: /Open/ });
    fireEvent.mouseMove(open);
    await waitFor(() => expect(open).toHaveAttribute("data-highlighted"));
    expect(menu.querySelectorAll('[data-slot="context-menu-highlight"]')).toHaveLength(1);
    fireEvent.click(open);
    expect(onAction).toHaveBeenCalledWith("open");
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
    expect(onOpenChange).toHaveBeenLastCalledWith(false, expect.objectContaining({ reason: "item-press" }));
  });

  it.each([
    ["Shift+F10", { key: "F10", shiftKey: true }],
    ["the context-menu key", { key: "ContextMenu" }],
  ])("opens with %s below the focused element and lands on the first row", async (_, key) => {
    render(<Files />);
    const report = screen.getByRole("button", { name: "Report" });
    report.focus();
    expect(fireEvent.keyDown(report, key)).toBe(false);

    await screen.findByRole("menu", { name: "File actions" });
    await waitFor(() => expect(screen.getByRole("menuitem", { name: /Open/ })).toHaveFocus());
    // No pointer, so the menu grows from the anchor Base UI positioned it against.
    expect(origin()).toBe("");
    expect(document.querySelector('[data-slot="context-menu-content"]')?.parentElement).toHaveAttribute(
      "data-side",
      "bottom",
    );
  });

  it("leaves other keys and a prevented shortcut alone", () => {
    render(
      <ContextMenu duration={0}>
        <ContextMenuTrigger
          tabIndex={0}
          data-testid="trigger"
          onKeyDown={(event) => event.preventDefault()}
        />
        <ContextMenuContent aria-label="Actions">
          <ContextMenuItem>Open</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );
    fireEvent.keyDown(screen.getByTestId("trigger"), { key: "F10", shiftKey: true });
    fireEvent.keyDown(screen.getByTestId("trigger"), { key: "F10" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens on a long press from the touch point, and marks the trigger while the finger is down", async () => {
    vi.useFakeTimers();
    render(<Files />);
    const trigger = screen.getByTestId("trigger");

    fireEvent.touchStart(trigger, { touches: [{ clientX: 120, clientY: 80 }] });
    expect(trigger).toHaveAttribute("data-pressing");
    fireEvent.touchMove(trigger, { touches: [{ clientX: 160, clientY: 80 }] });
    expect(trigger).not.toHaveAttribute("data-pressing");
    act(() => vi.advanceTimersByTime(600));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.touchStart(trigger, { touches: [{ clientX: 120, clientY: 80 }] });
    act(() => vi.advanceTimersByTime(500));
    vi.useRealTimers();
    await screen.findByRole("menu", { name: "File actions" });
    expect(trigger).not.toHaveAttribute("data-pressing");
    await waitFor(() => expect(origin()).toBe("120px 80px"));
  });

  it("keeps the menu open for checkbox and radio items and moves the one radio dot", async () => {
    render(<Files />);
    fireEvent.contextMenu(screen.getByTestId("trigger"), { clientX: 10, clientY: 10, button: 2 });
    const menu = await screen.findByRole("menu", { name: "File actions" });

    const pinned = screen.getByRole("menuitemcheckbox", { name: "Pinned" });
    expect(pinned).toHaveAttribute("aria-checked", "false");
    fireEvent.click(pinned);
    expect(pinned).toHaveAttribute("aria-checked", "true");

    const name = screen.getByRole("menuitemradio", { name: "Name" });
    const size = screen.getByRole("menuitemradio", { name: "Size" });
    const dot = (item: HTMLElement) => item.querySelector('[data-slot="context-menu-indicator"] > span');
    expect(name).toHaveAttribute("aria-checked", "true");
    expect(dot(name)).toBeInTheDocument();
    expect(dot(size)).not.toBeInTheDocument();
    fireEvent.click(size);
    expect(size).toHaveAttribute("aria-checked", "true");
    expect(dot(size)).toBeInTheDocument();
    expect(dot(name)).not.toBeInTheDocument();
    expect(menu).toBeInTheDocument();
  });

  it("ignores disabled items, opens a submenu, and closes everything from an item inside it", async () => {
    const onAction = vi.fn();
    render(<Files onAction={onAction} />);
    fireEvent.contextMenu(screen.getByTestId("trigger"), { clientX: 10, clientY: 10, button: 2 });
    await screen.findByRole("menu", { name: "File actions" });

    const archive = screen.getByRole("menuitem", { name: "Archive" });
    expect(archive).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(archive);
    expect(onAction).not.toHaveBeenCalled();

    const share = screen.getByRole("menuitem", { name: "Share" });
    fireEvent.click(share);
    const submenu = await screen.findByRole("menu", { name: "Share" });
    expect(submenu).toHaveAttribute("data-slot", "context-menu-sub-content");
    expect(share).toHaveAttribute("aria-expanded", "true");
    // The trigger stays lit while its submenu is open.
    expect(share.querySelector('[data-slot="context-menu-highlight"]')).toBeInTheDocument();

    fireEvent.click(screen.getByRole("menuitem", { name: "Copy link" }));
    expect(onAction).toHaveBeenCalledWith("copy");
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  it("stays closed when disabled and follows a controlled open state", async () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<Files disabled onOpenChange={onOpenChange} />);
    const trigger = screen.getByTestId("trigger");
    fireEvent.contextMenu(trigger, { clientX: 10, clientY: 10, button: 2 });
    // A disabled menu leaves the shortcut to the browser.
    expect(fireEvent.keyDown(trigger, { key: "F10", shiftKey: true })).toBe(true);
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    rerender(<Files open={false} onOpenChange={onOpenChange} />);
    fireEvent.contextMenu(trigger, { clientX: 10, clientY: 10, button: 2 });
    expect(onOpenChange).toHaveBeenCalledWith(true, expect.anything());
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    rerender(<Files open onOpenChange={onOpenChange} />);
    await screen.findByRole("menu", { name: "File actions" });
    rerender(<Files open={false} onOpenChange={onOpenChange} />);
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  it("holds the popup through its closing animation, then unmounts it", async () => {
    render(<Files duration={0.05} />);
    fireEvent.contextMenu(screen.getByTestId("trigger"), { clientX: 10, clientY: 10, button: 2 });
    const menu = await screen.findByRole("menu", { name: "File actions" });
    fireEvent.keyDown(menu, { key: "Escape" });
    expect(screen.getByTestId("trigger")).not.toHaveAttribute("data-popup-open");
    expect(document.querySelector('[data-slot="context-menu-content"]')).toBeInTheDocument();
    await waitFor(() =>
      expect(document.querySelector('[data-slot="context-menu-content"]')).not.toBeInTheDocument(),
    );
  });

  it("throws when a part is used outside the root", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ContextMenuTrigger />)).toThrow(
      "ContextMenuTrigger must be used within ContextMenu.",
    );
    error.mockRestore();
  });
});
