import { CopyAgentPrompt } from "@/components/copy-agent-prompt";
import { getSiteUrl } from "@/lib/site-url.mjs";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import registry from "../../registry.json";

export function AgentRegistryConfiguration() {
  return (
    <DynamicCodeBlock
      lang="json"
      code={JSON.stringify({ registries: { "@a1ui": `${getSiteUrl()}/r/{name}.json` } }, null, 2)}
    />
  );
}

/**
 * `kind` picks what the discovery prompt (no `name`) asks the agent to choose from. A
 * named prompt reads the item's own type from the registry instead.
 */
export function AgentInstall({ name, kind = "block" }: { name?: string; kind?: "block" | "component" }) {
  const siteUrl = getSiteUrl();
  const component = registry.items.find((item) => item.name === name)?.type === "registry:component";
  const prompt = [
    `Read ${siteUrl}/llms.txt and follow its setup and verification instructions.`,
    name
      ? `Install and integrate the a1ui ${name} ${component ? "component" : "block"}. Read ${siteUrl}/docs/${component ? "components" : "blocks"}/${name}.md first.`
      : `Choose and install the a1ui ${kind} best suited for this request: [describe what you want].`,
    "Adapt it to this project's framework, package manager, aliases, styles, and data. Preserve existing changes and verify that the result builds and works in the browser.",
  ].join("\n\n");

  return (
    <div className="not-prose mt-5 flex flex-wrap items-center gap-3">
      <CopyAgentPrompt key={prompt} prompt={prompt} />
    </div>
  );
}
