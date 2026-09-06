import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import nextEnv from "@next/env";

import { getSiteUrl } from "../src/lib/site-url.mjs";
import { renderAgentIndex, renderComponentGuide } from "./lib/agent-docs.mjs";

nextEnv.loadEnvConfig(process.cwd(), !process.argv.includes("--production"));
const siteUrl = getSiteUrl();
const registry = JSON.parse(await readFile("registry.json", "utf8"));
const names = new Set();
const guides = await Promise.all(
  registry.items.map(async (item) => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.name) || names.has(item.name))
      throw new Error(`Invalid or duplicate registry name: ${item.name}`);
    names.add(item.name);
    for (const key of ["useCases", "limitations", "requirements"]) {
      if (!item.meta?.a1ui?.[key]?.length) throw new Error(`${item.name} needs meta.a1ui.${key}`);
    }
    if (!item.categories?.length) throw new Error(`${item.name} needs categories`);
    const mdx = await readFile(`content/docs/components/${item.name}.mdx`, "utf8");
    return { name: item.name, content: renderComponentGuide(item, mdx, siteUrl) };
  }),
);

const build = spawnSync("pnpm", ["dlx", "shadcn@latest", "build", "registry.json", "--output", "public/r"], {
  stdio: "inherit",
});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);

registry.homepage = siteUrl;
await mkdir("public/docs/components", { recursive: true });
for (const item of registry.items) {
  const guideUrl = `${siteUrl}/docs/components/${item.name}.md`;
  item.docs = `Read ${guideUrl} for usage, required props, and integration instructions.`;
  item.meta.a1ui.docsUrl = guideUrl;
  item.meta.a1ui.registryUrl = `${siteUrl}/r/${item.name}.json`;
  const file = `public/r/${item.name}.json`;
  const built = JSON.parse(await readFile(file, "utf8"));
  await writeFile(file, JSON.stringify({ ...built, docs: item.docs, meta: item.meta }, null, 2) + "\n");
}
await Promise.all([
  writeFile("public/r/registry.json", JSON.stringify(registry, null, 2) + "\n"),
  writeFile("public/llms.txt", renderAgentIndex(registry, siteUrl)),
  ...guides.map(({ name, content }) => writeFile(`public/docs/components/${name}.md`, content)),
]);
console.log(`Built ${guides.length} registry items and agent guides for ${siteUrl}`);
