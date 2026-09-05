"use client";

import { useId, useState } from "react";
import { ArtifactViewer, type ChatArtifact } from "@/registry/artifact-viewer";
import { Field, FieldLabel } from "@/components/ui/field";

const artifacts: ChatArtifact[] = [
  {
    id: "code",
    kind: "code",
    title: "A small greeting",
    language: "tsx",
    filename: "greeting.tsx",
    content: "export function Greeting({ name }: { name: string }) {\n  return <h1>Hello, {name}</h1>;\n}\n",
  },
  {
    id: "document",
    kind: "document",
    title: "Release brief",
    filename: "release-brief.txt",
    content:
      "Release brief\n\nWhat changed\nSaved conversations, local attachments, and review controls.\n\nNext steps\nConnect the UI callbacks to your own persistence and tool services.\n\nMarkup remains text: <script>alert('example')</script>",
  },
  {
    id: "chart",
    kind: "chart",
    title: "Change in completion rate",
    filename: "completion-rate.json",
    unit: "%",
    series: [
      { label: "Search", value: 18 },
      { label: "Compose", value: 9 },
      { label: "Review", value: -4 },
      { label: "Export", value: 0 },
    ],
  },
];
export function ArtifactViewerDemo() {
  const id = useId();
  const [selected, setSelected] = useState("code");
  return (
    <div className="not-prose flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor={id}>Choose an artifact</FieldLabel>
        <select
          id={id}
          className="bg-background rounded-md border p-2 text-sm"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
        >
          {artifacts.map((artifact) => (
            <option key={artifact.id} value={artifact.id}>
              {artifact.title}
            </option>
          ))}
        </select>
      </Field>
      <ArtifactViewer artifact={artifacts.find((artifact) => artifact.id === selected)!} />
      <p className="text-muted-foreground text-sm">
        Example content, with real local downloads. Code is displayed as text. The chart downloads its
        underlying JSON data. Nothing is executed or fetched.
      </p>
    </div>
  );
}
