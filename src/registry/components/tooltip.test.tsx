import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

function hover(element: HTMLElement) {
  fireEvent.pointerEnter(element, { pointerType: "mouse" });
  fireEvent.mouseEnter(element);
  fireEvent.mouseMove(element);
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

describe("Tooltip", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows on its own with an arrow and describes its trigger", async () => {
    render(
      <Tooltip defaultOpen>
        <TooltipTrigger aria-label="Bold">B</TooltipTrigger>
        <TooltipContent duration={0}>Bold ⌘B</TooltipContent>
      </Tooltip>,
    );
    await settle();
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("Bold ⌘B");
    expect(screen.getByRole("button", { name: "Bold" })).toHaveAccessibleDescription("Bold ⌘B");
    expect(document.querySelector('[data-slot="tooltip-arrow"]')).not.toBeNull();
  });

  it("follows a controlled open prop and can drop the arrow", async () => {
    function Controlled() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen((current) => !current)}>
            Toggle
          </button>
          <Tooltip open={open} onOpenChange={setOpen}>
            <TooltipTrigger aria-label="Italic">I</TooltipTrigger>
            <TooltipContent arrow={false} duration={0}>
              Italic
            </TooltipContent>
          </Tooltip>
        </>
      );
    }
    render(<Controlled />);
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Toggle" }));
    await settle();
    expect(screen.getByRole("tooltip")).toHaveTextContent("Italic");
    expect(document.querySelector('[data-slot="tooltip-arrow"]')).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Toggle" }));
    await settle();
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("moves one shared tooltip between triggers inside a provider", async () => {
    const onBold = vi.fn();
    const onItalic = vi.fn();
    render(
      <TooltipProvider delay={0} duration={0}>
        <Tooltip onOpenChange={onBold}>
          <TooltipTrigger aria-label="Bold">B</TooltipTrigger>
          <TooltipContent>Bold</TooltipContent>
        </Tooltip>
        <Tooltip onOpenChange={onItalic}>
          <TooltipTrigger aria-label="Italic">I</TooltipTrigger>
          <TooltipContent side="bottom">Italic</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    hover(screen.getByRole("button", { name: "Bold" }));
    await settle();
    expect(screen.getAllByRole("tooltip")).toHaveLength(1);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Bold");
    const popup = screen.getByRole("tooltip");

    hover(screen.getByRole("button", { name: "Italic" }));
    await settle();
    expect(screen.getAllByRole("tooltip")).toHaveLength(1);
    expect(screen.getByRole("tooltip")).toBe(popup);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Italic");
    expect(screen.getByRole("button", { name: "Italic" })).toHaveAccessibleDescription("Italic");
    expect(onBold.mock.calls).toEqual([[true], [false]]);
    expect(onItalic.mock.calls).toEqual([[true]]);
  });

  it("opens a controlled tooltip in the group and skips disabled ones", async () => {
    render(
      <TooltipProvider delay={0} duration={0}>
        <Tooltip open>
          <TooltipTrigger aria-label="Link">L</TooltipTrigger>
          <TooltipContent>Add a link</TooltipContent>
        </Tooltip>
        <Tooltip disabled>
          <TooltipTrigger aria-label="Code">C</TooltipTrigger>
          <TooltipContent>Inline code</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    await settle();
    expect(screen.getByRole("tooltip")).toHaveTextContent("Add a link");
    hover(screen.getByRole("button", { name: "Code" }));
    await settle();
    expect(screen.getByRole("tooltip")).toHaveTextContent("Add a link");
  });

  it("gives each tooltip its own popup when glide is off", async () => {
    render(
      <TooltipProvider glide={false} delay={0} duration={0}>
        <Tooltip>
          <TooltipTrigger aria-label="Bold">B</TooltipTrigger>
          <TooltipContent>Bold</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger aria-label="Italic">I</TooltipTrigger>
          <TooltipContent>Italic</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    hover(screen.getByRole("button", { name: "Bold" }));
    await settle();
    const bold = screen.getByRole("tooltip");
    expect(bold).toHaveTextContent("Bold");
    fireEvent.pointerLeave(screen.getByRole("button", { name: "Bold" }), { pointerType: "mouse" });
    fireEvent.mouseLeave(screen.getByRole("button", { name: "Bold" }));
    hover(screen.getByRole("button", { name: "Italic" }));
    await settle();
    const italic = screen.getByText("Italic", { selector: '[role="tooltip"] *' }).closest('[role="tooltip"]');
    expect(italic).not.toBeNull();
    expect(italic).not.toBe(bold);
  });
});
