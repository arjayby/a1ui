import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Lightbox, LightboxThumbnail, type LightboxImage, type LightboxProps } from "./lightbox";

const images: LightboxImage[] = [
  { src: "/one.png", alt: "Ridge at sunrise", caption: "First light", width: 1800, height: 1200 },
  { src: "/two.png", alt: "Valley at dusk", width: 1200, height: 1800 },
  { src: "/three.png", alt: "Dunes at night", caption: "After the wind", width: 1600, height: 1600 },
];

function Example(props: Partial<LightboxProps>) {
  return <Lightbox images={images} {...props} />;
}

// The exit is a spring, and the viewer unmounts once it has come to rest.
const exit = { timeout: 4000 };
const stage = () => document.querySelector<HTMLElement>('[data-slot="lightbox-stage"]')!;
const shown = (dialog: HTMLElement) => within(dialog).getByRole("img");

function tap(target: Element, x: number, y: number) {
  fireEvent.pointerDown(target, { pointerId: 1, pointerType: "mouse", button: 0, clientX: x, clientY: y });
  fireEvent.pointerUp(target, { pointerId: 1, pointerType: "mouse", button: 0, clientX: x, clientY: y });
}

describe("Lightbox", { timeout: 15_000 }, () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("opens the clicked thumbnail in a labelled dialog with its alt text, caption and position", async () => {
    const onOpenChange = vi.fn();
    const onIndexChange = vi.fn();
    render(<Example onOpenChange={onOpenChange} onIndexChange={onIndexChange} />);
    expect(screen.getAllByRole("button")).toHaveLength(3);
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Dunes at night" }));
    const dialog = await screen.findByRole("dialog", { name: "Image viewer" });
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(onIndexChange).toHaveBeenLastCalledWith(2);
    expect(shown(dialog)).toHaveAttribute("alt", "Dunes at night");
    expect(shown(dialog)).toHaveAttribute("src", "/three.png");
    expect(dialog.querySelector('[data-slot="lightbox-caption"]')).toHaveTextContent("After the wind");
    expect(dialog.querySelector('[data-slot="lightbox-counter"]')).toHaveTextContent("3 / 3");
    expect(dialog.querySelector('[data-slot="lightbox-status"]')).toHaveTextContent(
      "Image 3 of 3: Dunes at night",
    );
    expect(within(dialog).getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("pages with the arrow keys and buttons and stops at both ends", async () => {
    const onIndexChange = vi.fn();
    render(<Example defaultOpen onIndexChange={onIndexChange} />);
    const dialog = await screen.findByRole("dialog");
    const previous = within(dialog).getByRole("button", { name: "Previous image" });
    const next = within(dialog).getByRole("button", { name: "Next image" });
    expect(previous).toHaveAttribute("aria-disabled", "true");
    expect(shown(dialog)).toHaveAttribute("alt", "Ridge at sunrise");

    fireEvent.keyDown(dialog, { key: "ArrowLeft" });
    expect(onIndexChange).not.toHaveBeenCalled();
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
    expect(shown(dialog)).toHaveAttribute("alt", "Valley at dusk");
    expect(dialog.querySelector('[data-slot="lightbox-caption"]')).toBeNull();
    expect(previous).not.toHaveAttribute("aria-disabled");

    fireEvent.click(next);
    expect(shown(dialog)).toHaveAttribute("alt", "Dunes at night");
    expect(next).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(next);
    expect(onIndexChange).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(dialog, { key: "Home" });
    expect(shown(dialog)).toHaveAttribute("alt", "Ridge at sunrise");
    fireEvent.keyDown(dialog, { key: "End" });
    expect(shown(dialog)).toHaveAttribute("alt", "Dunes at night");
  });

  it("closes with Escape, unmounts after the exit, and returns focus to the current thumbnail", async () => {
    const onOpenChange = vi.fn();
    render(<Example onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Ridge at sunrise" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), exit);
    expect(document.querySelector('[data-slot="lightbox-scrim"]')).toBeNull();
    await waitFor(() => expect(screen.getByRole("button", { name: "Valley at dusk" })).toHaveFocus());
  });

  it("waits for the caller to update controlled open and index", async () => {
    const onOpenChange = vi.fn();
    const onIndexChange = vi.fn();
    const { rerender } = render(
      <Example open={false} index={0} onOpenChange={onOpenChange} onIndexChange={onIndexChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Valley at dusk" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
    expect(screen.queryByRole("dialog")).toBeNull();

    rerender(<Example open index={0} onOpenChange={onOpenChange} onIndexChange={onIndexChange} />);
    const dialog = await screen.findByRole("dialog");
    expect(shown(dialog)).toHaveAttribute("alt", "Ridge at sunrise");
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
    expect(shown(dialog)).toHaveAttribute("alt", "Ridge at sunrise");

    rerender(<Example open index={2} onOpenChange={onOpenChange} onIndexChange={onIndexChange} />);
    expect(shown(dialog)).toHaveAttribute("alt", "Dunes at night");
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    rerender(<Example open={false} index={2} onOpenChange={onOpenChange} onIndexChange={onIndexChange} />);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), exit);
  });

  it("zooms on a double tap and closes on a tap beside the image", async () => {
    const onOpenChange = vi.fn();
    render(<Example defaultOpen onOpenChange={onOpenChange} />);
    const dialog = await screen.findByRole("dialog");
    const picture = dialog.querySelector('[data-slot="lightbox-image"][data-current]')!;

    tap(picture, 500, 380);
    expect(onOpenChange).not.toHaveBeenCalled();
    tap(picture, 502, 381);
    await waitFor(() => expect(stage()).toHaveAttribute("data-zoomed"));
    // Zoomed, a tap beside the image does not close: it could be the start of another double tap.
    fireEvent.keyDown(dialog, { key: "0" });
    await waitFor(() => expect(stage()).not.toHaveAttribute("data-zoomed"));

    fireEvent.keyDown(dialog, { key: "+" });
    await waitFor(() => expect(stage()).toHaveAttribute("data-zoomed"));
    fireEvent.keyDown(dialog, { key: "-" });
    await waitFor(() => expect(stage()).not.toHaveAttribute("data-zoomed"));

    tap(stage(), 5, 5);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), exit);
  });

  it("keeps zoom off at maxZoom 1 and hides paging controls for one image or showArrows false", async () => {
    const { unmount } = render(<Lightbox images={images.slice(0, 1)} defaultOpen maxZoom={1} />);
    const single = await screen.findByRole("dialog");
    expect(within(single).queryByRole("button", { name: "Next image" })).toBeNull();
    expect(single.querySelector('[data-slot="lightbox-counter"]')).toBeNull();
    expect(single.querySelector('[data-slot="lightbox-status"]')).toHaveTextContent("Ridge at sunrise");
    const picture = single.querySelector('[data-slot="lightbox-image"][data-current]')!;
    tap(picture, 500, 380);
    tap(picture, 500, 380);
    fireEvent.keyDown(single, { key: "+" });
    expect(stage()).not.toHaveAttribute("data-zoomed");
    unmount();

    render(<Example defaultOpen showArrows={false} />);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByRole("button", { name: "Next image" })).toBeNull();
    expect(dialog.querySelector('[data-slot="lightbox-counter"]')).toHaveTextContent("1 / 3");
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(shown(dialog)).toHaveAttribute("alt", "Valley at dusk");
  });

  it("accepts a custom thumbnail layout and clamps an out-of-range index", async () => {
    render(
      <Lightbox images={images} defaultIndex={9}>
        <p>Between the pictures</p>
        <LightboxThumbnail index={1} className="aspect-video" />
        <LightboxThumbnail index={7} />
      </Lightbox>,
    );
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(document.querySelector('[data-slot="lightbox-grid"]')).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Valley at dusk" }));
    expect(shown(await screen.findByRole("dialog"))).toHaveAttribute("alt", "Valley at dusk");
  });

  it("requires the Lightbox root and renders nothing to open without images", () => {
    render(<Lightbox images={[]} defaultOpen />);
    expect(screen.queryByRole("dialog")).toBeNull();
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<LightboxThumbnail index={0} />)).toThrow(
      "LightboxThumbnail must be used within Lightbox.",
    );
  });
});
