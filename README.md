# a1ui

Editable React components and blocks inspired by designs found online. The site has previews, documentation, and a shadcn registry. The current catalog is in Blocks; Components is reserved for reusable UI components.

Blocks use React 19, TypeScript, and Tailwind CSS 4.

## Run locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Add a block

With the site running, install a block from its registry URL:

```bash
pnpm dlx shadcn@latest add http://localhost:3000/r/section-rail.json
```

Replace `section-rail` with the name of any block in the catalog. The source is added to `src/components/blocks` in your project, where you can edit it.

To install with a coding agent, use **Copy prompt for agent** on the site. You can also point the agent to [http://localhost:3000/llms.txt](http://localhost:3000/llms.txt) for setup and installation instructions. A remote agent needs the site's public URL instead of `localhost`.

## Work on the registry

Edit block source in `src/registry/blocks`, metadata in `registry.json` and documentation in `content/docs/blocks/<name>.mdx`. Do not edit generated files in `public/r`, `public/docs/blocks`, or `public/llms.txt`.

```bash
pnpm registry:validate
pnpm registry:build
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

`pnpm dev` and `pnpm build` generate the registry and agent guides. Run `pnpm registry:build` after changing registry content while the dev server is running. Use `pnpm test:e2e` for browser tests and `pnpm test:consumer` to verify installation in a separate Next.js app.

Before deploying, set `NEXT_PUBLIC_SITE_URL` to the site's public origin and run `pnpm build`. This sets the public URLs used in install commands, copied prompts, and registry metadata.

## License

The project source is MIT licensed. Commit Mono uses the SIL Open Font License 1.1. See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
