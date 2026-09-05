# a1ui

Original React components built to be copied, changed, and shipped.

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
```

The components install into `src/components/ui` and use React, TypeScript, and Tailwind CSS v4.

## Development

```bash
pnpm install
pnpm dev
```

The site uses `http://localhost:3000` in shadcn installation commands by default. Set `NEXT_PUBLIC_SITE_URL` when the docs move to another origin.

## Registry

Validate and build the shadcn registry before shipping changes:

```bash
pnpm registry:validate
pnpm registry:build
```

Built registry items are served from `/r`.

## Checks

```bash
pnpm test
pnpm test:e2e
pnpm typecheck
pnpm lint
pnpm build
```

## License

The project source is MIT licensed. Commit Mono is distributed under SIL Open Font License 1.1. See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
