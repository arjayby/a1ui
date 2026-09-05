"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FileIcon, RotateCcw, X } from "lucide-react";
import {
  Attachment,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
  AttachmentAction,
} from "@/components/ui/attachment";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { cn } from "@/lib/utils";

export type ChatAttachment = {
  id: string;
  file: File;
  status: "idle" | "uploading" | "processing" | "done" | "error";
  progress?: number;
  error?: string;
};
export type AttachmentsProps = {
  items: readonly ChatAttachment[];
  onFilesSelected: (files: File[]) => void | Promise<void>;
  onRemove: (id: string) => void;
  onRetry?: (id: string) => void;
  accept?: string;
  maxFileSize?: number;
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
};

// Only local raster files get an image preview. No remote URL or HTML is interpreted.
function LocalPreview({ file }: { file: File }) {
  const ref = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    if (ref.current) ref.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  if (failed) return <FileIcon aria-label="Preview unavailable" />;
  // A blob URL is local and cannot use the Next.js image optimizer.
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} alt={`Preview of ${file.name}`} onError={() => setFailed(true)} />;
}

export function Attachments({
  items,
  onFilesSelected,
  onRemove,
  onRetry,
  accept,
  maxFileSize = 10 * 1024 * 1024,
  maxFiles = 5,
  disabled = false,
  className,
}: AttachmentsProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const selecting = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function select(files: File[]) {
    if (!files.length || selecting.current || disabled) return;
    if (items.length + files.length > maxFiles) {
      setError(`Choose at most ${maxFiles} files in total.`);
      return;
    }
    const oversized = files.find((file) => file.size > maxFileSize);
    if (oversized) {
      setError(`${oversized.name} exceeds the ${Math.round(maxFileSize / 1024 / 1024)} MB per-file limit.`);
      return;
    }
    selecting.current = true;
    setPending(true);
    setError("");
    try {
      await onFilesSelected(files);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add files. Try again.");
    } finally {
      selecting.current = false;
      setPending(false);
    }
  }
  return (
    <section
      aria-label="Attachments"
      className={cn(
        "bg-background text-foreground flex min-w-0 flex-col gap-4 rounded-lg border p-4",
        className,
      )}
    >
      <FieldGroup>
        <Field data-disabled={disabled || pending}>
          <FieldLabel htmlFor={id}>Attach files</FieldLabel>
          <Input
            ref={input}
            id={id}
            type="file"
            multiple
            accept={accept}
            disabled={disabled || pending}
            aria-describedby={`${id}-help`}
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = "";
              void select(files);
            }}
          />
          <FieldDescription id={`${id}-help`}>
            Up to {maxFiles} files, {Math.round(maxFileSize / 1024 / 1024)} MB each.
          </FieldDescription>
        </Field>
      </FieldGroup>
      {error && (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {items.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No files selected</EmptyTitle>
          </EmptyHeader>
        </Empty>
      )}
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {items.map((item) => {
          const percent =
            item.progress === undefined || !Number.isFinite(item.progress)
              ? undefined
              : Math.min(100, Math.max(0, item.progress));
          const raster = /^(image\/(png|jpeg|gif|webp|avif))$/.test(item.file.type);
          return (
            <li key={item.id} className="min-w-0">
              <Attachment state={item.status} className="w-full">
                <AttachmentMedia variant={raster ? "image" : "icon"}>
                  {raster ? (
                    <LocalPreview key={`${item.file.name}-${item.file.lastModified}`} file={item.file} />
                  ) : (
                    <FileIcon aria-hidden="true" />
                  )}
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle title={item.file.name}>{item.file.name}</AttachmentTitle>
                  <AttachmentDescription>
                    {Math.max(1, Math.round(item.file.size / 1024))} KB ·{" "}
                    {item.status === "done" ? "Ready" : item.status}
                  </AttachmentDescription>
                </AttachmentContent>
                <AttachmentActions>
                  {item.status === "error" && onRetry && (
                    <AttachmentAction
                      type="button"
                      size="icon-sm"
                      aria-label={`Retry ${item.file.name}`}
                      disabled={disabled}
                      onClick={() => onRetry(item.id)}
                    >
                      <RotateCcw aria-hidden="true" />
                    </AttachmentAction>
                  )}
                  <AttachmentAction
                    type="button"
                    size="icon-sm"
                    aria-label={`Remove ${item.file.name}`}
                    disabled={disabled}
                    onClick={() => {
                      onRemove(item.id);
                      input.current?.focus();
                    }}
                  >
                    <X aria-hidden="true" />
                  </AttachmentAction>
                </AttachmentActions>
              </Attachment>
              {item.status === "uploading" && (
                <progress
                  className="w-full"
                  aria-label={`Upload progress for ${item.file.name}`}
                  max={100}
                  value={percent}
                />
              )}
              {item.status === "error" && (
                <p role="alert" className="mt-2 text-sm break-words">
                  {item.error || "Upload failed. Try again."}
                </p>
              )}
              <span className="sr-only" role="status">
                {item.file.name}: {item.status}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
