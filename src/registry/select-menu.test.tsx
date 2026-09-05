import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { SelectMenu, type SelectMenuOption } from "@/registry/select-menu";

const options: SelectMenuOption[] = [
  { value: "production", label: "Production", description: "Visible to everyone", detail: "Live" },
  { value: "staging", label: "Staging", description: "Review changes" },
  { value: "archived", label: "Archived", disabled: true },
];

describe("SelectMenu", () => {
  it("updates its controlled value from the selected option", async () => {
    const onChange = vi.fn();
    function Harness() {
      const [value, setValue] = useState("production");
      return (
        <form aria-label="Deployment">
          <SelectMenu
            options={options}
            value={value}
            onValueChange={(next) => {
              onChange(next);
              setValue(next);
            }}
            ariaLabel="Environment"
            name="environment"
          />
        </form>
      );
    }
    render(<Harness />);
    const form = screen.getByRole("form", { name: "Deployment" }) as HTMLFormElement;
    expect(new FormData(form).get("environment")).toBe("production");
    fireEvent.click(screen.getByRole("combobox", { name: "Environment" }));
    expect(await screen.findByRole("option", { name: /Production/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("option", { name: "Archived" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("option", { name: "Staging" })).toHaveAccessibleDescription("Review changes");
    fireEvent.pointerDown(screen.getByRole("option", { name: "Staging" }));
    fireEvent.click(screen.getByRole("option", { name: "Staging" }));
    expect(screen.getByRole("combobox", { name: "Environment" })).toHaveTextContent("Staging");
    expect(onChange).toHaveBeenCalledWith("staging");
    expect(new FormData(form).get("environment")).toBe("staging");
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
  });

  it("shows a placeholder when the selected option is removed without emitting an edit", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <SelectMenu options={options} value="production" onValueChange={onChange} ariaLabel="Environment" />,
    );
    rerender(
      <SelectMenu
        options={options.slice(1)}
        value="production"
        onValueChange={onChange}
        ariaLabel="Environment"
      />,
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("Select an option");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("only handles enabled shortcuts in the open menu without modifiers or composition", async () => {
    const onChange = vi.fn();
    render(
      <SelectMenu
        options={options.map((option, index) => ({ ...option, shortcut: String(index + 1) }))}
        value="production"
        onValueChange={onChange}
        ariaLabel="Environment"
      />,
    );
    const trigger = screen.getByRole("combobox", { name: "Environment" });
    fireEvent.keyDown(trigger, { key: "2" });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(trigger);
    const list = await screen.findByRole("listbox");
    for (const event of [
      { key: "3" },
      { key: "2", ctrlKey: true },
      { key: "2", metaKey: true },
      { key: "2", altKey: true },
      { key: "2", shiftKey: true },
      { key: "2", isComposing: true },
      { key: "2", repeat: true },
    ]) {
      fireEvent.keyDown(list, event);
      expect(onChange).not.toHaveBeenCalled();
      expect(trigger).toHaveAttribute("aria-expanded", "true");
    }
    fireEvent.keyDown(list, { key: "2" });
    expect(onChange).toHaveBeenCalledExactlyOnceWith("staging");
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
  });

  it.each([{ items: [] }, { items: [{ value: "archived", label: "Archived", disabled: true }] }])(
    "disables lists with no available choices",
    ({ items }) => {
      render(<SelectMenu options={items} value="" onValueChange={vi.fn()} ariaLabel="Environment" />);
      expect(screen.getByRole("combobox")).toBeDisabled();
    },
  );

  it("honors the disabled prop", () => {
    render(
      <SelectMenu
        options={options}
        value="production"
        onValueChange={vi.fn()}
        ariaLabel="Environment"
        disabled
      />,
    );
    expect(screen.getByRole("combobox")).toBeDisabled();
  });
});
