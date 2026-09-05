# a1ui

Original React components built to be copied, changed, and shipped.

## Add a component

With the documentation site running locally:

```bash
pnpm dlx shadcn@latest add http://localhost:3000/r/section-rail.json
pnpm dlx shadcn@latest add http://localhost:3000/r/spiral-text.json
```

The components install into `src/components/ui` and use React, TypeScript, and Tailwind CSS v4.

## AI chat components

| Component            | Documentation                                                                     | Registry item                  |
| -------------------- | --------------------------------------------------------------------------------- | ------------------------------ |
| Conversation history | [Usage and persistence example](content/docs/components/conversation-history.mdx) | `/r/conversation-history.json` |
| Attachments          | [Usage and upload callbacks](content/docs/components/attachments.mdx)             | `/r/attachments.json`          |
| Message actions      | [Usage and response callbacks](content/docs/components/message-actions.mdx)       | `/r/message-actions.json`      |
| Plan viewer          | [Usage and revision handling](content/docs/components/plan-viewer.mdx)            | `/r/plan-viewer.json`          |
| Action approval      | [Usage and decision handling](content/docs/components/action-approval.mdx)        | `/r/action-approval.json`      |
| Artifact viewer      | [Usage, rendering and downloads](content/docs/components/artifact-viewer.mdx)     | `/r/artifact-viewer.json`      |

Each installs through the shadcn CLI, for example `pnpm dlx shadcn@latest add http://localhost:3000/r/artifact-viewer.json`. The docs include integration notes for [shadcn-ui/chatbot-template](https://github.com/shadcn-ui/chatbot-template/tree/f79416827acd90244683903a34343f58193432ac).

These are client UI components. The demos use browser storage, local files, and explicitly labeled simulations. Supply your own persistence, upload and tool callbacks. No AI provider or backend is included.

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

For isolated worktrees, use `PLAYWRIGHT_PORT=3106 pnpm test:e2e` to avoid reusing another app on port 3000.

## License

The project source is MIT licensed. Commit Mono is distributed under SIL Open Font License 1.1. See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
