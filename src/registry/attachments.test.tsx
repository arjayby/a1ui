import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Attachments } from "./attachments";

afterEach(() => vi.unstubAllGlobals());
describe("Attachments", () => {
  it("validates batches and allows selecting the same file again", async () => {
    const onFilesSelected = vi.fn();
    render(
      <Attachments
        items={[]}
        maxFiles={1}
        maxFileSize={4}
        onFilesSelected={onFilesSelected}
        onRemove={vi.fn()}
      />,
    );
    const file = new File(["hello"], "large.txt");
    fireEvent.change(screen.getByLabelText("Attach files"), { target: { files: [file] } });
    expect(screen.getByRole("alert")).toHaveTextContent("exceeds");
    expect(onFilesSelected).not.toHaveBeenCalled();
    const small = new File(["hi"], "small.txt");
    fireEvent.change(screen.getByLabelText("Attach files"), { target: { files: [small] } });
    expect(onFilesSelected).toHaveBeenCalledWith([small]);
    expect(screen.getByLabelText("Attach files")).toHaveValue("");
  });
  it("revokes local image URLs and exposes retry, removal, and progress", () => {
    const createObjectURL = vi.fn(() => "blob:preview");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    const file = new File(["image"], "photo.png", { type: "image/png" });
    const onRemove = vi.fn();
    const onRetry = vi.fn();
    const { rerender, unmount } = render(
      <Attachments
        items={[{ id: "a", file, status: "uploading", progress: 150 }]}
        onFilesSelected={vi.fn()}
        onRemove={onRemove}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "100");
    expect(screen.getByRole("img")).toHaveAttribute("src", "blob:preview");
    rerender(
      <Attachments
        items={[{ id: "a", file, status: "error", error: "Disconnected" }]}
        onFilesSelected={vi.fn()}
        onRemove={onRemove}
        onRetry={onRetry}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry photo.png" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove photo.png" }));
    expect(onRetry).toHaveBeenCalledWith("a");
    expect(onRemove).toHaveBeenCalledWith("a");
    expect(screen.getByRole("alert")).toHaveTextContent("Disconnected");
    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:preview");
  });
});
