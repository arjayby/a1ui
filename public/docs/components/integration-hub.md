# Integration Hub

A connected workspace with six tools and animated pulses flowing into a central product.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Supported baseline: React 19, TypeScript, Tailwind CSS 4. Components use client-side React and browser APIs.

## When to use

- Product integration diagrams with up to six tools, inward pulses, and optional tool selection.

## Limitations

- Visualization only. No account connections, synchronization, or live activity data. Extra tools beyond six are ignored.

## Integration requirements

- Supply tools with unique IDs and a product. Icons are React nodes. Supply a pause control for automatic motion. Reduced motion retains static connections.

Import paths in examples assume the default @/components/ui alias. Adapt them to the target project's components.json. Put examples with state or callbacks in a client component when using React Server Components.

## Demo

[Interactive preview](http://localhost:3000/components/integration-hub)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/integration-hub.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/integration-hub.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/integration-hub.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/integration-hub.json --yes
```

## Code


### Usage

```tsx
"use client";

import { useState } from "react";
import { Code, FileText, PenTool, Folder, Layers, MessageSquare, Radio } from "lucide-react";
import { IntegrationHub, type IntegrationHubTool } from "@/components/ui/integration-hub";

const tools: IntegrationHubTool[] = [
  { id: "slack", name: "Slack", description: "Conversations", icon: <MessageSquare />, color: "#be6b96" },
  { id: "notion", name: "Notion", description: "Knowledge", icon: <FileText />, color: "#909486" },
  { id: "figma", name: "Figma", description: "Design files", icon: <PenTool />, color: "#c17f5f" },
  { id: "github", name: "GitHub", description: "Code", icon: <Code />, color: "#899776" },
  { id: "linear", name: "Linear", description: "Projects", icon: <Layers />, color: "#8b83d7" },
  { id: "drive", name: "Google Drive", description: "Files", icon: <Folder />, color: "#699f88" },
];

export function ConnectedWorkspace() {
  const [paused, setPaused] = useState(false);
  const [activeToolId, setActiveToolId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <IntegrationHub
        tools={tools}
        product={{ name: "Relay", description: "Shared context", icon: <Radio /> }}
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

Each tool has a unique `id`, a `name`, an `icon` as a React node, and optional `description` and CSS `color`. Use compact, non-interactive icons and short names. The first half of the array goes on the left, the rest on the right. One tool sits at the middle of its column. Empty arrays leave only the product visible.

Pulses travel from every tool toward the product, including the right column. The SVG paths and cards share proportional coordinates so their endpoints stay attached when the container resizes. Below a container width of 580 pixels, cards stack their icon and name and hide the secondary description. The component needs no measurement observers or animation library. Its scoped styles ship with the source.

The component inherits the page font and the `--background`, `--foreground`, `--border`, and `--muted-foreground` theme tokens. Override `--integration-hub-surface`, `--integration-hub-foreground`, `--integration-hub-border`, `--integration-hub-product-background`, `--integration-hub-product-foreground`, and `--integration-hub-accent` on a parent to customize it.

The product tile uses the surface color as its background, the foreground color for text and its icon, and the theme border color. It follows `--radius` for corners and `--font-mono` for typography, falling back to the inherited font. These defaults adapt to light and dark themes. The product name is bold and uppercase. The documentation demo uses Commit Mono throughout.

Provide a pause control for continuous motion, as in the example. Reduced motion hides the traveling pulses and retains the static connections. Tool selection still works. Without `onToolSelect`, the tool cards render as plain content with no extra tab stops.

Relay is a fictional product in the demo. The component visualizes connections; it does not connect accounts, sync files, or measure live activity. Supply real integration data and status from your app. The demo's tool artwork and controls are separate from the installed component. The demo uses brand icons from [SVG Logos](https://github.com/gilbarbara/logos); source links and the collection's license are included with the demo assets.

## Verification

Run the target project's typecheck and build. Render the integrated component and check the browser for missing styles, hydration errors, and failed assets. Exercise its keyboard controls and primary interaction. Report any app data or callbacks still needed; sample data is not a live integration.
