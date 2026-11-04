# Integration Hub

A connected workspace with six tools and animated pulses flowing into a central product.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/blocks path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/blocks/integration-hub)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/integration-hub.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/integration-hub.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/integration-hub.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/integration-hub.json --yes
```

## Dependencies

- `clsx`

## Code


### Usage

```tsx
"use client";

import { useState } from "react";
import { IntegrationHub, type IntegrationHubTool } from "@/components/blocks/integration-hub";

// Any ReactNode works as an icon. Swap these for your own icon set.
function Icon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

const tools: IntegrationHubTool[] = [
  {
    id: "slack",
    name: "Slack",
    description: "Conversations",
    icon: <Icon d="M4 5h16v11H9l-5 4z" />,
    color: "#be6b96",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Knowledge",
    icon: <Icon d="M6 3h8l4 4v14H6zM14 3v4h4M9 13h6M9 17h6" />,
    color: "#909486",
  },
  {
    id: "figma",
    name: "Figma",
    description: "Design files",
    icon: <Icon d="M4 20l4-1L19 8l-3-3L5 16zM14 7l3 3" />,
    color: "#c17f5f",
  },
  {
    id: "github",
    name: "GitHub",
    description: "Code",
    icon: <Icon d="M8 8l-4 4 4 4M16 8l4 4-4 4" />,
    color: "#899776",
  },
  {
    id: "linear",
    name: "Linear",
    description: "Projects",
    icon: <Icon d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5" />,
    color: "#8b83d7",
  },
  {
    id: "drive",
    name: "Google Drive",
    description: "Files",
    icon: <Icon d="M3 6h6l2 2h10v11H3z" />,
    color: "#699f88",
  },
];

export function ConnectedWorkspace() {
  const [paused, setPaused] = useState(false);
  const [activeToolId, setActiveToolId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <IntegrationHub
        tools={tools}
        product={{
          name: "Relay",
          description: "Shared context",
          icon: (
            <Icon d="M12 12h.01M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8" />
          ),
        }}
        activeToolId={activeToolId}
        onToolSelect={(tool) => setActiveToolId((current) => (current === tool.id ? null : tool.id))}
        paused={paused}
      />
      <button type="button" onClick={() => setPaused((current) => !current)} aria-pressed={paused}>
        {paused ? "Resume pulses" : "Pause pulses"}
      </button>
    </div>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/integration-hub.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop           | Type                                                                       | Default  | Purpose                                                                                                                        |
| -------------- | -------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `tools`        | `readonly IntegrationHubTool[]`                                            | Required | Up to six tools, split into left and right columns. Extra entries are ignored.                                                 |
| `product`      | `{ name: string; icon: ReactNode; description?: string; status?: string }` | Required | Content of the center tile.                                                                                                    |
| `activeToolId` | `string \| null`                                                           | `null`   | Highlights one tool and its connection. A missing or unknown ID shows all connections.                                         |
| `onToolSelect` | `(tool: IntegrationHubTool) => void`                                       | None     | Makes tool cards keyboard-accessible buttons. Update `activeToolId` in this callback to select a connection.                   |
| `paused`       | `boolean`                                                                  | `false`  | Freezes the pulses in place. Clearing it resumes their progress.                                                               |
| `duration`     | `number`                                                                   | `4`      | Seconds per pulse cycle, including a short rest. Finite values are clamped to at least one second; non-finite values use four. |
| `className`    | `string`                                                                   | None     | Adds classes to the outer element.                                                                                             |
| `style`        | `CSSProperties`                                                            | None     | Inline styles and custom properties.                                                                                           |
