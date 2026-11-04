import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Tabs, TabsContent, TabsList, TabsTrigger, type TabsProps } from "./tabs";

function Example(props: TabsProps) {
  return (
    <Tabs duration={0} {...props}>
      <TabsList aria-label="Dashboard">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="reports" disabled>
          Reports
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview">Overview panel</TabsContent>
      <TabsContent value="analytics">Analytics panel</TabsContent>
      <TabsContent value="reports">Reports panel</TabsContent>
    </Tabs>
  );
}

describe("Tabs", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("moves the single indicator and swaps panels when a tab is selected", () => {
    const onValueChange = vi.fn();
    render(<Example defaultValue="overview" onValueChange={onValueChange} />);
    expect(screen.getByRole("tablist", { name: "Dashboard" })).toBeInTheDocument();
    const overview = screen.getByRole("tab", { name: "Overview" });
    const analytics = screen.getByRole("tab", { name: "Analytics" });
    expect(overview).toHaveAttribute("aria-selected", "true");
    expect(overview.querySelector('[data-slot="tabs-indicator"]')).not.toBeNull();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Overview panel");

    fireEvent.click(analytics);
    expect(onValueChange).toHaveBeenLastCalledWith("analytics");
    expect(analytics).toHaveAttribute("aria-selected", "true");
    expect(document.querySelectorAll('[data-slot="tabs-indicator"]')).toHaveLength(1);
    expect(analytics.querySelector('[data-slot="tabs-indicator"]')).not.toBeNull();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Analytics panel");
  });

  it("waits for the caller to update controlled state and skips disabled tabs", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<Example value="overview" onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("tab", { name: "Analytics" }));
    expect(onValueChange).toHaveBeenLastCalledWith("analytics");
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");

    rerender(<Example value="analytics" onValueChange={onValueChange} />);
    expect(screen.getByRole("tab", { name: "Analytics" })).toHaveAttribute("aria-selected", "true");

    onValueChange.mockClear();
    fireEvent.click(screen.getByRole("tab", { name: "Reports" }));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("shows a hover highlight only on inactive tabs and clears it when the pointer leaves", () => {
    render(<Example defaultValue="overview" variant="underline" />);
    const list = screen.getByRole("tablist");
    expect(list).toHaveClass("border-b");
    fireEvent.pointerEnter(screen.getByRole("tab", { name: "Overview" }));
    expect(document.querySelector('[data-slot="tabs-hover"]')).toBeNull();
    fireEvent.pointerEnter(screen.getByRole("tab", { name: "Analytics" }));
    expect(
      screen.getByRole("tab", { name: "Analytics" }).querySelector('[data-slot="tabs-hover"]'),
    ).not.toBeNull();
  });

  it("requires the Tabs root", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TabsTrigger value="orphan">Orphan</TabsTrigger>)).toThrow(
      "TabsTrigger must be used within Tabs.",
    );
  });
});
