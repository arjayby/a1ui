"use client";

import { clsx } from "clsx";
import { useId, type ComponentPropsWithoutRef, type CSSProperties, type ReactNode } from "react";

export interface IntegrationHubTool {
  id: string;
  name: string;
  description?: string;
  icon: ReactNode;
  color?: string;
}

export interface IntegrationHubProps extends Omit<
  ComponentPropsWithoutRef<"div">,
  "children" | "dangerouslySetInnerHTML" | "onSelect"
> {
  tools: readonly IntegrationHubTool[];
  product: { name: string; description?: string; icon: ReactNode; status?: string };
  activeToolId?: string | null;
  onToolSelect?: (tool: IntegrationHubTool) => void;
  paused?: boolean;
  duration?: number;
}

const styles = `
  [data-slot="integration-hub"] {
    --hub-surface: var(--integration-hub-surface, var(--background, #faf9f6));
    --hub-ink: var(--integration-hub-foreground, var(--foreground, #242522));
    --hub-line: var(--integration-hub-border, var(--border, #dedfd8));
    --hub-muted: var(--muted-foreground, #777970);
    position: relative;
    isolation: isolate;
    width: 100%;
    container-type: inline-size;
    color: var(--hub-ink);
    font-family: inherit;
  }
  [data-slot="integration-hub"] .a1ui-hub-stage {
    position: relative;
    height: clamp(320px, 54cqi, 440px);
  }
  [data-slot="integration-hub"] .a1ui-hub-connections {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
    pointer-events: none;
  }
  [data-slot="integration-hub"] .a1ui-hub-connection {
    transition: opacity 200ms ease;
  }
  [data-slot="integration-hub"] .a1ui-hub-connection[data-active="false"] {
    opacity: 0.16;
  }
  [data-slot="integration-hub"] .a1ui-hub-wire {
    stroke: var(--hub-line);
    stroke-width: 1.5;
  }
  [data-slot="integration-hub"] .a1ui-hub-pulse {
    stroke: var(--hub-tool-color);
    stroke-width: 2;
    stroke-dasharray: 14 100;
    animation: a1ui-hub-flow var(--hub-duration) linear infinite;
    animation-delay: var(--hub-delay);
    animation-play-state: var(--hub-play-state);
  }
  [data-slot="integration-hub"] .a1ui-hub-pulse-glow {
    stroke-width: 7;
    stroke-opacity: 0.25;
    filter: blur(2px);
  }
  [data-slot="integration-hub"] .a1ui-hub-orbit {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 32%;
    aspect-ratio: 1;
    transform: translate(-50%, -50%) rotate(45deg);
    border: 1px solid var(--hub-line);
    border-radius: 26%;
    opacity: 0.35;
    pointer-events: none;
  }
  [data-slot="integration-hub"] .a1ui-hub-orbit + .a1ui-hub-orbit {
    width: 39%;
    border-style: dashed;
    opacity: 0.22;
  }
  [data-slot="integration-hub"] .a1ui-hub-tools {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  [data-slot="integration-hub"] .a1ui-hub-tool {
    position: absolute;
    top: var(--hub-y);
    left: var(--hub-x);
    width: 24%;
    transform: translate(-50%, -50%);
  }
  [data-slot="integration-hub"] .a1ui-hub-card {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 78px;
    padding: 16px;
    border: 1px solid var(--hub-line);
    border-radius: 15px;
    background: var(--hub-surface);
    color: inherit;
    text-align: start;
    font: inherit;
    box-shadow: 0 2px 3px #00000003, 0 5px 16px #00000003;
    transition: border-color 180ms ease, box-shadow 180ms ease, opacity 180ms ease;
  }
  [data-slot="integration-hub"] button.a1ui-hub-card {
    cursor: pointer;
  }
  [data-slot="integration-hub"] button.a1ui-hub-card:hover,
  [data-slot="integration-hub"] .a1ui-hub-card[aria-pressed="true"] {
    border-color: var(--hub-tool-color);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--hub-tool-color) 9%, transparent), 0 5px 18px #00000005;
  }
  [data-slot="integration-hub"] button.a1ui-hub-card:focus-visible {
    outline: 2px solid var(--hub-tool-color);
    outline-offset: 4px;
  }
  [data-slot="integration-hub"] .a1ui-hub-tool[data-active="false"] .a1ui-hub-card {
    opacity: 0.45;
  }
  [data-slot="integration-hub"] .a1ui-hub-icon {
    display: grid;
    width: 36px;
    height: 36px;
    flex: none;
    place-items: center;
    color: var(--hub-tool-color);
  }
  [data-slot="integration-hub"] .a1ui-hub-icon svg {
    width: 28px;
    height: 28px;
  }
  [data-slot="integration-hub"] .a1ui-hub-copy {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 5px;
  }
  [data-slot="integration-hub"] .a1ui-hub-name {
    font-size: 14px;
    line-height: 1.25;
    font-weight: 600;
    letter-spacing: -0.02em;
    overflow-wrap: anywhere;
  }
  [data-slot="integration-hub"] .a1ui-hub-description {
    color: var(--hub-muted);
    font-size: 10px;
    line-height: 1.4;
  }
  [data-slot="integration-hub"] .a1ui-hub-port {
    position: absolute;
    top: 50%;
    right: -4px;
    width: 6px;
    height: 6px;
    border: 1px solid var(--hub-tool-color);
    border-radius: 50%;
    background: var(--hub-surface);
    transform: translateY(-50%);
  }
  [data-slot="integration-hub"] [data-side="right"] .a1ui-hub-port {
    right: auto;
    left: -4px;
  }
  [data-slot="integration-hub"] .a1ui-hub-product {
    position: absolute;
    left: 50%;
    top: 50%;
    display: flex;
    width: 22%;
    min-height: 156px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 20px 8px 16px;
    transform: translate(-50%, -50%);
    border: 1px solid #41463a;
    border-radius: 23px;
    background: var(--integration-hub-product-background, #252b24);
    color: var(--integration-hub-product-foreground, #f6f8ed);
    box-shadow: 0 0 0 6px color-mix(in srgb, var(--hub-surface) 80%, transparent), 0 12px 26px #18200c21, inset 0 1px 0 #ffffff18;
    text-align: center;
  }
  [data-slot="integration-hub"] .a1ui-hub-product-icon {
    display: grid;
    width: 40px;
    height: 40px;
    place-items: center;
    color: var(--integration-hub-accent, #d5f893);
  }
  [data-slot="integration-hub"] .a1ui-hub-product-icon svg {
    width: 100%;
    height: 100%;
  }
  [data-slot="integration-hub"] .a1ui-hub-product-name {
    font-size: 25px;
    line-height: 1;
    font-weight: 550;
    letter-spacing: -0.06em;
    overflow-wrap: anywhere;
    max-width: 100%;
  }
  [data-slot="integration-hub"] .a1ui-hub-product-description {
    opacity: 0.65;
    font-size: 10px;
    line-height: 1.4;
  }
  [data-slot="integration-hub"] .a1ui-hub-product-status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    margin-top: 3px;
    font-size: 8px;
    line-height: 1.4;
    color: var(--integration-hub-accent, #d5f893);
  }
  [data-slot="integration-hub"] .a1ui-hub-product-status::before {
    width: 4px;
    height: 4px;
    flex: none;
    border-radius: 50%;
    background: currentColor;
    content: "";
  }
  @keyframes a1ui-hub-flow {
    0% { stroke-dashoffset: 14; opacity: 0; }
    8% { opacity: 1; }
    76% { opacity: 1; }
    90%, 100% { stroke-dashoffset: -100; opacity: 0; }
  }
  @container (max-width: 580px) {
    [data-slot="integration-hub"] .a1ui-hub-card {
      min-height: 86px;
      flex-direction: column;
      justify-content: center;
      gap: 7px;
      padding: 12px 5px;
      border-radius: 12px;
      text-align: center;
    }
    [data-slot="integration-hub"] .a1ui-hub-copy { gap: 0; }
    [data-slot="integration-hub"] .a1ui-hub-name { font-size: 11px; }
    [data-slot="integration-hub"] .a1ui-hub-description { display: none; }
    [data-slot="integration-hub"] .a1ui-hub-icon { width: 28px; height: 28px; }
    [data-slot="integration-hub"] .a1ui-hub-icon svg { width: 24px; height: 24px; }
    [data-slot="integration-hub"] .a1ui-hub-product {
      min-height: 130px;
      gap: 9px;
      padding: 14px 5px;
      border-radius: 16px;
    }
    [data-slot="integration-hub"] .a1ui-hub-product-icon { width: 30px; height: 30px; }
    [data-slot="integration-hub"] .a1ui-hub-product-name { font-size: 20px; }
    [data-slot="integration-hub"] .a1ui-hub-product-description { font-size: 8px; }
    [data-slot="integration-hub"] .a1ui-hub-product-status { font-size: 7px; }
  }
  @media (prefers-reduced-motion: reduce) {
    [data-slot="integration-hub"] .a1ui-hub-pulse { animation: none; opacity: 0; }
    [data-slot="integration-hub"] .a1ui-hub-card,
    [data-slot="integration-hub"] .a1ui-hub-connection { transition: none; }
  }
`;

export function IntegrationHub({
  tools,
  product,
  activeToolId = null,
  onToolSelect,
  paused = false,
  duration = 4,
  className,
  style,
  ...props
}: IntegrationHubProps) {
  const id = useId();
  const visibleTools = tools.slice(0, 6);
  const split = Math.ceil(visibleTools.length / 2);
  const selected = visibleTools.some((tool) => tool.id === activeToolId);
  const safeDuration = Number.isFinite(duration) ? Math.max(1, duration) : 4;
  const positionedTools = visibleTools.map((tool, index) => {
    const right = index >= split;
    const count = right ? visibleTools.length - split : split;
    const row = right ? index - split : index;
    const y = count === 1 ? 250 : 100 + (row * 300) / (count - 1);
    const start = right ? 740 : 260;
    const end = right ? 610 : 390;
    const bend = right ? 680 : 320;
    return {
      ...tool,
      right,
      y,
      path: `M ${start} ${y} C ${bend} ${y}, ${bend} 250, ${end} 250`,
      active: !selected || tool.id === activeToolId,
      variables: {
        "--hub-tool-color": tool.color ?? "var(--hub-ink)",
        "--hub-delay": `${-index * (safeDuration / 6) - 0.4}s`,
      } as CSSProperties,
    };
  });

  return (
    <div
      role="group"
      aria-label={`Tools connected to ${product.name}`}
      {...props}
      data-slot="integration-hub"
      className={clsx("isolate", className)}
      style={
        {
          "--hub-duration": `${safeDuration}s`,
          "--hub-play-state": paused ? "paused" : "running",
          ...style,
        } as CSSProperties
      }
    >
      <style>{styles}</style>
      <div className="a1ui-hub-stage">
        <div className="a1ui-hub-orbit" aria-hidden="true" />
        <div className="a1ui-hub-orbit" aria-hidden="true" />
        <svg
          className="a1ui-hub-connections"
          viewBox="0 0 1000 500"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden="true"
        >
          {positionedTools.map((tool) => (
            <g key={tool.id} className="a1ui-hub-connection" data-active={tool.active} style={tool.variables}>
              <path d={tool.path} className="a1ui-hub-wire" vectorEffect="non-scaling-stroke" />
              <path
                d={tool.path}
                pathLength="100"
                className="a1ui-hub-pulse a1ui-hub-pulse-glow"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={tool.path}
                pathLength="100"
                className="a1ui-hub-pulse"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}
        </svg>
        <ul className="a1ui-hub-tools" aria-label="Connected tools">
          {positionedTools.map((tool, index) => {
            const contents = (
              <>
                <span className="a1ui-hub-icon" aria-hidden="true">
                  {tool.icon}
                </span>
                <span className="a1ui-hub-copy">
                  <span className="a1ui-hub-name">{tool.name}</span>
                  {tool.description ? (
                    <span id={`${id}-tool-${index}`} className="a1ui-hub-description">
                      {tool.description}
                    </span>
                  ) : null}
                </span>
                <span className="a1ui-hub-port" aria-hidden="true" />
              </>
            );
            return (
              <li
                key={tool.id}
                className="a1ui-hub-tool"
                data-side={tool.right ? "right" : "left"}
                data-active={tool.active}
                style={
                  {
                    ...tool.variables,
                    "--hub-x": tool.right ? "86%" : "14%",
                    "--hub-y": `${tool.y / 5}%`,
                  } as CSSProperties
                }
              >
                {onToolSelect ? (
                  <button
                    type="button"
                    className="a1ui-hub-card"
                    aria-label={tool.name}
                    aria-describedby={tool.description ? `${id}-tool-${index}` : undefined}
                    aria-pressed={tool.id === activeToolId}
                    onClick={() => onToolSelect(tool)}
                  >
                    {contents}
                  </button>
                ) : (
                  <div className="a1ui-hub-card">{contents}</div>
                )}
              </li>
            );
          })}
        </ul>
        <div className="a1ui-hub-product">
          <span className="a1ui-hub-product-icon" aria-hidden="true">
            {product.icon}
          </span>
          <span className="a1ui-hub-product-name">{product.name}</span>
          {product.description ? (
            <span className="a1ui-hub-product-description">{product.description}</span>
          ) : null}
          {product.status ? <span className="a1ui-hub-product-status">{product.status}</span> : null}
        </div>
      </div>
    </div>
  );
}
