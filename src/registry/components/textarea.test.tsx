import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Textarea } from "./textarea";

describe("Textarea", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
    // jsdom has no layout: give each line 24px plus 16px of padding so the mirror can be measured.
    Object.defineProperty(HTMLTextAreaElement.prototype, "scrollHeight", {
      configurable: true,
      get(this: HTMLTextAreaElement) {
        return 16 + 24 * this.value.split("\n").length;
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    delete (HTMLTextAreaElement.prototype as { scrollHeight?: number }).scrollHeight;
  });

  it("grows with its text between minRows and maxRows, then scrolls, and submits with its form", async () => {
    const onValueChange = vi.fn();
    render(
      <form data-testid="form">
        <Textarea
          label="Message"
          name="message"
          required
          minRows={2}
          maxRows={4}
          duration={0}
          onValueChange={onValueChange}
        />
      </form>,
    );
    const field = screen.getByRole("textbox", { name: "Message" });
    const frame = document.querySelector<HTMLElement>('[data-slot="textarea-frame"]')!;
    expect(field).toBeRequired();
    expect(field).toHaveStyle({ height: "64px" });
    await waitFor(() => expect(frame).toHaveStyle({ height: "64px" }));

    fireEvent.change(field, { target: { value: "one\ntwo\nthree" } });
    expect(onValueChange).toHaveBeenLastCalledWith("one\ntwo\nthree");
    expect(field).toHaveStyle({ height: "88px", overflowY: "hidden" });
    await waitFor(() => expect(frame).toHaveStyle({ height: "88px" }));

    fireEvent.change(field, { target: { value: "1\n2\n3\n4\n5\n6" } });
    expect(field).toHaveStyle({ height: "112px", overflowY: "auto" });
    expect(field).toHaveAttribute("data-scrolls");

    fireEvent.change(field, { target: { value: "short" } });
    expect(field).toHaveStyle({ height: "64px" });
    expect(field).not.toHaveAttribute("data-scrolls");
    expect(new FormData(screen.getByTestId("form") as HTMLFormElement).getAll("message")).toEqual(["short"]);
  });

  it("waits for the caller to update a controlled value", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<Textarea aria-label="Notes" value="draft" onValueChange={onValueChange} />);
    const field = screen.getByRole("textbox", { name: "Notes" });
    fireEvent.change(field, { target: { value: "drafts" } });
    expect(onValueChange).toHaveBeenLastCalledWith("drafts");
    expect(field).toHaveValue("draft");
    rerender(<Textarea aria-label="Notes" value={"a\nb\nc"} onValueChange={onValueChange} />);
    expect(field).toHaveValue("a\nb\nc");
    expect(field).toHaveStyle({ height: "88px" });
  });

  it("counts characters toward maxLength and shifts state near and at the limit", () => {
    render(<Textarea label="Bio" maxLength={10} showCount defaultValue="hey" duration={0} />);
    const field = screen.getByRole("textbox", { name: "Bio" });
    const count = document.querySelector('[data-slot="textarea-count"]')!;
    expect(field).toHaveAttribute("maxlength", "10");
    expect(field).toHaveAccessibleDescription("3 of 10 characters");
    expect(count).toHaveAttribute("data-state", "under");
    expect(count.querySelectorAll('[data-slot="textarea-digit"]')).toHaveLength(1);

    fireEvent.change(field, { target: { value: "12345678" } });
    expect(count).toHaveAttribute("data-state", "near");
    fireEvent.change(field, { target: { value: "1234567890" } });
    expect(count).toHaveAttribute("data-state", "limit");
    expect(count).toHaveClass("text-destructive");
    expect(count.querySelectorAll('[data-slot="textarea-digit"]')).toHaveLength(2);
  });

  it("wires the description and an error message, and marks the field invalid", () => {
    const { rerender } = render(<Textarea label="Reason" description="Shown to reviewers." />);
    const field = screen.getByRole("textbox", { name: "Reason" });
    expect(field).toHaveAccessibleDescription("Shown to reviewers.");
    expect(field).not.toHaveAttribute("aria-invalid");

    rerender(<Textarea label="Reason" description="Shown to reviewers." error="Add a reason." />);
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription("Add a reason. Shown to reviewers.");
    expect(document.querySelector('[data-slot="textarea-frame"]')).toHaveAttribute("data-invalid");
    expect(screen.getByText("Add a reason.")).toBeInTheDocument();
  });
});
