import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Skeleton, SkeletonAvatar, SkeletonText } from "./skeleton";

// Motion reads the reduced-motion query once per page, so tests flip the hook directly.
const motionPreference = vi.hoisted(() => ({ reduce: false }));
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotion: () => motionPreference.reduce,
}));

describe("Skeleton", () => {
  beforeEach(() => {
    motionPreference.reduce = false;
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("announces a standalone placeholder and draws a shimmer band", () => {
    render(<Skeleton className="h-4 w-32" />);
    const shape = document.querySelector('[data-slot="skeleton-shape"]')!;
    expect(shape).toHaveAttribute("aria-busy", "true");
    expect(shape).toHaveClass("h-4", "w-32", "rounded-md", "bg-muted");
    expect(screen.getByText("Loading")).toHaveClass("sr-only");
    expect(shape.querySelector('[data-slot="skeleton-shimmer"]')).toBeInTheDocument();
  });

  it("renders text lines with a shorter last line and keeps a custom radius", () => {
    render(
      <>
        <SkeletonText lines={4} lastLineWidth="40%" animation="pulse" />
        <SkeletonAvatar size={48} />
      </>,
    );
    const text = document.querySelector('[data-slot="skeleton-text"]')!;
    expect(text).toHaveAttribute("aria-busy", "true");
    const lines = text.querySelectorAll<HTMLElement>('[data-slot="skeleton-shape"]');
    expect(lines).toHaveLength(4);
    expect([...lines].map((line) => line.style.width)).toEqual(["100%", "100%", "100%", "40%"]);
    expect(lines[0]).toHaveAttribute("data-animation", "pulse");
    expect(text.querySelector('[data-slot="skeleton-shimmer"]')).toBeNull();

    const avatar = document.querySelector<HTMLElement>('[data-slot="skeleton-shape"].rounded-full')!;
    expect(avatar.style.width).toBe("48px");
    expect(avatar).not.toHaveClass("rounded-md");
    expect(screen.getAllByText("Loading")).toHaveLength(2);
  });

  it("shows the fallback while loading, then reveals the content", async () => {
    const { rerender } = render(
      <Skeleton loading fallback={<SkeletonText lines={2} />} loadingLabel="Loading profile" duration={0}>
        <p>Ada Lovelace</p>
      </Skeleton>,
    );
    const wrapper = document.querySelector('[data-slot="skeleton"]')!;
    expect(wrapper).toHaveAttribute("aria-busy", "true");
    expect(wrapper).toHaveAttribute("data-state", "loading");
    expect(screen.getByText("Loading profile")).toHaveClass("sr-only");
    expect(screen.queryByText("Ada Lovelace")).toBeNull();
    // Nested placeholders stay quiet; the wrapper announces once.
    expect(document.querySelector('[data-slot="skeleton-text"]')).toHaveAttribute("aria-hidden", "true");
    expect(screen.getAllByText(/Loading/)).toHaveLength(1);

    rerender(
      <Skeleton loading={false} fallback={<SkeletonText lines={2} />} duration={0}>
        <p>Ada Lovelace</p>
      </Skeleton>,
    );
    expect(wrapper).not.toHaveAttribute("aria-busy");
    expect(wrapper).toHaveAttribute("data-state", "loaded");
    expect(screen.getByText("Ada Lovelace")).toBeVisible();
    expect(screen.queryByText(/Loading/)).toBeNull();
    expect(document.querySelector('[data-slot="skeleton-placeholder"]')).toBeNull();
  });

  it("covers children with one block and keeps them inert while loading", () => {
    const { rerender } = render(
      <Skeleton loading>
        <button type="button">Open report</button>
      </Skeleton>,
    );
    const content = document.querySelector('[data-slot="skeleton-content"]')!;
    expect(content).toHaveAttribute("aria-hidden", "true");
    expect(content).toHaveAttribute("inert");
    expect(screen.queryByRole("button", { name: "Open report" })).toBeNull();
    expect(document.querySelector('[data-slot="skeleton-placeholder"]')).toHaveClass("absolute", "inset-0");

    rerender(
      <Skeleton loading={false}>
        <button type="button">Open report</button>
      </Skeleton>,
    );
    expect(content).not.toHaveAttribute("inert");
    expect(screen.getByRole("button", { name: "Open report" })).toBeInTheDocument();
  });

  it("drops the shimmer and swaps instantly with reduced motion", async () => {
    motionPreference.reduce = true;
    const { rerender } = render(
      <Skeleton loading fallback={<SkeletonText />}>
        <p>Ready</p>
      </Skeleton>,
    );
    expect(document.querySelector('[data-slot="skeleton-shimmer"]')).toBeNull();
    expect(document.querySelector('[data-slot="skeleton-shape"]')).toHaveAttribute("data-animation", "none");

    rerender(
      <Skeleton loading={false} fallback={<SkeletonText />}>
        <p>Ready</p>
      </Skeleton>,
    );
    await act(async () => {});
    expect(document.querySelector('[data-slot="skeleton-placeholder"]')).toBeNull();
    expect(screen.getByText("Ready")).toBeVisible();
  });
});
