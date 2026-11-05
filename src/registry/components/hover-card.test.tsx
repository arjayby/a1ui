import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HoverCard, HoverCardContent, HoverCardTrigger, type HoverCardProps } from "./hover-card";

function Example(props: HoverCardProps) {
  return (
    <HoverCard duration={0} {...props}>
      <HoverCardTrigger href="/people/mara">@mara</HoverCardTrigger>
      <HoverCardContent>
        <span>MO</span>
        <p>Mara Okafor</p>
        <p>Designs motion systems.</p>
      </HoverCardContent>
    </HoverCard>
  );
}

describe("HoverCard", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders a link trigger and keeps the card closed until asked", () => {
    render(<Example />);
    const trigger = screen.getByRole("link", { name: "@mara" });
    expect(trigger).toHaveAttribute("href", "/people/mara");
    expect(trigger).toHaveAttribute("data-slot", "hover-card-trigger");
    expect(document.querySelector('[data-slot="hover-card-content"]')).toBeNull();
  });

  it("opens by default, closes on Escape, and reports the change", async () => {
    const onOpenChange = vi.fn();
    render(<Example defaultOpen onOpenChange={onOpenChange} />);
    const card = await waitFor(() => {
      const element = document.querySelector('[data-slot="hover-card-content"]');
      expect(element).not.toBeNull();
      return element!;
    });
    expect(card).toHaveTextContent("Mara Okafor");
    expect(card.children).toHaveLength(3);
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() => expect(document.querySelector('[data-slot="hover-card-content"]')).toBeNull());
  });

  it("follows a controlled open prop", async () => {
    function Controlled() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen((value) => !value)}>
            Toggle
          </button>
          <Example open={open} onOpenChange={setOpen} />
        </>
      );
    }
    render(<Controlled />);
    fireEvent.click(screen.getByRole("button", { name: "Toggle" }));
    await waitFor(() => expect(screen.getByText("Designs motion systems.")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Toggle" }));
    await waitFor(() => expect(screen.queryByText("Designs motion systems.")).not.toBeInTheDocument());
  });

  it("throws a clear error outside HoverCard", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<HoverCardContent>Orphan</HoverCardContent>)).toThrow(
      "HoverCardContent must be used within HoverCard.",
    );
  });
});
