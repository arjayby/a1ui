import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select";

const fruits = { apple: "Apple", banana: "Banana", cherry: "Cherry" };

function Fruits(props: Partial<React.ComponentProps<typeof Select>>) {
  return (
    <Select items={fruits} duration={0} {...props}>
      <SelectTrigger aria-label="Fruit">
        <SelectValue placeholder="Pick a fruit" />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        <SelectGroup>
          <SelectLabel>Fruit</SelectLabel>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectItem value="cherry" disabled>
          Cherry
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

describe("Select", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows the placeholder, then the selected label with a check and one highlight", async () => {
    const onValueChange = vi.fn();
    render(<Fruits onValueChange={onValueChange} />);
    const trigger = screen.getByRole("combobox", { name: "Fruit" });
    expect(trigger).toHaveTextContent("Pick a fruit");
    expect(document.querySelector('[data-slot="select-value"]')).toHaveAttribute("data-placeholder");

    fireEvent.click(trigger);
    const listbox = await screen.findByRole("listbox");
    expect(screen.getByRole("group", { name: "Fruit" })).toBeInTheDocument();
    expect(listbox.querySelector('[data-slot="select-separator"]')).toBeInTheDocument();
    const banana = screen.getByRole("option", { name: "Banana" });
    fireEvent.mouseMove(banana);
    await waitFor(() => expect(banana).toHaveAttribute("data-highlighted"));
    expect(listbox.querySelectorAll('[data-slot="select-highlight"]')).toHaveLength(1);
    fireEvent.click(banana);

    expect(onValueChange).toHaveBeenCalledWith("banana");
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    expect(trigger).toHaveTextContent("Banana");
    expect(document.querySelector('[data-slot="select-value"]')).not.toHaveAttribute("data-placeholder");

    fireEvent.click(trigger);
    await screen.findByRole("listbox");
    const selected = screen.getByRole("option", { name: "Banana" });
    expect(selected).toHaveAttribute("aria-selected", "true");
    expect(selected.querySelector('[data-slot="select-check"]')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-slot="select-check"]')).toHaveLength(1);
  });

  it("ignores disabled items and follows a controlled value", async () => {
    function Controlled() {
      const [value, setValue] = useState<string | null>("apple");
      return (
        <>
          <Fruits value={value} onValueChange={setValue} />
          <button type="button" onClick={() => setValue(null)}>
            Clear
          </button>
        </>
      );
    }
    render(<Controlled />);
    const trigger = screen.getByRole("combobox", { name: "Fruit" });
    expect(trigger).toHaveTextContent("Apple");
    fireEvent.click(trigger);
    const cherry = await screen.findByRole("option", { name: "Cherry" });
    expect(cherry).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(cherry);
    expect(trigger).toHaveTextContent("Apple");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    act(() => screen.getByRole("button", { name: "Clear" }).click());
    expect(trigger).toHaveTextContent("Pick a fruit");
  });

  it("submits its value and reports open changes when the list is controlled", async () => {
    const onOpenChange = vi.fn();
    function ControlledOpen() {
      const [open, setOpen] = useState(false);
      return (
        <form aria-label="Order">
          <Fruits
            name="fruit"
            defaultValue="cherry"
            open={open}
            onOpenChange={(next) => {
              onOpenChange(next);
              setOpen(next);
            }}
          />
        </form>
      );
    }
    render(<ControlledOpen />);
    const form = screen.getByRole("form", { name: "Order" }) as HTMLFormElement;
    expect(new FormData(form).get("fruit")).toBe("cherry");
    fireEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
    await screen.findByRole("listbox");
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    // Base UI ignores clicks that land in the first moments after opening.
    await waitFor(() => {
      fireEvent.click(screen.getByRole("option", { name: "Apple" }));
      expect(onOpenChange).toHaveBeenLastCalledWith(false);
    });
    await waitFor(() => expect(new FormData(form).get("fruit")).toBe("apple"));
  });
});
