import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConversationHistory } from "./conversation-history";

const conversations = [
  { id: "a", title: "Alpha", preview: "Research" },
  { id: "b", title: "Beta" },
];
describe("ConversationHistory", () => {
  it("searches previews and reports controlled selection", () => {
    const onSelect = vi.fn();
    render(
      <ConversationHistory
        conversations={conversations}
        selectedId="a"
        onSelect={onSelect}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Alpha" })).toHaveAttribute("aria-current", "true");
    fireEvent.change(screen.getByLabelText("Search conversations"), { target: { value: "research" } });
    expect(screen.queryByRole("button", { name: "Beta" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Alpha" }));
    expect(onSelect).toHaveBeenCalledWith("a");
  });
  it("trims titles, prevents empty saves and recovers from persistence errors", async () => {
    const onRename = vi.fn().mockRejectedValueOnce(new Error("Storage full")).mockResolvedValue(undefined);
    render(
      <ConversationHistory
        conversations={conversations}
        onSelect={vi.fn()}
        onRename={onRename}
        onDelete={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Rename Alpha" }));
    fireEvent.change(screen.getByLabelText("Conversation title"), { target: { value: "  " } });
    expect(screen.getByRole("button", { name: "Save title" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Conversation title"), { target: { value: " Renamed " } });
    fireEvent.click(screen.getByRole("button", { name: "Save title" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Storage full");
    fireEvent.click(screen.getByRole("button", { name: "Save title" }));
    await waitFor(() => expect(screen.queryByLabelText("Conversation title")).not.toBeInTheDocument());
    expect(onRename).toHaveBeenLastCalledWith("a", "Renamed");
  });
  it("requires confirmation and blocks repeated deletion", async () => {
    let resolve!: () => void;
    const onDelete = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    render(
      <ConversationHistory
        conversations={conversations}
        onSelect={vi.fn()}
        onRename={vi.fn()}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete Alpha" }));
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    expect(screen.getByRole("button", { name: "Deleting…" })).toBeDisabled();
    resolve();
    await waitFor(() => expect(screen.queryByText("Confirm delete")).not.toBeInTheDocument());
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
