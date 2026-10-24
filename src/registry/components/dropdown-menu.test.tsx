import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./dropdown-menu";

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("preserves custom render elements, refs, handlers, and controlled open state", async () => {
  const onOpenChange = vi.fn();
  const onClick = vi.fn();
  const ref = createRef<HTMLElement>();
  const content = (
    <>
      <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
      <DropdownMenuContent aria-label="Actions">
        <DropdownMenuItem
          ref={ref}
          closeOnClick={false}
          onClick={onClick}
          render={(props, state) => <a {...props} href="#projects" data-active={state.highlighted} />}
        >
          Projects
        </DropdownMenuItem>
        <DropdownMenuItem disabled onClick={onClick}>
          Unavailable
        </DropdownMenuItem>
      </DropdownMenuContent>
    </>
  );
  const { rerender } = render(
    <DropdownMenu open onOpenChange={onOpenChange}>
      {content}
    </DropdownMenu>,
  );
  const item = await screen.findByRole("menuitem", { name: "Projects" });
  expect(item.tagName).toBe("A");
  expect(item).toHaveAttribute("href", "#projects");
  expect(ref.current).toBe(item);
  fireEvent.focus(item);
  await waitFor(() => expect(item).toHaveAttribute("data-active", "true"));
  expect(item.querySelector('[data-slot="dropdown-menu-highlight"]')).toBeInTheDocument();
  fireEvent.click(item);
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("menu")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("menuitem", { name: "Unavailable" }));
  expect(onClick).toHaveBeenCalledTimes(1);
  rerender(
    <DropdownMenu open={false} onOpenChange={onOpenChange}>
      {content}
    </DropdownMenu>,
  );
  await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
});
