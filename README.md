# a1ui

Original React components built to be copied, changed, and shipped.

## Install with an agent

The catalog and each component page have a **Copy prompt for agent** button. Paste
the prompt into a coding agent with terminal and web access. The catalog prompt
lets the agent choose a component for your request; component pages select that
component directly. If clipboard access is blocked, a selectable prompt appears.

With the site running locally, give your agent:

```text
Read http://localhost:3000/llms.txt and follow its setup instructions.
Choose and install the a1ui component best suited for: [describe what you want].
Integrate it into this project and verify the build and browser behavior.
```

The agent must be able to reach that URL. For remote agents, use the deployed
site's public origin instead of localhost. The supported baseline is React 19,
TypeScript, and Tailwind CSS 4. Installation adds editable source with the shadcn
CLI; integration still requires the target app's data and callbacks.

- `/llms.txt` provides discovery, setup, installation, and verification instructions.
- `/r/registry.json` is the shared shadcn and agent catalog.
- `/r/<name>.json` contains installable source and dependencies.
- `/docs/components/<name>.md` provides plain Markdown examples, props, and limitations.

The agent guide also documents optional `@a1ui` registry configuration for the
existing shadcn MCP server. A custom MCP server is not required.

## Add a component

With the documentation site running locally:

```bash
pnpm dlx shadcn@latest add http://localhost:3000/r/section-rail.json
pnpm dlx shadcn@latest add http://localhost:3000/r/spiral-text.json
pnpm dlx shadcn@latest add http://localhost:3000/r/arc-reel.json
pnpm dlx shadcn@latest add http://localhost:3000/r/crypto-wallet.json
pnpm dlx shadcn@latest add http://localhost:3000/r/multichain-swap.json
pnpm dlx shadcn@latest add http://localhost:3000/r/select-menu.json
pnpm dlx shadcn@latest add http://localhost:3000/r/text-scramble.json
pnpm dlx shadcn@latest add http://localhost:3000/r/shape-flow.json
```

The components install into `src/components/ui` and use React, TypeScript, and Tailwind CSS v4.

## Development

```bash
pnpm install
pnpm dev
```

The site uses `http://localhost:3000` by default. Before deploying, set
`NEXT_PUBLIC_SITE_URL` to the public origin, such as `https://ui.example.com`,
and run `pnpm build`. This updates install commands, copied prompts, registry
homepage and metadata, and all agent documentation together. Standard Next.js
`.env` files are supported, including `.env.local` and `.env.production`.

## Registry

Validate and build the shadcn registry before shipping changes:

```bash
pnpm registry:validate
pnpm registry:build
```

Built registry items are served from `/r`.

`pnpm dev` and `pnpm build` regenerate the registry and agent guides before
starting Next.js. While the dev server is running, run `pnpm registry:build`
after changing registry source or documentation to refresh the published files.

Maintain names, descriptions, dependencies, categories, and `meta.a1ui` selection
advice in `registry.json`. The website catalog reads those same definitions.
Maintain examples and API documentation in `content/docs/components/<name>.mdx`.
The generator expands installation instructions, preserves fenced code exactly,
and replaces preview and source widgets with links. Unknown MDX widgets fail
generation so instructions cannot silently disappear. Do not edit generated
`public/r`, `public/docs/components`, or `public/llms.txt` files by hand.

## Checks

```bash
pnpm test
pnpm test:e2e
pnpm typecheck
pnpm lint
pnpm build
pnpm test:consumer
```

`pnpm test:consumer` installs the published registry in a temporary Next.js app,
checks each item's declared dependencies, compiles the generated guides' actual
examples, builds for production, and checks rendering and interactions in Chromium.
It requires network access and a Playwright browser, installed with
`pnpm exec playwright install chromium`. The temporary app is removed afterward;
use `node scripts/verify-consumer.mjs --keep` to retain it for debugging.

## License

The project source is MIT licensed. Commit Mono is distributed under SIL Open Font License 1.1. See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
