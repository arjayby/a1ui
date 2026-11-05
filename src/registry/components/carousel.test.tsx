import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
  type CarouselProps,
} from "./carousel";

const preferences = vi.hoisted(() => ({ reducedMotion: false }));

vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotion: () => preferences.reducedMotion,
}));

const WIDTH = 300;

// jsdom has no layout. Embla measures with offset sizes, so give the viewport
// and each slide a width and lay the slides out side by side.
function stubLayout() {
  const size = (element: HTMLElement) => {
    const slot = element.dataset.slot;
    if (slot === "carousel-content" || slot === "carousel-track" || slot === "carousel-item") return WIDTH;
    return 0;
  };
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function (this: HTMLElement) {
    return size(this);
  });
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
    return size(this) ? 200 : 0;
  });
  vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockImplementation(function (this: HTMLElement) {
    if (this.dataset.slot !== "carousel-item") return 0;
    return [...(this.parentElement?.children ?? [])].indexOf(this) * WIDTH;
  });
}

class Observer {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function Example({ count = 3, ...props }: CarouselProps & { count?: number }) {
  return (
    <Carousel aria-label="Scenes" duration={0} {...props}>
      <CarouselContent>
        {Array.from({ length: count }, (_, index) => (
          <CarouselItem key={index} aria-label={`${index + 1} of ${count}`}>
            Slide {index + 1}
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselDots />
      <CarouselNext />
    </Carousel>
  );
}

describe("Carousel", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
    vi.stubGlobal("ResizeObserver", Observer);
    vi.stubGlobal("IntersectionObserver", Observer);
    stubLayout();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    preferences.reducedMotion = false;
  });

  it("renders an accessible region with slides, buttons, and a dot per slide", () => {
    render(<Example />);
    expect(screen.getByRole("region", { name: "Scenes" })).toHaveAttribute(
      "aria-roledescription",
      "carousel",
    );
    expect(screen.getAllByRole("group", { name: /of 3$/ })).toHaveLength(3);
    expect(screen.getByRole("group", { name: "1 of 3" })).toHaveAttribute("aria-roledescription", "slide");
    expect(screen.getAllByRole("button", { name: /^Go to slide/ })).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Go to slide 1" })).toHaveAttribute("aria-current", "true");
    expect(document.querySelectorAll('[data-slot="carousel-dots-indicator"]')).toHaveLength(1);
  });

  it("disables previous and next at the ends and moves with the buttons and dots", () => {
    const setApi = vi.fn();
    render(<Example setApi={setApi} />);
    const api = setApi.mock.lastCall?.[0] as NonNullable<CarouselApi>;
    expect(api.selectedScrollSnap()).toBe(0);
    const previous = screen.getByRole("button", { name: "Previous slide" });
    const next = screen.getByRole("button", { name: "Next slide" });
    expect(previous).toBeDisabled();
    expect(next).toBeEnabled();

    fireEvent.click(next);
    expect(api.selectedScrollSnap()).toBe(1);
    expect(previous).toBeEnabled();
    expect(screen.getByRole("button", { name: "Go to slide 2" })).toHaveAttribute("aria-current", "true");

    fireEvent.click(screen.getByRole("button", { name: "Go to slide 3" }));
    expect(api.selectedScrollSnap()).toBe(2);
    expect(next).toBeDisabled();
  });

  it("never disables the buttons when looping", () => {
    render(<Example loop count={5} />);
    expect(screen.getByRole("button", { name: "Previous slide" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Next slide" })).toBeEnabled();
  });

  it("follows the arrow keys but leaves text fields alone", () => {
    const setApi = vi.fn();
    render(<Example setApi={setApi} />);
    const api = setApi.mock.lastCall?.[0] as NonNullable<CarouselApi>;
    const viewport = document.querySelector<HTMLElement>('[data-slot="carousel-content"]')!;
    expect(viewport).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(viewport, { key: "ArrowRight" });
    expect(api.selectedScrollSnap()).toBe(1);
    fireEvent.keyDown(viewport, { key: "ArrowLeft" });
    expect(api.selectedScrollSnap()).toBe(0);

    const input = document.createElement("input");
    screen.getByRole("region").appendChild(input);
    fireEvent.keyDown(input, { key: "ArrowRight" });
    expect(api.selectedScrollSnap()).toBe(0);
  });

  it("scales and fades slides by their distance from the current one", () => {
    const setApi = vi.fn();
    render(<Example setApi={setApi} inactiveScale={0.8} inactiveOpacity={0.4} parallax={0.2} />);
    const frames = document.querySelectorAll<HTMLElement>('[data-slot="carousel-item-frame"]');
    const layers = document.querySelectorAll<HTMLElement>('[data-slot="carousel-item-layer"]');
    expect(frames[0].style.transform).toBe("scale(1)");
    expect(frames[0].style.opacity).toBe("1");
    expect(frames[1].style.transform).toBe("scale(0.8)");
    expect(frames[1].style.opacity).toBe("0.4");
    expect(frames[1]).toHaveClass("overflow-hidden");
    expect(layers[1].style.transform).toContain("translate3d(-20%");
    expect(layers[1].style.transform).toContain("scale(1.4)");

    const api = setApi.mock.lastCall?.[0] as NonNullable<CarouselApi>;
    act(() => {
      api.scrollTo(1, true);
    });
    expect(frames[1].style.transform).toBe("scale(1)");
    expect(frames[0].style.transform).toBe("scale(0.8)");
  });

  it("moves only the element marked for parallax when there is one", () => {
    render(
      <Carousel aria-label="Scenes" duration={0} parallax={0.1}>
        <CarouselContent>
          {[1, 2].map((slide) => (
            <CarouselItem key={slide}>
              <div data-carousel-parallax="">Image {slide}</div>
              <p>Caption {slide}</p>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>,
    );
    const images = document.querySelectorAll<HTMLElement>("[data-carousel-parallax]");
    expect(images[1].style.transform).toContain("translate3d(-10%");
    expect(images[1].style.transform).toContain("scale(1.2)");
    expect(document.querySelector<HTMLElement>('[data-slot="carousel-item-layer"]')!.style.transform).toBe(
      "",
    );
  });

  it("drops scale, fade, and parallax with reduced motion", () => {
    preferences.reducedMotion = true;
    render(<Example parallax={0.2} />);
    const frames = document.querySelectorAll<HTMLElement>('[data-slot="carousel-item-frame"]');
    const layers = document.querySelectorAll<HTMLElement>('[data-slot="carousel-item-layer"]');
    expect(frames[1].style.transform).toBe("");
    expect(frames[1].style.opacity).toBe("");
    expect(layers[1].style.transform).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Next slide" }));
    expect(screen.getByRole("button", { name: "Go to slide 2" })).toHaveAttribute("aria-current", "true");
  });

  it("requires the Carousel root", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<CarouselNext />)).toThrow("CarouselNext must be used within Carousel.");
  });
});
