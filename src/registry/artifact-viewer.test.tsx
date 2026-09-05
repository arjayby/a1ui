import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ArtifactViewer, serializeArtifact, type ChatArtifact } from "./artifact-viewer";
const code: ChatArtifact = {
  id: "code",
  kind: "code",
  title: "Example",
  content: "<script>alert(1)</script>\n<img src=x onerror=alert(1)>",
  filename: "../example.tsx",
};
describe("ArtifactViewer", () => {
  it("renders generated code as inert text and preserves full download content", async () => {
    const onDownload = vi.fn();
    const { container } = render(<ArtifactViewer artifact={code} onDownload={onDownload} />);
    expect(container.querySelector("script, img, iframe")).toBeNull();
    expect(screen.getByLabelText("Example code")).toHaveTextContent("<script>alert(1)</script>");
    expect(serializeArtifact(code)).toMatchObject({
      filename: "_example.tsx",
      content: code.content,
      mimeType: "text/plain;charset=utf-8",
    });
    fireEvent.click(screen.getByRole("button", { name: "Download artifact" }));
    await waitFor(() =>
      expect(onDownload).toHaveBeenCalledWith(
        code,
        expect.objectContaining({ filename: "_example.tsx", blob: expect.any(Blob) }),
      ),
    );
  });
  it("supports signed charts and rejects nonfinite data", () => {
    const chart: ChatArtifact = {
      id: "chart",
      kind: "chart",
      title: "Changes",
      series: [
        { label: "Down", value: -5 },
        { label: "Flat", value: 0 },
        { label: "Up", value: 10 },
      ],
    };
    const { rerender } = render(<ArtifactViewer artifact={chart} />);
    expect(screen.getByRole("table")).toHaveTextContent("Down-5Flat0Up10");
    expect(JSON.parse(serializeArtifact(chart).content).series).toHaveLength(3);
    rerender(<ArtifactViewer artifact={{ ...chart, series: [{ label: "Bad", value: NaN }] }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("finite numbers");
    expect(screen.getByRole("button", { name: "Download artifact" })).toBeDisabled();
  });
  it("disables incomplete downloads and allows recovery from a failed adapter", async () => {
    const onDownload = vi.fn().mockRejectedValueOnce(new Error("Save denied")).mockResolvedValue(undefined);
    const { rerender } = render(
      <ArtifactViewer
        artifact={code}
        status="streaming"
        onDownload={onDownload}
        renderPreview={() => <p>Custom preview</p>}
      />,
    );
    expect(screen.getByText("Custom preview")).toBeVisible();
    expect(screen.getByRole("button", { name: "Download artifact" })).toBeDisabled();
    rerender(<ArtifactViewer artifact={code} onDownload={onDownload} />);
    fireEvent.click(screen.getByRole("button", { name: "Download artifact" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Save denied");
    fireEvent.click(screen.getByRole("button", { name: "Download artifact" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Download requested"));
  });
});
