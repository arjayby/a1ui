import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MessageActions } from "./message-actions";

describe("MessageActions", () => {
  it("copies complete raw text and reports clipboard failures", async () => {
    const text = "Answer\n```tsx\nconst x = 1;\n```";
    const onCopy = vi.fn().mockRejectedValueOnce(new Error("Clipboard denied")).mockResolvedValue(undefined);
    render(<MessageActions messageId="a" text={text} onCopy={onCopy} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy response" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Clipboard denied");
    fireEvent.click(screen.getByRole("button", { name: "Copy response" }));
    expect(await screen.findByRole("button", { name: "Copied" })).toBeEnabled();
    expect(onCopy).toHaveBeenLastCalledWith(text);
  });
  it("preserves edited whitespace and resets local state for a different message", async () => {
    const onEdit = vi.fn();
    const { rerender } = render(<MessageActions messageId="a" text="Old" onEdit={onEdit} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Edit message"), { target: { value: " New\ntext " } });
    fireEvent.click(screen.getByRole("button", { name: "Save edit" }));
    await waitFor(() => expect(screen.queryByLabelText("Edit message")).not.toBeInTheDocument());
    expect(onEdit).toHaveBeenCalledWith("a", " New\ntext ");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    rerender(<MessageActions messageId="b" text="Second" onEdit={onEdit} />);
    expect(screen.queryByLabelText("Edit message")).not.toBeInTheDocument();
  });
  it("gates retry and feedback by response state", async () => {
    const onFeedback = vi.fn();
    const onRetry = vi.fn();
    const props = { messageId: "a", text: "Answer", onFeedback, onRetry, onRegenerate: vi.fn() };
    const { rerender } = render(<MessageActions {...props} status="streaming" />);
    expect(screen.getByRole("button", { name: "Copy response" })).toBeDisabled();
    expect(screen.getByLabelText("Helpful", { exact: true })).toBeDisabled();
    rerender(<MessageActions {...props} status="error" />);
    expect(screen.queryByRole("button", { name: "Regenerate" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry response" }));
    await waitFor(() => expect(onRetry).toHaveBeenCalledWith("a"));
    rerender(<MessageActions {...props} feedback="positive" />);
    expect(screen.getByLabelText("Helpful", { exact: true })).toBeChecked();
    await waitFor(() => expect(screen.getByRole("button", { name: "Clear feedback" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Clear feedback" }));
    await waitFor(() => expect(onFeedback).toHaveBeenCalledWith("a", null));
  });
});
