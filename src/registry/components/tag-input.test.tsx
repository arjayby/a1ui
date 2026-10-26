import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TagInput } from "./tag-input";

const tagNames = () =>
  Array.from(document.querySelectorAll('[data-slot="tag-input-tag"]'), (tag) => tag.textContent);

describe("TagInput", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("adds tags on Enter and comma, and skips blanks and duplicates", () => {
    const onValueChange = vi.fn();
    render(<TagInput label="Topics" onValueChange={onValueChange} />);
    const input = screen.getByRole("textbox", { name: "Topics" });

    fireEvent.change(input, { target: { value: " Design " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onValueChange).toHaveBeenLastCalledWith(["Design"]);
    expect(input).toHaveValue("");

    fireEvent.change(input, { target: { value: "Motion" } });
    fireEvent.keyDown(input, { key: "," });
    fireEvent.change(input, { target: { value: "design" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(tagNames()).toEqual(["Design", "Motion"]);
    expect(input).toHaveValue("design");
    expect(screen.getByText("design is already added.")).toBeInTheDocument();
  });

  it("highlights the last tag on the first Backspace and removes it on the second", () => {
    render(<TagInput label="Topics" defaultValue={["Design", "Motion"]} />);
    const input = screen.getByRole("textbox", { name: "Topics" });

    fireEvent.keyDown(input, { key: "Backspace" });
    const last = screen.getByText("Motion").closest('[data-slot="tag-input-tag"]');
    expect(last).toHaveAttribute("data-highlighted", "true");
    expect(tagNames()).toEqual(["Design", "Motion"]);

    fireEvent.keyDown(input, { key: "Escape" });
    expect(last).not.toHaveAttribute("data-highlighted");

    fireEvent.keyDown(input, { key: "Backspace" });
    fireEvent.keyDown(input, { key: "Backspace" });
    expect(screen.getByText("Removed Motion.")).toBeInTheDocument();
  });

  it("removes a tag with its remove button", () => {
    const onValueChange = vi.fn();
    render(<TagInput label="Topics" defaultValue={["Design", "Motion"]} onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove Design" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["Motion"]);
  });

  it("stops at max and adds pasted entries that fit", () => {
    const onValueChange = vi.fn();
    render(<TagInput label="Topics" max={3} defaultValue={["Design"]} onValueChange={onValueChange} />);
    const input = screen.getByRole("textbox", { name: "Topics" });
    expect(screen.getByText("1/3")).toBeInTheDocument();

    fireEvent.paste(input, { clipboardData: { getData: () => "Motion, React, Zod" } });
    expect(onValueChange).toHaveBeenLastCalledWith(["Design", "Motion", "React"]);
    expect(screen.getByText("3/3")).toBeInTheDocument();
    expect(input).toHaveAttribute("readonly");
    expect(screen.getByText("Limit of 3 tags reached.")).toBeInTheDocument();
  });

  it("submits each tag under name", () => {
    render(
      <form data-testid="form">
        <TagInput label="Topics" name="topics" defaultValue={["Design", "Motion"]} />
      </form>,
    );
    expect(new FormData(screen.getByTestId<HTMLFormElement>("form")).getAll("topics")).toEqual([
      "Design",
      "Motion",
    ]);
  });
});
