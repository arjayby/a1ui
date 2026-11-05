import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Breadcrumb, type BreadcrumbProps, type BreadcrumbSegment } from "./breadcrumb";

const trail: BreadcrumbSegment[] = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "a1ui", href: "/projects/a1ui" },
  { label: "src", href: "/projects/a1ui/src" },
  { label: "Breadcrumb" },
];

function Example(props: Partial<BreadcrumbProps>) {
  return <Breadcrumb items={trail} duration={0} {...props} />;
}

describe("Breadcrumb", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders a labelled nav with an ordered list and marks the current page", async () => {
    render(<Example />);
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    const list = nav.querySelector('[data-slot="breadcrumb-list"]')!;
    expect(list.tagName).toBe("OL");
    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Home",
      "Projects",
      "a1ui",
      "src",
    ]);
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute("href", "/projects");
    const page = screen.getByText("Breadcrumb");
    expect(page).toHaveAttribute("aria-current", "page");
    expect(page).toHaveClass("font-semibold");
    expect(list.querySelectorAll('[data-slot="breadcrumb-separator"]')).toHaveLength(4);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("collapses past maxItems, expands from the ellipsis, and collapses again on Escape", async () => {
    const onExpandedChange = vi.fn();
    render(<Example maxItems={3} onExpandedChange={onExpandedChange} />);
    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual(["Home", "src"]);
    const ellipsis = screen.getByRole("button", { name: "Show 2 hidden pages" });

    fireEvent.click(ellipsis);
    expect(onExpandedChange).toHaveBeenLastCalledWith(true);
    expect(screen.getAllByRole("link")).toHaveLength(4);
    expect(screen.getByRole("link", { name: "Projects" })).toHaveFocus();

    fireEvent.keyDown(screen.getByRole("link", { name: "Projects" }), { key: "Escape" });
    expect(onExpandedChange).toHaveBeenLastCalledWith(false);
    await waitFor(() => expect(screen.getAllByRole("link")).toHaveLength(2));
    expect(screen.getByRole("button", { name: "Show 2 hidden pages" })).toHaveFocus();
  });

  it("collapses again when focus leaves the trail", async () => {
    render(
      <>
        <Example maxItems={3} itemsAfterCollapse={1} />
        <button type="button">Outside</button>
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show 3 hidden pages" }));
    const revealed = screen.getByRole("link", { name: "Projects" });
    fireEvent.blur(revealed, { relatedTarget: screen.getByRole("link", { name: "a1ui" }) });
    expect(screen.getAllByRole("link")).toHaveLength(4);
    fireEvent.blur(revealed, { relatedTarget: screen.getByRole("button", { name: "Outside" }) });
    await waitFor(() =>
      expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual(["Home"]),
    );
  });

  it("waits for the caller when expanded is controlled", async () => {
    const onExpandedChange = vi.fn();
    const { rerender } = render(
      <Example maxItems={3} expanded={false} onExpandedChange={onExpandedChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /hidden pages/ }));
    expect(onExpandedChange).toHaveBeenCalledWith(true);
    expect(screen.getAllByRole("link")).toHaveLength(2);
    rerender(<Example maxItems={3} expanded onExpandedChange={onExpandedChange} />);
    expect(screen.getAllByRole("link")).toHaveLength(4);
    await waitFor(() => expect(screen.queryByRole("button")).toBeNull());
  });

  it("renders links through renderLink and keeps text-only segments as plain text", async () => {
    const renderLink = vi.fn<NonNullable<BreadcrumbProps["renderLink"]>>((props, item) => (
      <a {...props} data-custom={String(item.label)} />
    ));
    render(
      <Breadcrumb
        items={[{ label: "Home", href: "/" }, { label: "Archive" }, { label: "2026" }]}
        renderLink={renderLink}
      />,
    );
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("data-custom", "Home");
    expect(renderLink).toHaveBeenCalledWith(
      expect.objectContaining({ href: "/", "data-slot": "breadcrumb-link" }),
      expect.objectContaining({ label: "Home" }),
    );
    expect(screen.getByText("Archive")).toHaveAttribute("data-slot", "breadcrumb-text");
    expect(screen.getByText("2026")).toHaveAttribute("aria-current", "page");
  });

  it("adds and removes segments as the trail changes", async () => {
    const { rerender } = render(<Example items={trail.slice(0, 2).concat({ label: "a1ui" })} />);
    expect(screen.getByText("a1ui")).toHaveAttribute("aria-current", "page");
    rerender(<Example items={trail} />);
    expect(screen.getByRole("link", { name: "a1ui" })).toBeInTheDocument();
    expect(screen.getByText("Breadcrumb")).toHaveAttribute("aria-current", "page");
    rerender(<Example items={trail.slice(0, 1).concat({ label: "Projects" })} />);
    await waitFor(() => expect(screen.queryByText("a1ui")).toBeNull());
    expect(screen.getByText("Projects")).toHaveAttribute("aria-current", "page");
  });

  it("collapses to fit its container, measured with a ResizeObserver", async () => {
    const observers: (() => void)[] = [];
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          observers.push(callback);
        }
        observe() {}
        disconnect() {}
      },
    );
    let available = 1000;
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(() => available);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      return new DOMRect(0, 0, this.tagName === "LI" ? 100 : 0, 20);
    });
    render(<Example />);
    expect(screen.getAllByRole("link")).toHaveLength(4);

    available = 250;
    act(() => observers.forEach((callback) => callback()));
    // Five 100px segments, then 1 + … + 2, then 1 + … + 1, then … + the current page.
    await waitFor(() => expect(screen.queryAllByRole("link")).toHaveLength(0));
    expect(screen.getByRole("button", { name: "Show 4 hidden pages" })).toBeInTheDocument();
    expect(document.querySelector('[aria-current="page"]')).toHaveTextContent("Breadcrumb");
    // The measuring copy stays out of the accessibility tree.
    expect(document.querySelector('[aria-hidden="true"] ol')?.children).toHaveLength(6);

    available = 420;
    act(() => observers.forEach((callback) => callback()));
    await waitFor(() =>
      expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual(["Home", "src"]),
    );
  });
});
