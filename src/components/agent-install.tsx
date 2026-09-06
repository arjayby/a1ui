import { CopyAgentPrompt } from "@/components/copy-agent-prompt";
import { getSiteUrl } from "@/lib/site-url.mjs";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";

export function AgentRegistryConfiguration() {
  return (
    <DynamicCodeBlock
      lang="json"
      code={JSON.stringify({ registries: { "@a1ui": `${getSiteUrl()}/r/{name}.json` } }, null, 2)}
    />
  );
}

export function AgentInstall({ name }: { name?: string }) {
  const siteUrl = getSiteUrl();
  const prompt = [
    `Read ${siteUrl}/llms.txt and follow its setup and verification instructions.`,
    name
      ? `Install and integrate the a1ui ${name} component. Read ${siteUrl}/docs/components/${name}.md first.`
      : "Choose and install the a1ui component best suited for this request: [describe what you want].",
    "Adapt it to this project's framework, package manager, aliases, styles, and data. Preserve existing changes and verify that the result builds and works in the browser.",
  ].join("\n\n");

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <CopyAgentPrompt key={prompt} prompt={prompt} />
      <a
        href={name ? `/docs/components/${name}.md` : "/llms.txt"}
        className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-4"
      >
        Read agent guide
      </a>
    </div>
  );
}
