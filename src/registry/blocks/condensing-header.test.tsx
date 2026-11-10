import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CondensingHeader } from "./condensing-header";

type Box = Partial<Record<"offsetHeight" | "offsetWidth" | "offsetTop" | "offsetLeft", number>>;

// A 44px bar over a 40px title and 56px of extras. The compact title sits 114px to the right of the
// large one, so: dock top 2px, travel 42px, collapse 96px.
const defaultLayout: Record<string, Box> = {
  "condensing-header": { offsetHeight: 140 },
  "condensing-header-bar": { offsetHeight: 44 },
  "condensing-header-compact": { offsetTop: 11, offsetHeight: 22, offsetLeft: 150, offsetWidth: 60 },
  "condensing-header-title": { offsetHeight: 40, offsetLeft: 16, offsetWidth: 100 },
};
let layout = defaultLayout;
let timelineSupport = false;
let frames: FrameRequestCallback[] = [];

class ResizeObserverStub {
  static instances: ResizeObserverStub[] = [];
  targets = new Set<Element>();
  disconnect = vi.fn(() => this.targets.clear());

  constructor(public callback: ResizeObserverCallback) {
    ResizeObserverStub.instances.push(this);
  }

  observe(target: Element) {
    this.targets.add(target);
  }

  trigger() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

function flushFrames() {
  act(() => {
    const pending = frames;
    frames = [];
    pending.forEach((callback) => callback(0));
  });
}

function scrollWindowTo(offset: number) {
  vi.stubGlobal("scrollY", offset);
  fireEvent.scroll(window);
  flushFrames();
}

const root = () => document.querySelector<HTMLElement>('[data-slot="condensing-header"]')!;
const variable = (name: string) => root().style.getPropertyValue(name);

describe("CondensingHeader", () => {
  beforeEach(() => {
    layout = defaultLayout;
    timelineSupport = false;
    frames = [];
    ResizeObserverStub.instances = [];

    for (const key of ["offsetHeight", "offsetWidth", "offsetTop", "offsetLeft"] as const) {
      vi.spyOn(HTMLElement.prototype, key, "get").mockImplementation(function (this: HTMLElement) {
        return layout[this.dataset.slot ?? ""]?.[key] ?? 0;
      });
    }
    // jsdom has no layout, so supply the two computed values the header reads and keep the rest.
    const computedStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, "getComputedStyle").mockImplementation((element, pseudo) => {
      const { slot, scroller } = (element as HTMLElement).dataset;
      return new Proxy(computedStyle(element, pseudo), {
        get(style, key) {
          if (key === "fontSize") return slot === "condensing-header-compact" ? "17px" : "34px";
          if (key === "fontFamily") return slot === "condensing-header-heading" ? "Heading Face" : "";
          if (key === "overflowY") return scroller ? "auto" : "visible";
          const value = Reflect.get(style, key);
          return typeof value === "function" ? value.bind(style) : value;
        },
      });
    });
    vi.stubGlobal("CSS", { supports: () => timelineSupport });
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    vi.stubGlobal("scrollY", 0);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => frames.push(callback));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    // Unmount, so one test's scroll listeners are gone before the next test scrolls the window.
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders the title as one heading and hides the copies from assistive tech", () => {
    render(<CondensingHeader title="Notes" headingLevel={3} />);

    expect(screen.getAllByRole("heading")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Notes", level: 3 })).toBeInTheDocument();
    for (const copy of ["condensing-header-compact", "condensing-header-twin"]) {
      const element = document.querySelector(`[data-slot="${copy}"]`);
      expect(element).toHaveTextContent("Notes");
      expect(element).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("defaults to a first-level heading", () => {
    render(<CondensingHeader title="Notes" />);
    expect(screen.getByRole("heading", { name: "Notes", level: 1 })).toBeInTheDocument();
  });

  it("renders the action, subtitle and accessory slots only when they are given", () => {
    const { rerender } = render(<CondensingHeader title="Notes" />);
    for (const slot of ["leading", "trailing", "subtitle", "accessory"]) {
      expect(document.querySelector(`[data-slot="condensing-header-${slot}"]`)).toBeNull();
    }

    rerender(
      <CondensingHeader
        title="Notes"
        titleAlign="start"
        subtitle="16 notes"
        leading={<button type="button">Folders</button>}
        trailing={<button type="button">Edit</button>}
        accessory={<input aria-label="Search notes" />}
        className="z-40"
      />,
    );
    const bar = document.querySelector('[data-slot="condensing-header-bar"]')!;
    const extras = document.querySelector('[data-slot="condensing-header-extras"]')!;
    expect(bar).toContainElement(screen.getByRole("button", { name: "Folders" }));
    expect(bar).toContainElement(screen.getByRole("button", { name: "Edit" }));
    expect(extras).toHaveTextContent("16 notes");
    expect(extras).toContainElement(screen.getByRole("textbox", { name: "Search notes" }));
    expect(root()).toHaveAttribute("data-title-align", "start");
    expect(root()).toHaveClass("z-40");
  });

  it("measures the path from the large title to its place in the bar", () => {
    render(<CondensingHeader title="Notes" />);

    expect(root()).toHaveAttribute("data-ready");
    expect(variable("--ch-dock-top")).toBe("2px");
    expect(variable("--ch-travel")).toBe("42px");
    expect(variable("--ch-under")).toBe("96px");
    expect(variable("--ch-collapse")).toBe("96px");
    expect(variable("--ch-dx")).toBe("114px");
    expect(variable("--ch-scale")).toBe("0.5000");
    expect(variable("--ch-inverse")).toBe("2.0000");
    expect(variable("--ch-slot-width")).toBe("61px");
  });

  it("measures again when the layout changes", () => {
    render(<CondensingHeader title="Notes" />);
    layout = {
      ...defaultLayout,
      "condensing-header": { offsetHeight: 100 },
      "condensing-header-compact": { offsetTop: 11, offsetHeight: 22, offsetLeft: 16, offsetWidth: 60 },
    };
    act(() => ResizeObserverStub.instances[0].trigger());

    expect(variable("--ch-collapse")).toBe("56px");
    expect(variable("--ch-dx")).toBe("-20px");
  });

  it("leaves the frames to the scroll timeline where the browser has one", () => {
    timelineSupport = true;
    const onCondensedChange = vi.fn();
    render(<CondensingHeader title="Notes" onCondensedChange={onCondensedChange} />);
    expect(root()).toHaveAttribute("data-driver", "timeline");

    scrollWindowTo(30);
    expect(variable("--ch-progress")).toBe("");
    expect(root()).toHaveAttribute("data-condensed");
    expect(onCondensedChange).toHaveBeenLastCalledWith(true);
  });

  it("scrubs the transition from the scroll position without a scroll timeline", () => {
    render(<CondensingHeader title="Notes" />);
    expect(root()).toHaveAttribute("data-driver", "frame");
    expect(variable("--ch-progress")).toBe("0.0000");

    scrollWindowTo(10.5);
    expect(variable("--ch-progress")).toBe("0.2500");
    expect(variable("--ch-material")).toBe("0.0000");

    scrollWindowTo(88);
    expect(variable("--ch-progress")).toBe("1.0000");
    expect(variable("--ch-material")).toBe("0.5000");
    expect(variable("--ch-edge")).toBe("0.0000");

    scrollWindowTo(102);
    expect(variable("--ch-material")).toBe("1.0000");
    expect(variable("--ch-edge")).toBe("0.5000");

    scrollWindowTo(0);
    expect(variable("--ch-progress")).toBe("0.0000");
    expect(variable("--ch-material")).toBe("0.0000");
    expect(variable("--ch-edge")).toBe("0.0000");
  });

  it("coalesces scroll events into one update per frame", () => {
    render(<CondensingHeader title="Notes" />);
    vi.stubGlobal("scrollY", 21);
    fireEvent.scroll(window);
    fireEvent.scroll(window);
    fireEvent.scroll(window);

    expect(frames).toHaveLength(1);
    expect(variable("--ch-progress")).toBe("0.0000");
    flushFrames();
    expect(variable("--ch-progress")).toBe("0.5000");
  });

  it("reports the condensed state a third of the way in, in both directions", () => {
    const onCondensedChange = vi.fn();
    render(<CondensingHeader title="Notes" onCondensedChange={onCondensedChange} />);
    expect(onCondensedChange).not.toHaveBeenCalled();

    scrollWindowTo(13);
    expect(root()).not.toHaveAttribute("data-condensed");
    scrollWindowTo(14);
    expect(root()).toHaveAttribute("data-condensed");
    scrollWindowTo(300);
    expect(onCondensedChange).toHaveBeenCalledTimes(1);
    expect(onCondensedChange).toHaveBeenLastCalledWith(true);

    scrollWindowTo(0);
    expect(root()).not.toHaveAttribute("data-condensed");
    expect(onCondensedChange).toHaveBeenCalledTimes(2);
    expect(onCondensedChange).toHaveBeenLastCalledWith(false);
  });

  it("marks the bar as covered only once content is underneath it", () => {
    render(<CondensingHeader title="Notes" />);

    scrollWindowTo(96);
    expect(root()).not.toHaveAttribute("data-covered");
    scrollWindowTo(97);
    expect(root()).toHaveAttribute("data-covered");
    scrollWindowTo(0);
    expect(root()).not.toHaveAttribute("data-covered");
  });

  it("makes the subtitle and accessory inert once they have scrolled away", () => {
    render(<CondensingHeader title="Notes" accessory={<input aria-label="Search notes" />} />);
    const extras = document.querySelector('[data-slot="condensing-header-extras"]')!;

    scrollWindowTo(95);
    expect(extras).not.toHaveAttribute("inert");
    expect(root()).not.toHaveAttribute("data-collapsed");
    scrollWindowTo(96);
    expect(extras).toHaveAttribute("inert");
    expect(root()).toHaveAttribute("data-collapsed");
    scrollWindowTo(0);
    expect(extras).not.toHaveAttribute("inert");
    expect(root()).not.toHaveAttribute("data-collapsed");
  });

  it("brings the material in before the accessory reaches the bar and fades it as it slides under", () => {
    render(<CondensingHeader title="Notes" accessory={<input aria-label="Search notes" />} />);
    // The accessory starts right under the 40px title, so it reaches the bar after 40px of scroll.
    expect(variable("--ch-under")).toBe("40px");

    scrollWindowTo(32);
    expect(variable("--ch-material")).toBe("0.5000");
    expect(variable("--ch-edge")).toBe("0.0000");
    expect(variable("--ch-extras")).toBe("0.0000");
    expect(root()).not.toHaveAttribute("data-covered");

    scrollWindowTo(68);
    expect(variable("--ch-material")).toBe("1.0000");
    expect(variable("--ch-edge")).toBe("1.0000");
    expect(variable("--ch-extras")).toBe("0.5000");
    expect(root()).toHaveAttribute("data-covered");

    scrollWindowTo(96);
    expect(variable("--ch-extras")).toBe("1.0000");
  });

  it("gives the copies the heading's font family", () => {
    render(<CondensingHeader title="Notes" />);
    expect(variable("--ch-font")).toBe("Heading Face");
  });

  it("stretches the large title with resistance while the page is overscrolled", () => {
    render(<CondensingHeader title="Notes" />);

    scrollWindowTo(-100);
    expect(variable("--ch-stretch")).toBe("1.0375");
    scrollWindowTo(-300);
    expect(variable("--ch-stretch")).toBe("1.0750");
    expect(variable("--ch-progress")).toBe("0.0000");

    scrollWindowTo(0);
    expect(variable("--ch-stretch")).toBe("");
  });

  it("follows the nearest scroll container instead of the window", () => {
    render(
      <div data-scroller="true" data-testid="scroller">
        <CondensingHeader title="Notes" />
      </div>,
    );
    const scroller = screen.getByTestId("scroller");

    scrollWindowTo(200);
    expect(variable("--ch-progress")).toBe("0.0000");

    scroller.scrollTop = 42;
    fireEvent.scroll(scroller);
    flushFrames();
    expect(variable("--ch-progress")).toBe("1.0000");
  });

  it("starts in the right state when it mounts on a page that is already scrolled", () => {
    vi.stubGlobal("scrollY", 400);
    const onCondensedChange = vi.fn();
    render(<CondensingHeader title="Notes" onCondensedChange={onCondensedChange} />);

    expect(variable("--ch-progress")).toBe("1.0000");
    expect(root()).toHaveAttribute("data-condensed");
    expect(root()).toHaveAttribute("data-covered");
    expect(onCondensedChange).toHaveBeenCalledWith(true);
  });

  it("stops listening when it unmounts", () => {
    const { unmount } = render(<CondensingHeader title="Notes" />);
    const header = root();
    const observer = ResizeObserverStub.instances[0];
    unmount();

    expect(observer.disconnect).toHaveBeenCalled();
    vi.stubGlobal("scrollY", 42);
    fireEvent.scroll(window);
    expect(frames).toHaveLength(0);
    expect(header.style.getPropertyValue("--ch-progress")).toBe("0.0000");
  });
});
