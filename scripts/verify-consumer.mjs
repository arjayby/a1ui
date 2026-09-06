import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "@playwright/test";
import ts from "typescript";

const root = process.cwd();
const catalog = JSON.parse(await readFile("public/r/registry.json", "utf8"));
const project = JSON.parse(await readFile("package.json", "utf8"));
const directory = await mkdtemp(path.join(tmpdir(), "a1ui-consumer-"));
const keep = process.argv.includes("--keep");
let browser;
let app;

async function run(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: directory,
      stdio: "inherit",
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    });
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} ${args.join(" ")} exited ${code}`)),
    );
  });
}

// Serve the built artifacts, not source TSX. The CLI must resolve and install
// the same JSON a consumer would fetch from a deployed site.
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  if (!/^\/r\/[a-z0-9-]+\.json$/.test(pathname)) {
    response.writeHead(404).end();
    return;
  }
  try {
    response.setHeader("Content-Type", "application/json");
    response.end(await readFile(path.join(root, "public", pathname)));
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

try {
  console.log(`Verifying published registry in ${directory}`);
  await mkdir(path.join(directory, "src/app"), { recursive: true });
  await mkdir(path.join(directory, "src/examples"), { recursive: true });
  const dependencies = Object.fromEntries(
    ["next", "react", "react-dom"].map((name) => [name, project.dependencies[name]]),
  );
  const devDependencies = Object.fromEntries(
    [
      "typescript",
      "@types/node",
      "@types/react",
      "@types/react-dom",
      "tailwindcss",
      "@tailwindcss/postcss",
    ].map((name) => [name, project.devDependencies[name]]),
  );
  await writeFile(
    path.join(directory, "package.json"),
    JSON.stringify(
      {
        name: "a1ui-consumer-check",
        private: true,
        type: "module",
        packageManager: project.packageManager,
        dependencies,
        devDependencies,
      },
      null,
      2,
    ),
  );
  const config = JSON.parse(await readFile("components.json", "utf8"));
  config.registries = { "@a1ui": `${origin}/r/{name}.json` };
  await writeFile(path.join(directory, "components.json"), JSON.stringify(config));
  await writeFile(
    path.join(directory, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ES2017",
        lib: ["dom", "dom.iterable", "esnext"],
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "react-jsx",
        plugins: [{ name: "next" }],
        paths: { "@/*": ["./src/*"] },
      },
      include: ["**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
      exclude: ["node_modules"],
    }),
  );
  await writeFile(
    path.join(directory, "postcss.config.mjs"),
    'export default { plugins: { "@tailwindcss/postcss": {} } };\n',
  );
  await writeFile(
    path.join(directory, "src/app/globals.css"),
    `@import "tailwindcss";
:root { --background: #fff; --foreground: #171717; --card: #fff; --border: #d4d4d4; --muted-foreground: #737373; }
@theme inline { --color-background: var(--background); --color-foreground: var(--foreground); --color-border: var(--border); }
body { margin: 0; padding: 32px; background: var(--background); color: var(--foreground); }
`,
  );
  await writeFile(
    path.join(directory, "src/app/layout.tsx"),
    'import "./globals.css";\nexport default function Layout({children}: {children: React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }\n',
  );

  const examples = [];
  for (const item of catalog.items) {
    const built = JSON.parse(await readFile(`public/r/${item.name}.json`, "utf8"));
    const declared = new Set(
      (built.dependencies ?? []).map((dependency) => dependency.replace(/(.+)@[^@]+$/, "$1")),
    );
    // Installing the whole catalog must not mask an undeclared dependency in
    // an individual item. Check every shipped file, including bundled siblings.
    for (const file of built.files) {
      for (const imported of ts.preProcessFile(file.content, true, true).importedFiles) {
        const specifier = imported.fileName;
        if (specifier.startsWith(".")) continue;
        const dependency = specifier.startsWith("@")
          ? specifier.split("/").slice(0, 2).join("/")
          : specifier.split("/")[0];
        assert(
          dependency === "react" || dependency === "react-dom" || declared.has(dependency),
          `${item.name} has undeclared dependency ${dependency}`,
        );
      }
    }
    const guide = await readFile(`public/docs/components/${item.name}.md`, "utf8");
    const example = guide.match(/```tsx\n([\s\S]*?)```/)?.[1];
    assert(example, `${item.name} has no executable example`);
    const exportName = example.match(/export function (\w+)/)?.[1];
    assert(exportName, `${item.name} has no exported example`);
    await writeFile(path.join(directory, `src/examples/${item.name}.tsx`), example);
    examples.push({ name: item.name, exportName });
  }

  const props = {
    "crypto-wallet": "account={null} onConnect={() => {}}",
    "multichain-swap":
      'connected={false} quote={null} quoteStatus="idle" connectWallet={() => {}} requestQuote={() => {}} reviewSwap={() => {}}',
  };
  const imports = examples
    .map(
      ({ name, exportName }, index) =>
        `import { ${exportName} as Example${index} } from "@/examples/${name}";`,
    )
    .join("\n");
  const sections = examples
    .map(
      ({ name }, index) =>
        `<section data-component="${name}" style={{ marginBottom: 80 }}><h1>${name}</h1><div data-example><Example${index} ${props[name] ?? ""} /></div></section>`,
    )
    .join("\n");
  await writeFile(
    path.join(directory, "src/app/page.tsx"),
    `"use client";\n${imports}\nexport default function Page() { return <main>${sections}</main>; }\n`,
  );

  await run("pnpm", ["install", "--config.confirmModulesPurge=false"]);
  await run("pnpm", [
    "dlx",
    "shadcn@latest",
    "add",
    ...catalog.items.map((item) => `${origin}/r/${item.name}.json`),
    "--yes",
  ]);
  await run("pnpm", ["exec", "next", "build"]);

  // Reserve an ephemeral port, then release it for next start.
  const portServer = createServer();
  await new Promise((resolve) => portServer.listen(0, "127.0.0.1", resolve));
  const port = portServer.address().port;
  await new Promise((resolve) => portServer.close(resolve));
  app = spawn(
    process.execPath,
    [
      path.join(directory, "node_modules/next/dist/bin/next"),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    { cwd: directory, stdio: "inherit", env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } },
  );
  const appUrl = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (app.exitCode !== null) throw new Error("Consumer app exited before becoming ready");
    try {
      if ((await fetch(appUrl)).ok) {
        ready = true;
        break;
      }
    } catch {
      /* Wait for the server to bind. */
    }
    await delay(500);
  }
  assert(ready, "Consumer app did not become ready");
  browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(appUrl, { waitUntil: "networkidle" });
  for (const { name } of examples) {
    const rendered = page.locator(`[data-component="${name}"] [data-example]`);
    assert(await rendered.evaluate((element) => element.children.length > 0), `${name} did not render`);
  }
  await page.getByRole("combobox", { name: "Environment", exact: true }).click();
  await page.getByRole("option", { name: /Staging/ }).click();
  assert.match(await page.getByRole("combobox", { name: "Environment", exact: true }).innerText(), /Staging/);
  await page.getByRole("button", { name: "Randomize phrase" }).click();
  assert.deepEqual(errors, [], "Consumer browser emitted errors");
  console.log(
    `Verified ${catalog.items.length} installed components and their published examples in a clean Next.js production app.`,
  );
} finally {
  await browser?.close();
  if (app && app.exitCode === null) {
    app.kill("SIGTERM");
    await new Promise((resolve) => app.once("exit", resolve));
  }
  await new Promise((resolve) => server.close(resolve));
  if (keep) console.log(`Consumer fixture retained at ${directory}`);
  else await rm(directory, { recursive: true, force: true });
}
