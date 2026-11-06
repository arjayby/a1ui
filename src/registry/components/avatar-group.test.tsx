import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Avatar, AvatarGroup } from "./avatar-group";

const people = ["Ada Lovelace", "Grace Hopper", "Alan Turing", "Katherine Johnson", "Linus"];

function Team(props: Partial<React.ComponentProps<typeof AvatarGroup>>) {
  return (
    <AvatarGroup aria-label="Team" duration={0} {...props}>
      {people.map((name) => (
        <Avatar key={name} name={name} />
      ))}
    </AvatarGroup>
  );
}

describe("AvatarGroup", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("names each avatar and shows initials", () => {
    render(<Team />);
    expect(screen.getByRole("group", { name: "Team" })).toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(5);
    expect(screen.getByRole("img", { name: "Ada Lovelace" })).toHaveTextContent("AL");
    expect(screen.getByRole("img", { name: "Linus" })).toHaveTextContent("L");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the name label on hover and keyboard focus", () => {
    render(<Team />);
    const grace = screen.getByRole("img", { name: "Grace Hopper" });
    expect(document.querySelector('[data-slot="avatar-label"]')).toBeNull();
    fireEvent.pointerEnter(grace, { pointerType: "mouse" });
    expect(grace.querySelector('[data-slot="avatar-label"]')).toHaveTextContent("Grace Hopper");
    expect(screen.getByRole("group", { name: "Team" })).toHaveAttribute("data-expanded", "true");
    fireEvent.pointerLeave(grace);

    const alan = screen.getByRole("img", { name: "Alan Turing" });
    act(() => alan.focus());
    expect(alan).toHaveAttribute("data-active", "true");
    expect(alan.querySelector('[data-slot="avatar-label"]')).toHaveTextContent("Alan Turing");
  });

  it("collapses extra avatars into a chip that fans them out", async () => {
    const onOpenChange = vi.fn();
    render(<Team max={3} onOpenChange={onOpenChange} />);
    expect(screen.getAllByRole("img")).toHaveLength(3);
    const chip = screen.getByRole("button", { name: "Show 2 more" });
    await waitFor(() => expect(chip).toHaveTextContent("+2"));
    expect(chip).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(chip);
    expect(chip).toHaveAttribute("aria-expanded", "true");
    const tray = screen.getByRole("group", { name: "2 more" });
    expect(chip).toHaveAttribute("aria-controls", tray.id);
    expect(screen.getByRole("img", { name: "Katherine Johnson" })).toBeInTheDocument();
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    fireEvent.keyDown(screen.getByRole("img", { name: "Linus" }), { key: "Escape" });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(chip).toHaveAttribute("aria-expanded", "false");
    expect(chip).toHaveFocus();
    await waitFor(() => expect(screen.queryByRole("img", { name: "Linus" })).not.toBeInTheDocument());
  });

  it("closes when the pointer goes down outside", async () => {
    render(
      <>
        <Team max={2} defaultOpen />
        <button type="button">Elsewhere</button>
      </>,
    );
    expect(screen.getByRole("img", { name: "Linus" })).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByRole("button", { name: "Elsewhere" }));
    expect(screen.getByRole("button", { name: "Show 3 more" })).toHaveAttribute("aria-expanded", "false");
    await waitFor(() => expect(screen.queryByRole("img", { name: "Linus" })).not.toBeInTheDocument());
  });

  it("waits for the caller to update controlled open state", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<Team max={3} open={false} onOpenChange={onOpenChange} />);
    const chip = screen.getByRole("button", { name: "Show 2 more" });
    fireEvent.click(chip);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(chip).toHaveAttribute("aria-expanded", "false");
    rerender(<Team max={3} open onOpenChange={onOpenChange} />);
    expect(chip).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("img", { name: "Linus" })).toBeInTheDocument();
  });

  it("applies the group size and works on its own", () => {
    render(<Team size="lg" />);
    const face = screen.getByRole("img", { name: "Ada Lovelace" }).querySelector('[data-slot="avatar-face"]');
    expect(face).toHaveClass("size-12");
    cleanup();
    render(<Avatar name="Grace Hopper" size="sm" tone="success" />);
    const solo = screen.getByRole("img", { name: "Grace Hopper" }).querySelector('[data-slot="avatar-face"]');
    expect(solo).toHaveClass("size-8");
    expect(solo).toHaveClass("bg-success", "text-background");
  });
});
