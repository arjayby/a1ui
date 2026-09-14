"use client";

import { ArrowUpRight, GitBranch, Pause, Play, Radio, RotateCcw } from "lucide-react";
import { useState } from "react";

import { IntegrationHub, type IntegrationHubTool } from "@/registry/integration-hub";

function RelayMark() {
  return (
    <svg viewBox="0 0 40 40" fill="none">
      <path
        d="M8 27 18 10M17 30 27 13M26 30l6-10"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

const tools: IntegrationHubTool[] = [
  {
    id: "slack",
    name: "Slack",
    description: "Conversations",
    color: "#be6b96",
    icon: (
      <svg viewBox="0 0 32 32" fill="none">
        <path d="M4 12h9M12 4v1" stroke="#36c5f0" strokeWidth="5" strokeLinecap="round" />
        <path d="M20 4v9M28 12h-1" stroke="#2eb67d" strokeWidth="5" strokeLinecap="round" />
        <path d="M28 20h-9M20 28v-1" stroke="#ecb22e" strokeWidth="5" strokeLinecap="round" />
        <path d="M12 28v-9M4 20h1" stroke="#e01e5a" strokeWidth="5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "notion",
    name: "Notion",
    description: "Knowledge",
    color: "#909486",
    icon: (
      <svg viewBox="0 0 32 32" fill="none">
        <rect x="4" y="4" width="24" height="24" rx="4" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M9 23V9h3l9 14V9M8 9h7M18 9h6M7 23h7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "figma",
    name: "Figma",
    description: "Design files",
    color: "#c17f5f",
    icon: (
      <svg viewBox="0 0 32 32">
        <path d="M16 1h-5a5 5 0 0 0 0 10h5Z" fill="#f24e1e" />
        <path d="M16 1h5a5 5 0 0 1 0 10h-5Z" fill="#ff7262" />
        <path d="M16 11h-5a5 5 0 0 0 0 10h5Z" fill="#a259ff" />
        <circle cx="21" cy="16" r="5" fill="#1abcfe" />
        <path d="M16 21h-5a5 5 0 1 0 5 5Z" fill="#0acf83" />
      </svg>
    ),
  },
  {
    id: "github",
    name: "GitHub",
    description: "Code & pull requests",
    color: "#899776",
    icon: <GitBranch strokeWidth={1.8} />,
  },
  {
    id: "linear",
    name: "Linear",
    description: "Issues & projects",
    color: "#8b83d7",
    icon: (
      <svg viewBox="0 0 32 32" fill="currentColor">
        <path d="M5.3 7.5a13 13 0 0 1 19.2 19.2L5.3 7.5ZM3.4 10.5l18.1 18.1a13 13 0 0 1-4.4 1L2.4 14.9a13 13 0 0 1 1-4.4ZM2.5 19.3l10.2 10.2A13 13 0 0 1 2.5 19.3Z" />
      </svg>
    ),
  },
  {
    id: "drive",
    name: "Google Drive",
    description: "Documents & files",
    color: "#699f88",
    icon: (
      <svg viewBox="0 0 32 32">
        <path d="m11 3 6 10L8 28 2 18Z" fill="#0f9d58" />
        <path d="M11 3h11l9 15H20Z" fill="#fbbc04" />
        <path d="M2 18h29l-6 10H8Z" fill="#4285f4" />
      </svg>
    ),
  },
];

const contributions: Record<string, string> = {
  slack: "Conversations become context. Bring the decisions behind the work into Relay.",
  notion: "Give every project a memory. Keep your team's knowledge within reach.",
  figma: "Connect the thinking to the thing. Keep designs close to the work they shape.",
  github: "Follow the work as it ships. Connect pull requests to the bigger picture.",
  linear: "Turn plans into progress. Bring issues, milestones, and priorities together.",
  drive: "One place for the source material. Find the files behind every project.",
};

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
      <div className="integration-hub-demo-topline">
        <span>
          <Radio aria-hidden="true" /> THE CONNECTED WORKSPACE
        </span>
        <span>RELAY / 001</span>
      </div>
      <div className="integration-hub-demo-heading">
        <h3>Your tools. One shared brain.</h3>
        <p>Bring the context from your favorite tools into Relay.</p>
      </div>
      <IntegrationHub
        tools={tools}
        product={{ ...product, status: activeTool ? `From ${activeTool.name}` : product.status }}
        activeToolId={activeToolId}
        onToolSelect={(tool) => setActiveToolId((current) => (current === tool.id ? null : tool.id))}
        paused={paused}
      />
      <div className="integration-hub-demo-detail" aria-live="polite" aria-atomic="true">
        <span className="integration-hub-demo-detail-icon" aria-hidden="true">
          {activeTool ? activeTool.icon : <ArrowUpRight />}
        </span>
        <p>
          {activeTool
            ? contributions[activeTool.id]
            : "Less searching. More making. Your team's context, finally connected."}
        </p>
        {activeTool ? (
          <button type="button" onClick={() => setActiveToolId(null)} aria-label="Show all connections">
            <RotateCcw aria-hidden="true" />
          </button>
        ) : null}
      </div>
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
