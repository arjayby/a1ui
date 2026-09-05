"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { cn } from "@/lib/utils";

export type TextArtifact = {
  id: string;
  title: string;
  filename?: string;
  kind: "code" | "document";
  content: string;
  language?: string;
};
export type ChartArtifact = {
  id: string;
  title: string;
  filename?: string;
  kind: "chart";
  series: readonly { label: string; value: number }[];
  unit?: string;
};
export type ChatArtifact = TextArtifact | ChartArtifact;
export type ArtifactViewerProps = {
  artifact: ChatArtifact;
  status?: "ready" | "streaming" | "error";
  error?: string;
  renderPreview?: (artifact: ChatArtifact) => ReactNode;
  onDownload?: (artifact: ChatArtifact, file: { blob: Blob; filename: string }) => void | Promise<void>;
  className?: string;
};

function chartError(artifact: ChartArtifact) {
  return artifact.series.some((point) => !Number.isFinite(point.value))
    ? "Chart values must be finite numbers."
    : "";
}
export function serializeArtifact(artifact: ChatArtifact) {
  if (artifact.kind === "chart" && chartError(artifact)) throw new Error(chartError(artifact));
  const fallback =
    artifact.kind === "chart" ? "chart.json" : artifact.kind === "code" ? "code.txt" : "document.txt";
  const filename =
    (artifact.filename ?? fallback)
      .replace(/[\\/]/g, "_")
      .split("")
      .filter((character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127)
      .join("")
      .replace(/^\.+/, "")
      .trim() || fallback;
  return {
    filename,
    content:
      artifact.kind === "chart"
        ? JSON.stringify({ title: artifact.title, unit: artifact.unit, series: artifact.series }, null, 2)
        : artifact.content,
    mimeType: artifact.kind === "chart" ? "application/json" : "text/plain;charset=utf-8",
  };
}

export function ArtifactCodePreview({ artifact }: { artifact: TextArtifact }) {
  return (
    <pre
      aria-label={`${artifact.title} code`}
      tabIndex={0}
      className="max-h-96 overflow-auto rounded-md border p-4 text-sm"
    >
      <code data-language={artifact.language}>{artifact.content}</code>
    </pre>
  );
}
export function ArtifactDocumentPreview({ artifact }: { artifact: TextArtifact }) {
  return (
    <article
      aria-label={`${artifact.title} document`}
      className="max-h-96 overflow-auto rounded-md border p-4 text-sm leading-relaxed break-words whitespace-pre-wrap"
      tabIndex={0}
    >
      {artifact.content}
    </article>
  );
}
export function ArtifactChartPreview({ artifact }: { artifact: ChartArtifact }) {
  const error = chartError(artifact);
  if (error)
    return (
      <Alert>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  if (!artifact.series.length)
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No chart data</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  const maximum = artifact.series.reduce((max, point) => Math.max(max, Math.abs(point.value)), 0) || 1;
  return (
    <figure className="m-0 flex min-w-0 flex-col gap-3">
      <figcaption className="text-muted-foreground text-xs">
        {artifact.title}
        {artifact.unit ? ` · ${artifact.unit}` : ""}. Bars extend left for negative values and right for
        positive values.
      </figcaption>
      <table
        className="w-full table-fixed border-collapse text-sm"
        aria-label={`${artifact.title} chart data`}
      >
        <thead>
          <tr className="border-b">
            <th scope="col" className="w-1/3 p-2 text-left">
              Label
            </th>
            <th scope="col" className="p-2 text-left">
              Distribution
            </th>
            <th scope="col" className="w-1/4 p-2 text-right">
              Value
            </th>
          </tr>
        </thead>
        <tbody>
          {artifact.series.map((point, index) => (
            <tr key={index} className="border-b">
              <th scope="row" className="p-2 text-left font-normal break-words">
                {point.label}
              </th>
              <td className="p-2">
                <div aria-hidden="true" className="bg-muted relative h-5">
                  <span className="border-foreground absolute inset-y-0 left-1/2 border-l" />
                  <span
                    className="bg-foreground absolute inset-y-1"
                    style={{
                      left: `${point.value < 0 ? 50 - (Math.abs(point.value) / maximum) * 50 : 50}%`,
                      width: `${(Math.abs(point.value) / maximum) * 50}%`,
                    }}
                  />
                </div>
              </td>
              <td className="p-2 text-right break-all tabular-nums">
                {point.value}
                {artifact.unit ?? ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export function ArtifactViewer(props: ArtifactViewerProps) {
  return <ArtifactContent key={props.artifact.id} {...props} />;
}
function ArtifactContent({
  artifact,
  status = "ready",
  error,
  renderPreview,
  onDownload,
  className,
}: ArtifactViewerProps) {
  const [pending, setPending] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [notice, setNotice] = useState("");
  const lock = useRef(false);
  const urls = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const active = urls.current;
    return () => {
      active.forEach((timer, url) => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
      });
      active.clear();
    };
  }, []);
  const invalid = artifact.kind === "chart" ? chartError(artifact) : "";
  const problem = status === "error" ? error || "Artifact generation failed." : invalid;
  async function download() {
    if (lock.current || status !== "ready" || problem) return;
    lock.current = true;
    setPending(true);
    setDownloadError("");
    setNotice("");
    try {
      const serialized = serializeArtifact(artifact);
      const blob = new Blob([serialized.content], { type: serialized.mimeType });
      if (onDownload) await onDownload(artifact, { blob, filename: serialized.filename });
      else {
        const url = URL.createObjectURL(blob);
        // Keep the URL alive long enough for the browser to begin reading the download.
        urls.current.set(
          url,
          setTimeout(() => {
            URL.revokeObjectURL(url);
            urls.current.delete(url);
          }, 1000),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = serialized.filename;
        document.body.appendChild(link);
        try {
          link.click();
        } finally {
          link.remove();
        }
      }
      setNotice("Download requested.");
    } catch (cause) {
      setDownloadError(cause instanceof Error ? cause.message : "Download failed. Try again.");
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  return (
    <section
      aria-label="Artifact viewer"
      className={cn(
        "bg-background text-foreground flex min-w-0 flex-col gap-4 rounded-lg border p-4",
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold break-words">{artifact.title}</h3>
          <p className="text-muted-foreground text-xs">
            {artifact.kind}
            {artifact.kind === "code" && artifact.language ? ` · ${artifact.language}` : ""}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={pending || status !== "ready" || !!problem}
          onClick={() => void download()}
        >
          {pending ? "Preparing download…" : "Download artifact"}
        </Button>
      </header>
      {problem ? (
        <Alert>
          <AlertDescription>{problem}</AlertDescription>
        </Alert>
      ) : renderPreview ? (
        renderPreview(artifact)
      ) : artifact.kind === "chart" ? (
        <ArtifactChartPreview artifact={artifact} />
      ) : artifact.kind === "code" ? (
        <ArtifactCodePreview artifact={artifact} />
      ) : (
        <ArtifactDocumentPreview artifact={artifact} />
      )}
      <p role="status" className="text-muted-foreground text-xs">
        {status === "streaming"
          ? "Updating artifact… Download is available when generation finishes."
          : pending
            ? "Preparing download…"
            : notice}
      </p>
      {downloadError && (
        <Alert>
          <AlertDescription>{downloadError}</AlertDescription>
        </Alert>
      )}
    </section>
  );
}
