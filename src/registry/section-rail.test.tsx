import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SectionRail } from "./section-rail";

const sections = [
  { id: "start", label: "Start" },
  { id: "details", label: "Details" },
  { id: "finish", label: "Finish" },
];

function addTrackedSection(id: string, top: number, parent: HTMLElement = document.body) {
  const section = document.createElement("section");
  section.id = id;
  section.getBoundingClientRect = vi.fn(() => ({
    top,
    bottom: top + 100,
    left: 0,
    right: 100,
    width: 100,
    height: 100,
    x: 0,
    y: top,
    toJSON: () => ({}),
  }));
  parent.append(section);
  return section;
}

describe("SectionRail", () => {
  afterEach(() => vi.restoreAllMocks());

  it("marks sections before, at, and after the reading position", async () => {
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 1000 });
    addTrackedSection("start", -100);
    addTrackedSection("details", 200);
    addTrackedSection("finish", 700);

    render(<SectionRail sections={sections} ariaLabel="Story sections" />);

    const links = screen.getAllByRole("link");
    await waitFor(() => expect(links[1]).toHaveAttribute("aria-current", "location"));
    expect(links[0]).toHaveAttribute("data-state", "complete");
    expect(links[1]).toHaveAttribute("data-state", "active");
    expect(links[2]).toHaveAttribute("data-state", "pending");
    expect(screen.getByRole("navigation")).toHaveAttribute("aria-label", "Story sections");
  });

  it("updates the current section after scrolling", async () => {
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 1000 });
    addTrackedSection("start", -100);
    addTrackedSection("details", -50);
    const finish = addTrackedSection("finish", 700);

    render(<SectionRail sections={sections} />);
    const finishLink = screen.getByRole("link", { name: "Finish" });

    finish.getBoundingClientRect = vi.fn(() => ({
      top: 100,
      bottom: 200,
      left: 0,
      right: 100,
      width: 100,
      height: 100,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    }));
    fireEvent.scroll(window);

    await waitFor(() => expect(finishLink).toHaveAttribute("aria-current", "location"));
  });

  it("links each marker to its section", () => {
    render(<SectionRail sections={sections} className="fixed" />);

    expect(screen.getByRole("link", { name: "Start" })).toHaveAttribute("href", "#start");
    expect(screen.getByRole("navigation")).toHaveClass("fixed");
  });

  it("sets the gap between section markers", () => {
    render(<SectionRail sections={sections} gap="0.5rem" />);

    expect(screen.getByRole("list")).toHaveStyle({ gap: "0.5rem" });
  });

  it("supports a short active marker without dimming its active color", () => {
    const { rerender } = render(<SectionRail sections={sections} activeMarkerLength="short" />);
    const activeMarker = screen.getByRole("link", { name: "Start" }).querySelector("[aria-hidden='true']");

    expect(activeMarker).toHaveStyle({ width: "12px", opacity: "1" });

    rerender(<SectionRail sections={sections} activeMarkerLength="long" />);
    expect(activeMarker).toHaveStyle({ width: "20px", opacity: "1" });
  });

  it("tapers nearby markers around the hovered or focused section", () => {
    const nearbySections = [
      { id: "one", label: "One" },
      { id: "two", label: "Two" },
      { id: "three", label: "Three" },
      { id: "four", label: "Four" },
      { id: "five", label: "Five" },
    ];
    render(<SectionRail sections={nearbySections} />);

    const links = screen.getAllByRole("link");
    const markers = links.map((link) => link.querySelector("[aria-hidden='true']"));

    fireEvent.pointerEnter(links[2]);
    expect(markers[2]).toHaveStyle({ width: "24px", opacity: "1" });
    expect(markers[1]).toHaveStyle({ width: "20px", opacity: "0.8" });
    expect(markers[0]).toHaveStyle({ width: "16px", opacity: "1" });
    expect(markers[3]).toHaveStyle({ width: "20px", opacity: "0.8" });
    expect(markers[4]).toHaveStyle({ width: "16px", opacity: "0.6" });

    fireEvent.pointerLeave(screen.getByRole("list"));
    fireEvent.focus(links[1]);
    expect(markers[1]).toHaveStyle({ width: "24px", opacity: "1" });
    expect(markers[0]).toHaveStyle({ width: "20px", opacity: "1" });
  });

  it("tracks sections inside a scroll container", async () => {
    const scrollContainer = document.createElement("div");
    const reactRoot = document.createElement("div");
    scrollContainer.style.overflowY = "auto";
    Object.defineProperty(scrollContainer, "clientHeight", { configurable: true, value: 200 });
    Object.defineProperty(scrollContainer, "scrollHeight", { configurable: true, value: 600 });
    scrollContainer.getBoundingClientRect = vi.fn(() => ({
      top: 100,
      bottom: 300,
      left: 0,
      right: 100,
      width: 100,
      height: 200,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    }));
    scrollContainer.append(reactRoot);
    document.body.append(scrollContainer);

    addTrackedSection("start", 120, scrollContainer);
    const details = addTrackedSection("details", 220, scrollContainer);
    addTrackedSection("finish", 320, scrollContainer);
    render(<SectionRail sections={sections} />, { container: reactRoot });

    details.getBoundingClientRect = vi.fn(() => ({
      top: 150,
      bottom: 250,
      left: 0,
      right: 100,
      width: 100,
      height: 100,
      x: 0,
      y: 150,
      toJSON: () => ({}),
    }));
    fireEvent.scroll(scrollContainer);

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Details" })).toHaveAttribute("aria-current", "location"),
    );
  });
});
