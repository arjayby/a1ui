import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  type AccordionProps,
} from "./accordion";

function Faq(props: AccordionProps) {
  return (
    <Accordion duration={0} {...props}>
      <AccordionItem value="shipping">
        <AccordionTrigger>Shipping</AccordionTrigger>
        <AccordionContent>
          <p>Ships in two days.</p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="returns">
        <AccordionTrigger>Returns</AccordionTrigger>
        <AccordionContent>
          <p>Free returns for 30 days.</p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="warranty" disabled>
        <AccordionTrigger>Warranty</AccordionTrigger>
        <AccordionContent>
          <p>Two years.</p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

describe("Accordion", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("opens the default item and keeps one open at a time", () => {
    const onValueChange = vi.fn();
    render(<Faq defaultValue={["shipping"]} onValueChange={onValueChange} />);
    const shipping = screen.getByRole("button", { name: "Shipping" });
    const returns = screen.getByRole("button", { name: "Returns" });
    expect(shipping).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("region", { name: "Shipping" })).toHaveTextContent("Ships in two days.");
    fireEvent.click(returns);
    expect(returns).toHaveAttribute("aria-expanded", "true");
    expect(shipping).toHaveAttribute("aria-expanded", "false");
    expect(onValueChange).toHaveBeenLastCalledWith(["returns"]);
  });

  it("lets several items stay open, ignores disabled items, and morphs the plus", () => {
    render(<Faq multiple icon="plus" />);
    fireEvent.click(screen.getByRole("button", { name: "Shipping" }));
    fireEvent.click(screen.getByRole("button", { name: "Returns" }));
    expect(screen.getAllByRole("region")).toHaveLength(2);
    const warranty = screen.getByRole("button", { name: "Warranty" });
    fireEvent.click(warranty);
    expect(warranty).toHaveAttribute("aria-expanded", "false");
    expect(document.querySelectorAll('[data-icon="plus"][data-slot="accordion-icon"]')).toHaveLength(3);
    expect(document.querySelector('[data-slot="accordion-chevron"]')).toBeNull();
  });

  it("follows a controlled value", () => {
    function Controlled() {
      const [value, setValue] = useState<string[]>([]);
      return (
        <>
          <Faq value={value} onValueChange={setValue} />
          <button type="button" onClick={() => setValue(["returns"])}>
            Open returns
          </button>
        </>
      );
    }
    render(<Controlled />);
    expect(screen.queryByRole("region")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open returns" }));
    expect(screen.getByRole("button", { name: "Returns" })).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: "Returns" }));
    expect(screen.getByRole("button", { name: "Returns" })).toHaveAttribute("aria-expanded", "false");
  });
});
