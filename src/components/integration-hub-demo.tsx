"use client";

import { Pause, Play } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { IntegrationHub, type IntegrationHubTool } from "@/registry/integration-hub";

function RelayMark() {
  return (
    <svg viewBox="0 0 40 40" fill="none">
      <path
        d="M8 27 18 10M17 30 27 13M26 30l6-10"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="square"
      />
    </svg>
  );
}

// Unmodified SVG Logos assets. Provenance: public/images/integration-hub/README.md.
function ToolLogo({ file, monochrome = false }: { file: string; monochrome?: boolean }) {
  return (
    <Image
      src={`/images/integration-hub/${file}.svg`}
      alt=""
      width={28}
      height={28}
      unoptimized
      className="integration-hub-tool-logo"
      data-monochrome={monochrome}
    />
  );
}

const tools: IntegrationHubTool[] = [
  {
    id: "slack",
    name: "Slack",
    description: "Conversations",
    color: "#be6b96",
    icon: <ToolLogo file="slack" />,
  },
  {
    id: "notion",
    name: "Notion",
    description: "Knowledge",
    color: "#909486",
    icon: <ToolLogo file="notion" />,
  },
  {
    id: "figma",
    name: "Figma",
    description: "Design files",
    color: "#c17f5f",
    icon: <ToolLogo file="figma" />,
  },
  {
    id: "github",
    name: "GitHub",
    description: "Code & pull requests",
    color: "#899776",
    icon: <ToolLogo file="github" monochrome />,
  },
  {
    id: "linear",
    name: "Linear",
    description: "Issues & projects",
    color: "#8b83d7",
    icon: <ToolLogo file="linear" monochrome />,
  },
  {
    id: "drive",
    name: "Google Drive",
    description: "Documents & files",
    color: "#699f88",
    icon: <ToolLogo file="google-drive" />,
  },
];

const product = {
  name: "Relay",
  description: "Your team's shared brain",
  icon: <RelayMark />,
  status: "Receiving signals",
};

export function IntegrationHubPreview() {
  return (
    <div className="not-prose demo-frame integration-hub-preview">
      <IntegrationHub tools={tools} product={product} paused />
    </div>
  );
}

export function IntegrationHubDemo() {
  const [paused, setPaused] = useState(false);
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const activeTool = tools.find((tool) => tool.id === activeToolId);

  return (
    <div className="not-prose demo-frame integration-hub-demo">
      <IntegrationHub
        tools={tools}
        product={{ ...product, status: activeTool ? `From ${activeTool.name}` : product.status }}
        activeToolId={activeToolId}
        onToolSelect={(tool) => setActiveToolId((current) => (current === tool.id ? null : tool.id))}
        paused={paused}
      />
      <div className="integration-hub-demo-footer">
        <span className="integration-hub-demo-count">
          <span aria-hidden="true" />6 integrations{" "}
          <span className="integration-hub-demo-hint">· Select a tool to explore</span>
        </span>
        <button
          type="button"
          onClick={() => setPaused((current) => !current)}
          aria-pressed={paused}
          className="integration-hub-demo-pause"
        >
          {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
          {paused ? "Resume pulses" : "Pause pulses"}
        </button>
        <span className="integration-hub-demo-reduced">Motion reduced</span>
      </div>
    </div>
  );
}
