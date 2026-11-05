import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getPaginationItems, Pagination } from "./pagination";

const visible = () =>
  [...document.querySelectorAll('[data-slot="pagination-list"] > li')]
    .map((item) => item.textContent?.replace(/Previous|Next/g, "").trim())
    .filter(Boolean);

describe("getPaginationItems", () => {
  it("keeps a fixed number of slots while the window moves", () => {
    const at = (page: number) => getPaginationItems({ page, pageCount: 10 });
    expect(at(1)).toEqual([1, 2, 3, 4, 5, "end-ellipsis", 10]);
    expect(at(4)).toEqual([1, 2, 3, 4, 5, "end-ellipsis", 10]);
    expect(at(5)).toEqual([1, "start-ellipsis", 4, 5, 6, "end-ellipsis", 10]);
    expect(at(10)).toEqual([1, "start-ellipsis", 6, 7, 8, 9, 10]);
    expect(getPaginationItems({ page: 3, pageCount: 5 })).toEqual([1, 2, 3, 4, 5]);
  });

  it("honours sibling and boundary counts and always includes the current page", () => {
    expect(getPaginationItems({ page: 10, pageCount: 20, siblingCount: 2, boundaryCount: 2 })).toEqual([
      1,
      2,
      "start-ellipsis",
      8,
      9,
      10,
      11,
      12,
      "end-ellipsis",
      19,
      20,
    ]);
    expect(getPaginationItems({ page: 6, pageCount: 12, siblingCount: 0, boundaryCount: 0 })).toEqual([
      "start-ellipsis",
      6,
      "end-ellipsis",
    ]);
    for (let count = 1; count <= 30; count++) {
      for (let page = 1; page <= count; page++) {
        const items = getPaginationItems({ page, pageCount: count });
        const numbers = items.filter((item) => typeof item === "number");
        expect(numbers).toContain(page);
        expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
        expect(new Set(numbers).size).toBe(numbers.length);
        expect(numbers[0]).toBe(1);
        expect(numbers.at(-1)).toBe(count);
      }
    }
  });
});

describe("Pagination", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("marks the current page, moves the window, and disables the ends", () => {
    const onPageChange = vi.fn();
    render(<Pagination pageCount={10} onPageChange={onPageChange} duration={0} />);
    const nav = screen.getByRole("navigation", { name: "Pagination" });
    expect(within(nav).getByRole("button", { name: "Page 1" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(visible()).toEqual(["1", "2", "3", "4", "5", "…", "10"]);

    fireEvent.click(within(nav).getByRole("button", { name: "Page 5" }));
    expect(onPageChange).toHaveBeenLastCalledWith(5);
    expect(within(nav).getByRole("button", { name: "Page 5" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("button", { name: "Page 1" })).not.toHaveAttribute("aria-current");
    expect(nav.querySelectorAll('[data-slot="pagination-active"]')).toHaveLength(1);

    fireEvent.click(within(nav).getByRole("button", { name: "Page 10" }));
    expect(within(nav).getByRole("button", { name: "Next page" })).toBeDisabled();
    expect(within(nav).getByRole("button", { name: "Previous page" })).toBeEnabled();
    fireEvent.click(within(nav).getByRole("button", { name: "Previous page" }));
    expect(onPageChange).toHaveBeenLastCalledWith(9);
    expect(nav).toHaveAttribute("data-page", "9");
  });

  it("lets a page that leaves the window go without keeping the active state", () => {
    render(<Pagination defaultPage={3} pageCount={10} duration={0.35} />);
    fireEvent.click(screen.getByRole("button", { name: "Page 5" }));
    // Page 3 may still be animating out, but only page 5 is current or carries the surface.
    expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-slot="pagination-active"]')).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Page 3" })).toBeNull();
  });

  it("follows a controlled page and clamps it to the page count", () => {
    function Controlled() {
      const [page, setPage] = useState(3);
      return (
        <>
          <Pagination page={page} pageCount={4} onPageChange={setPage} aria-label="Results" />
          <button onClick={() => setPage(99)}>Jump</button>
        </>
      );
    }
    render(<Controlled />);
    const nav = screen.getByRole("navigation", { name: "Results" });
    fireEvent.click(within(nav).getByRole("button", { name: "Next page" }));
    expect(within(nav).getByRole("button", { name: "Page 4" })).toHaveAttribute("aria-current", "page");
    fireEvent.click(within(nav).getByRole("button", { name: "Page 2" }));
    expect(within(nav).getByRole("button", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
    fireEvent.click(screen.getByRole("button", { name: "Jump" }));
    expect(nav).toHaveAttribute("data-page", "4");
  });

  it("does not change an ignored controlled page", () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} pageCount={5} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Page 4" }));
    expect(onPageChange).toHaveBeenCalledWith(4);
    expect(screen.getByRole("button", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
  });

  it("renders links from getHref and renderLink, leaving disabled ends without an href", () => {
    const onPageChange = vi.fn();
    render(
      <Pagination
        defaultPage={1}
        pageCount={3}
        onPageChange={onPageChange}
        getHref={(page) => `/posts?page=${page}`}
        renderLink={(props, page) => (
          <a
            {...props}
            data-page-link={page}
            onClick={(event) => {
              props.onClick(event);
              event.preventDefault();
            }}
          />
        )}
      />,
    );
    const page2 = screen.getByRole("link", { name: "Page 2" });
    expect(page2).toHaveAttribute("href", "/posts?page=2");
    expect(page2).toHaveAttribute("data-page-link", "2");
    expect(screen.getByRole("link", { name: "Page 1" })).toHaveAttribute("aria-current", "page");
    const previous = screen.getByRole("link", { name: "Previous page" });
    expect(previous).toHaveAttribute("aria-disabled", "true");
    expect(previous).not.toHaveAttribute("href");
    expect(screen.getByRole("link", { name: "Next page" })).toHaveAttribute("href", "/posts?page=2");

    // Opening a link in a new tab leaves this page alone.
    fireEvent.click(page2, { metaKey: true });
    expect(onPageChange).not.toHaveBeenCalled();
    fireEvent.click(page2);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("hands focus to the current page when the next control becomes disabled", () => {
    render(<Pagination defaultPage={2} pageCount={3} duration={0} />);
    const next = screen.getByRole("button", { name: "Next page" });
    next.focus();
    fireEvent.click(next);
    expect(next).toBeDisabled();
    expect(screen.getByRole("button", { name: "Page 3" })).toHaveFocus();
  });

  it("treats an empty result set as a single page", () => {
    render(<Pagination pageCount={0} />);
    expect(screen.getByRole("button", { name: "Page 1" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });
});
