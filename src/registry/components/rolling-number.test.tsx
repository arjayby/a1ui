import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RollingNumber } from "./rolling-number";

// Motion reads the reduced-motion query once per page, so tests flip the hook directly.
const motionPreference = vi.hoisted(() => ({ reduced: false }));
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotion: () => motionPreference.reduced,
}));

const one = (slot: string) => document.querySelector<HTMLElement>(`[data-slot="rolling-number-${slot}"]`);
const all = (slot: string) => [
  ...document.querySelectorAll<HTMLElement>(`[data-slot="rolling-number-${slot}"]`),
];
/** The digit each wheel is set to, read left to right. */
const wheels = () =>
  all("digit").map((slot) => slot.querySelector("[data-digit]")?.getAttribute("data-digit"));

describe("RollingNumber", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    motionPreference.reduced = false;
  });

  it("exposes the formatted value once and hides the rolling columns from assistive tech", () => {
    render(<RollingNumber value={1234} locale="en-US" duration={0} />);
    const text = one("text")!;
    expect(text).toHaveTextContent("1,234");
    expect(text).toHaveClass("sr-only");
    expect(text).not.toHaveAttribute("aria-live");

    const value = one("value")!;
    expect(value).toHaveAttribute("aria-hidden", "true");
    expect(value).toHaveAttribute("data-value", "1,234");
    expect(value).not.toHaveAttribute("data-direction");
    expect(wheels()).toEqual(["1", "2", "3", "4"]);
    expect(all("symbol").map((slot) => slot.textContent)).toEqual([","]);
    // Each wheel holds 0 to 9 and a second 0, so 9 rolls into 0 without a seam.
    expect(all("digit")[0].querySelector("[data-digit]")!.textContent).toBe("01234567890");
  });

  it("moves each wheel to its digit and reports the direction of the change", async () => {
    const { rerender } = render(<RollingNumber value={19} locale="en-US" duration={0} />);
    const column = () => all("digit")[1].querySelector<HTMLElement>("[data-digit]")!;
    expect(column().style.transform).toBe("translateY(-81.818%)");

    rerender(<RollingNumber value={21} locale="en-US" duration={0} />);
    expect(one("value")).toHaveAttribute("data-direction", "up");
    expect(wheels()).toEqual(["2", "1"]);
    // Motion writes the new offset on its next frame.
    await waitFor(() => expect(column().style.transform).toBe("translateY(-9.091%)"));

    rerender(<RollingNumber value={20} locale="en-US" duration={0} />);
    expect(one("value")).toHaveAttribute("data-direction", "down");
    await waitFor(() => expect(column().style.transform).toBe("none"));
    expect(one("text")).toHaveTextContent("20");
  });

  it("adds and removes columns as the number changes length", async () => {
    const { rerender } = render(<RollingNumber value={999} locale="en-US" duration={0} />);
    const ones = all("digit")[2];
    expect(all("symbol")).toHaveLength(0);

    rerender(<RollingNumber value={1000} locale="en-US" duration={0} />);
    expect(wheels()).toEqual(["1", "0", "0", "0"]);
    expect(all("symbol").map((slot) => slot.textContent)).toEqual([","]);
    // The ones column is the same element, so it rolls instead of remounting.
    expect(all("digit")[3]).toBe(ones);

    rerender(<RollingNumber value={999} locale="en-US" duration={0} />);
    await waitFor(() => expect(wheels()).toEqual(["9", "9", "9"]));
    expect(all("symbol")).toHaveLength(0);
    expect(all("digit")[2]).toBe(ones);
  });

  it("formats currency, percent, decimals, and other locales through Intl.NumberFormat", async () => {
    const { rerender } = render(
      <RollingNumber value={1234.5} locale="en-US" format={{ style: "currency", currency: "USD" }} />,
    );
    expect(one("text")).toHaveTextContent("$1,234.50");
    expect(all("symbol").map((slot) => slot.textContent)).toEqual(["$", ",", "."]);
    expect(wheels()).toEqual(["1", "2", "3", "4", "5", "0"]);

    rerender(
      <RollingNumber value={0.256} locale="en-US" format={{ style: "percent", maximumFractionDigits: 1 }} />,
    );
    expect(one("text")).toHaveTextContent("25.6%");

    rerender(<RollingNumber value={1234.5} locale="de-DE" format={{ minimumFractionDigits: 2 }} />);
    expect(one("text")).toHaveTextContent("1.234,50");

    rerender(<RollingNumber value={-42} locale="en-US" format={{ useGrouping: false }} duration={0} />);
    expect(one("text")).toHaveTextContent("-42");
    await waitFor(() => expect(wheels()).toEqual(["4", "2"]));
    expect(all("symbol").map((slot) => slot.textContent)).toEqual(["-"]);

    // Locales with their own numerals roll those glyphs.
    rerender(<RollingNumber value={25} locale="ar-EG" duration={0} />);
    expect(one("text")).toHaveTextContent("٢٥");
    await waitFor(() => expect(wheels()).toEqual(["2", "5"]));
    expect(all("digit")[0].querySelector("[data-digit]")!.textContent).toBe("٠١٢٣٤٥٦٧٨٩٠");
  });

  it("shows a signed delta chip with an arrow, then removes it", async () => {
    const { rerender } = render(<RollingNumber value={100} locale="en-US" delta deltaDuration={0.05} />);
    expect(one("delta")).toBeNull();

    rerender(<RollingNumber value={112} locale="en-US" delta deltaDuration={0.05} />);
    const chip = one("delta")!;
    expect(chip).toHaveTextContent("+12");
    expect(chip).toHaveAttribute("data-direction", "up");
    expect(chip).toHaveAttribute("aria-hidden", "true");
    expect(chip.querySelector("svg")).not.toBeNull();
    await waitFor(() => expect(one("delta")).toBeNull());

    rerender(<RollingNumber value={104.5} locale="en-US" delta deltaDuration={0.05} />);
    expect(one("delta")).toHaveTextContent("-7.5");
    expect(one("delta")).toHaveAttribute("data-direction", "down");
    await waitFor(() => expect(one("delta")).toBeNull());

    // A change that rounds to zero at this precision shows no chip.
    rerender(
      <RollingNumber
        value={104.5001}
        locale="en-US"
        format={{ maximumFractionDigits: 1 }}
        delta
        deltaDuration={0.05}
      />,
    );
    expect(one("delta")).toBeNull();
  });

  it("announces changes politely only when asked, and survives NaN", async () => {
    const { rerender } = render(<RollingNumber value={5} locale="en-US" announce duration={0} />);
    expect(one("text")).toHaveAttribute("aria-live", "polite");
    expect(one("text")).toHaveAttribute("aria-atomic", "true");

    rerender(<RollingNumber value={Number.NaN} locale="en-US" announce duration={0} />);
    expect(one("text")).toHaveTextContent("NaN");
    await waitFor(() => expect(all("digit")).toHaveLength(0));
    rerender(<RollingNumber value={Number.NaN} locale="en-US" announce duration={0} />);
    expect(one("text")).toHaveTextContent("NaN");
  });

  it("cross-fades digits in place with reduced motion", async () => {
    motionPreference.reduced = true;
    const { rerender } = render(<RollingNumber value={41} locale="en-US" delta />);
    expect(document.querySelector("[data-digit]")).toBeNull();
    expect(all("digit").map((slot) => slot.textContent)).toEqual(["4", "1"]);

    rerender(<RollingNumber value={42} locale="en-US" delta />);
    expect(one("text")).toHaveTextContent("42");
    // The old digit stays in the same cell while it fades, then leaves.
    expect(all("digit")[1].textContent).toBe("12");
    await waitFor(() => expect(all("digit")[1].textContent).toBe("2"));
    expect(all("digit")[0].textContent).toBe("4");
    expect(one("delta")).toHaveTextContent("+1");
  });
});
