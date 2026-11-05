import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  type NavigationMenuProps,
} from "./navigation-menu";

function Example(props: Omit<NavigationMenuProps, "children">) {
  return (
    <NavigationMenu aria-label="Main" duration={0} {...props}>
      <NavigationMenuList>
        <NavigationMenuItem value="products">
          <NavigationMenuTrigger>Products</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink href="/functions">Edge Functions</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem value="resources">
          <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink href="/docs">Documentation</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem value="pricing">
          <NavigationMenuLink href="/pricing">Pricing</NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

const highlight = () => document.querySelectorAll('[data-slot="navigation-menu-highlight"]');

describe("NavigationMenu", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("opens one shared panel and swaps its section when another trigger is pressed", async () => {
    const onValueChange = vi.fn();
    render(<Example onValueChange={onValueChange} />);
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    const products = screen.getByRole("button", { name: "Products" });
    const resources = screen.getByRole("button", { name: "Resources" });
    expect(products).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(products);
    expect(onValueChange).toHaveBeenLastCalledWith("products");
    await waitFor(() => expect(screen.getByRole("link", { name: "Edge Functions" })).toBeInTheDocument());
    expect(products).toHaveAttribute("aria-expanded", "true");
    expect(products.querySelector('[data-slot="navigation-menu-highlight"]')).not.toBeNull();

    fireEvent.click(resources);
    expect(onValueChange).toHaveBeenLastCalledWith("resources");
    await waitFor(() => expect(screen.getByRole("link", { name: "Documentation" })).toBeInTheDocument());
    await waitFor(() => expect(screen.queryByRole("link", { name: "Edge Functions" })).toBeNull());
    expect(document.querySelectorAll('[data-slot="navigation-menu-popup"]')).toHaveLength(1);
    expect(resources).toHaveAttribute("aria-expanded", "true");
    expect(products).toHaveAttribute("aria-expanded", "false");
    // The e2e spec checks that only one highlight remains once Motion's layout handoff finishes.
    expect(resources.querySelector('[data-slot="navigation-menu-highlight"]')).not.toBeNull();
  });

  it("closes on Escape and returns the highlight to rest", async () => {
    const onValueChange = vi.fn();
    render(<Example onValueChange={onValueChange} />);
    const products = screen.getByRole("button", { name: "Products" });
    fireEvent.click(products);
    await waitFor(() => expect(screen.getByRole("link", { name: "Edge Functions" })).toBeInTheDocument());

    fireEvent.keyDown(products, { key: "Escape" });
    expect(onValueChange).toHaveBeenLastCalledWith(null);
    await waitFor(() => expect(products).toHaveAttribute("aria-expanded", "false"));
    await waitFor(() => expect(highlight()).toHaveLength(0));
  });

  it("waits for the caller to update controlled state", async () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<Example value={null} onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Resources" }));
    expect(onValueChange).toHaveBeenLastCalledWith("resources");
    expect(screen.getByRole("button", { name: "Resources" })).toHaveAttribute("aria-expanded", "false");

    rerender(<Example value="resources" onValueChange={onValueChange} />);
    await waitFor(() => expect(screen.getByRole("link", { name: "Documentation" })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Resources" })).toHaveAttribute("aria-expanded", "true");
  });

  it("moves the hover highlight between triggers and top-level links", async () => {
    render(<Example />);
    const pricing = screen.getByRole("link", { name: "Pricing" });
    expect(pricing).toHaveAttribute("href", "/pricing");
    fireEvent.pointerEnter(screen.getByRole("button", { name: "Products" }));
    expect(highlight()).toHaveLength(1);
    fireEvent.pointerEnter(pricing);
    expect(pricing.querySelector('[data-slot="navigation-menu-highlight"]')).not.toBeNull();
    fireEvent.pointerLeave(screen.getByRole("list"));
    await waitFor(() => expect(highlight()).toHaveLength(0));
  });

  it("carries the panel timing on the portaled positioner", async () => {
    render(<Example duration={0.5} sideOffset={12} defaultValue="products" />);
    await waitFor(() =>
      expect(document.querySelector('[data-slot="navigation-menu-positioner"]')).not.toBeNull(),
    );
    const positioner = document.querySelector<HTMLElement>('[data-slot="navigation-menu-positioner"]')!;
    expect(positioner.style.getPropertyValue("--nav-duration")).toBe("0.5s");
    expect(positioner.style.getPropertyValue("--nav-gap")).toBe("12px");
    expect(screen.getByRole("button", { name: "Products" })).toHaveAttribute("aria-expanded", "true");
  });

  it("requires the NavigationMenu root", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<NavigationMenuList />)).toThrow(
      "NavigationMenuList must be used within NavigationMenu.",
    );
  });
});
