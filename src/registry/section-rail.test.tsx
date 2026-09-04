import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SectionRail } from "./section-rail";

const sections = [
  { id: "start", label: "Start" },
  { id: "details", label: "Details" },
  { id: "finish", label: "Finish" },
];

function addTrackedSection(id: string, top: number) {
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
  document.body.append(section);
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
});
