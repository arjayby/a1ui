export function installCommands(url) {
  return [
    `npm: npx shadcn@latest add ${url} --yes`,
    `pnpm: pnpm dlx shadcn@latest add ${url} --yes`,
    `yarn: yarn dlx shadcn@latest add ${url} --yes`,
    `bun: bunx --bun shadcn@latest add ${url} --yes`,
  ].join("\n");
}

// Convert only the docs components this project uses. Unknown MDX fails the
// build so a new wrapper cannot silently hide instructions from agent readers.
export function renderComponentGuide(item, mdx, siteUrl) {
  const registryUrl = `${siteUrl}/r/${item.name}.json`;
  const pageUrl = `${siteUrl}/components/${item.name}`;
  const body = mdx.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  let fence = null;
  let installations = 0;
  let examples = 0;
  const lines = body.split(/\r?\n/).map((line) => {
    const marker = line.trim().match(/^(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim())
        fence = null;
      return line;
    }
    if (marker) {
      fence = marker[1];
      if (marker[2].trim() === "tsx") examples++;
      return line;
    }
    if (/^\s*<Installation name="([\w-]+)"\s*\/>\s*$/.test(line)) {
      if (!line.includes(`name="${item.name}"`)) throw new Error(`Wrong installation item in ${item.name}`);
      installations++;
      return `Choose the command for the target project's package manager. Run it from that project's directory.\n\n\`\`\`text\n${installCommands(registryUrl)}\n\`\`\``;
    }
    if (/^\s*<ComponentSource name="([\w-]+)"\s*\/>\s*$/.test(line)) {
      return `[Complete source and dependencies](${registryUrl}). Each file's content is embedded in the registry JSON.`;
    }
    if (/^\s*<\w+Demo\s*\/>\s*$/.test(line)) return `[Interactive preview](${pageUrl})`;
    if (/^\s*<Tabs items=\{.*\}>\s*$/.test(line) || /^\s*<\/(Tab|Tabs)>\s*$/.test(line)) return "";
    const tab = line.match(/^\s*<Tab value="(Usage|Source)">\s*$/);
    if (tab) return `### ${tab[1]}`;
    if (/<\/?[A-Z][\w.]*(?:\s|>|\/)/.test(line)) throw new Error(`Unresolved MDX in ${item.name}: ${line}`);
    return line.replace(/\]\(\/(?!\/)([^)]+)\)/g, (_, path) => `](${siteUrl}/${path})`);
  });
  if (fence || installations !== 1 || !examples) throw new Error(`Incomplete agent guide for ${item.name}`);
  const advice = item.meta.a1ui;
  return (
    [
      `# ${item.title}`,
      item.description,
      `See [agent setup instructions](${siteUrl}/llms.txt) before installation. Supported baseline: React 19, TypeScript, Tailwind CSS 4. Components use client-side React and browser APIs.`,
      "## When to use",
      advice.useCases.map((text) => `- ${text}`).join("\n"),
      "## Limitations",
      advice.limitations.map((text) => `- ${text}`).join("\n"),
      "## Integration requirements",
      advice.requirements.map((text) => `- ${text}`).join("\n"),
      "Import paths in examples assume the default @/components/ui alias. Adapt them to the target project's components.json. Put examples with state or callbacks in a client component when using React Server Components.",
      lines.join("\n").trim(),
      "## Verification",
      "Run the target project's typecheck and build. Render the integrated component and check the browser for missing styles, hydration errors, and failed assets. Exercise its keyboard controls and primary interaction. Report any app data or callbacks still needed; sample data is not a live integration.",
    ].join("\n\n") + "\n"
  );
}

export function renderAgentIndex(registry, siteUrl) {
  return `# a1ui

> Original React components installed as editable source through the shadcn CLI.

## Supported projects

The supported baseline is React 19, TypeScript, and Tailwind CSS 4. Installation and the published examples are verified in a clean Next.js App Router project. Vite and other React frameworks may work but are not covered by that verification. Check their configuration before proceeding. These are client components; retain their "use client" directives. Parent components with state or callback props also need a client boundary in a React Server Components app.

## Choose and install

1. Inspect the user's request, package.json, lockfile, components.json, import aliases, and global CSS in the target project. Work in the app or workspace that owns components.json. Do not silently change frameworks or upgrade an incompatible project.
2. Read the [registry catalog](${siteUrl}/r/registry.json). Match descriptions, categories, and meta.a1ui.useCases to the request. Check meta.a1ui.limitations and requirements. If nothing fits, explain the gap instead of installing an unrelated component.
3. Read the chosen component's Markdown guide below. It includes actual imports, props, examples, dependencies, and integration requirements. Read the registry item's embedded source when needed.
4. If components.json is missing in an otherwise compatible project, initialize shadcn using the project's package runner and the existing framework and theme. Inspect \`shadcn init --help\` for current options. Preserve existing styles. Do not force initialization over an existing configuration.
5. Inspect any existing destination files. Use \`shadcn add <item-url> --dry-run\` and \`--diff\` before updating them. Reuse existing compatible components or merge deliberately. Never use \`--overwrite\` automatically. In particular, multichain-swap also installs select-menu.tsx.
6. Install from the selected item's URL using the target project's package manager. Replace NAME with the exact catalog name:

\`\`\`text
${installCommands(`${siteUrl}/r/NAME.json`)}
\`\`\`

7. Adapt the documented example to the requested page. Use the target project's actual import aliases, state, data, and callbacks. Keep accessible labels and reduced-motion behavior. Preserve the app's theme; check the guide for CSS tokens or font requirements. Demo artwork is not included. Wallet and swap components require the app's own integrations.
8. Run the project's typecheck, lint, and build scripts where available. Render the result, check browser errors and styling, and exercise the primary interaction. Report the selected component, changed files, checks, and any missing integration data.

## Components

${[...registry.items]
  .sort((a, b) => a.title.localeCompare(b.title))
  .map(
    (item) =>
      `- [${item.title}](${siteUrl}/docs/components/${item.name}.md): ${item.description} ${item.meta.a1ui.useCases.join(" ")}`,
  )
  .join("\n")}

## Optional shadcn MCP setup

Direct URL installation works without MCP. For agents that already use the shadcn MCP server, merge this entry into the target project's components.json registries object, preserving existing entries:

\`\`\`json
{
  "registries": {
    "@a1ui": "${siteUrl}/r/{name}.json"
  }
}
\`\`\`

The [registry index](${siteUrl}/r/registry.json) supports shadcn discovery. With this configuration, use \`shadcn search @a1ui -q "dropdown"\`, \`shadcn view @a1ui/select-menu\`, or \`shadcn add @a1ui/select-menu --yes\` through the project's package runner. See the [shadcn MCP setup guide](https://ui.shadcn.com/docs/registry/mcp) for client configuration.
`;
}
