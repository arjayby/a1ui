import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Checkbox } from "./checkbox";

const CHECK = "M4.5 9.5 L7.5 12.5 L13.5 5.5";
const DASH = "M5 9 L9 9 L13 9";

describe("Checkbox", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("toggles from the box and label, links its description, and strikes the label", () => {
    const onCheckedChange = vi.fn();
    render(
      <Checkbox
        label="Ship the changelog"
        description="Due Friday"
        strikethrough
        duration={0}
        onCheckedChange={onCheckedChange}
      />,
    );
    const box = screen.getByRole("checkbox", { name: "Ship the changelog" });
    expect(box).toHaveAccessibleDescription("Due Friday");
    expect(box).toHaveAttribute("aria-checked", "false");
    fireEvent.click(box);
    expect(box).toHaveAttribute("aria-checked", "true");
    expect(document.querySelector('[data-slot="checkbox-text"]')).toHaveAttribute("data-struck");
    fireEvent.click(screen.getByText("Ship the changelog"));
    expect(box).toHaveAttribute("aria-checked", "false");
    expect(document.querySelector('[data-slot="checkbox-text"]')).not.toHaveAttribute("data-struck");
    expect(onCheckedChange.mock.calls).toEqual([[true], [false]]);
  });

  it("morphs an indeterminate dash into a check once the caller clears it", () => {
    function Group() {
      const [done, setDone] = useState(1);
      return (
        <>
          <Checkbox
            label="All tasks"
            duration={0}
            checked={done === 2}
            indeterminate={done === 1}
            onCheckedChange={(checked) => setDone(checked ? 2 : 0)}
          />
          <span data-testid="done">{done}</span>
        </>
      );
    }
    render(<Group />);
    const box = screen.getByRole("checkbox", { name: "All tasks" });
    const mark = document.querySelector('[data-slot="checkbox-mark"]');
    expect(box).toHaveAttribute("aria-checked", "mixed");
    expect(mark).toHaveAttribute("d", DASH);
    fireEvent.click(box);
    expect(screen.getByTestId("done")).toHaveTextContent("2");
    expect(box).toHaveAttribute("aria-checked", "true");
  });

  it("starts checked without a burst, uses aria-label, and ignores disabled clicks", () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="Accept" defaultChecked disabled onCheckedChange={onCheckedChange} />);
    const box = screen.getByRole("checkbox", { name: "Accept" });
    expect(box).toHaveAttribute("aria-checked", "true");
    expect(document.querySelector('[data-slot="checkbox-mark"]')).toHaveAttribute("d", CHECK);
    expect(document.querySelector('[data-slot="checkbox-burst"]')).toBeNull();
    fireEvent.click(box);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
